const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { authRequired, optionalAuth } = require('../middleware/auth');
const { checkUserSolution, normalize } = require('../utils/sudoku');
const { calcPoints, rankForPoints } = require('../utils/ranks');
const { checkAfterSolve } = require('../utils/achievements');
const { broadcast } = require('../ws');

const router = express.Router();

const submitLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

function today() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizePuzzle(row) {
  if (!row) return row;
  const { solution, ...rest } = row;
  return rest;
}

router.get('/today', optionalAuth, async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM puzzles
     WHERE kind='daily' AND active_from <= CURRENT_DATE AND active_to >= CURRENT_DATE
     ORDER BY id DESC LIMIT 1`
  );
  if (!rows[0]) return res.status(404).json({ error: 'Нет активного судоку' });
  res.json(sanitizePuzzle(rows[0]));
});

router.get('/weekly', optionalAuth, async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM puzzles
     WHERE kind='weekly' AND active_from <= CURRENT_DATE AND active_to >= CURRENT_DATE
     ORDER BY id DESC LIMIT 1`
  );
  if (!rows[0]) return res.status(404).json({ error: 'Нет активного недельного судоку' });
  res.json(sanitizePuzzle(rows[0]));
});

router.get('/', optionalAuth, async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, title, difficulty, kind, base_points, active_from, active_to, created_at
     FROM puzzles ORDER BY created_at DESC LIMIT 50`
  );
  res.json(rows);
});

router.get('/:id', optionalAuth, async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM puzzles WHERE id=$1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Не найдено' });
  res.json(sanitizePuzzle(rows[0]));
});

// Старт попытки. Сервер запоминает started_at — клиентский таймер не влияет на подсчёт.
router.post('/:id/start', authRequired, async (req, res) => {
  const puzzle = await db.query(`SELECT id FROM puzzles WHERE id=$1`, [req.params.id]);
  if (!puzzle.rows[0]) return res.status(404).json({ error: 'Не найдено' });

  const existing = await db.query(
    `SELECT * FROM attempts WHERE user_id=$1 AND puzzle_id=$2`,
    [req.user.id, req.params.id]
  );
  if (existing.rows[0]) {
    if (existing.rows[0].is_solved) return res.status(400).json({ error: 'Уже решено' });
    return res.json({ started_at: existing.rows[0].started_at, resumed: true });
  }

  const { rows } = await db.query(
    `INSERT INTO attempts (user_id, puzzle_id) VALUES ($1,$2)
     RETURNING started_at`,
    [req.user.id, req.params.id]
  );
  res.json({ started_at: rows[0].started_at, resumed: false });
});

// Отправка решения.
router.post('/:id/submit', authRequired, submitLimiter, async (req, res) => {
  const userSolution = normalize(req.body?.solution);
  if (!userSolution) return res.status(400).json({ error: 'Некорректный формат решения' });

  const puzzleRes = await db.query(`SELECT * FROM puzzles WHERE id=$1`, [req.params.id]);
  const puzzle = puzzleRes.rows[0];
  if (!puzzle) return res.status(404).json({ error: 'Не найдено' });

  const attemptRes = await db.query(
    `SELECT * FROM attempts WHERE user_id=$1 AND puzzle_id=$2`,
    [req.user.id, req.params.id]
  );
  let attempt = attemptRes.rows[0];
  if (!attempt) {
    // авто-старт чтобы фиксировать время
    const ins = await db.query(
      `INSERT INTO attempts (user_id, puzzle_id) VALUES ($1,$2) RETURNING *`,
      [req.user.id, req.params.id]
    );
    attempt = ins.rows[0];
  }
  if (attempt.is_solved) return res.status(400).json({ error: 'Уже решено' });

  // Серверный duration
  const now = new Date();
  const started = new Date(attempt.started_at);
  const durationSeconds = Math.max(1, Math.round((now - started) / 1000));

  // Защита от читов: слишком быстро
  if (durationSeconds < puzzle.min_seconds) {
    return res.status(400).json({
      error: 'Слишком быстрое решение отклонено системой анти-чита',
      minSeconds: puzzle.min_seconds,
      durationSeconds,
    });
  }

  const check = checkUserSolution({
    puzzle: puzzle.puzzle,
    correctSolution: puzzle.solution,
    userSolution,
  });
  if (!check.ok) {
    return res.status(200).json({ ok: false, reason: check.reason, durationSeconds });
  }

  const points = calcPoints({
    basePoints: puzzle.base_points,
    difficulty: puzzle.difficulty,
    durationSeconds,
    minSeconds: puzzle.min_seconds,
  });

  await db.query(
    `UPDATE attempts
       SET finished_at=$1, duration_seconds=$2, is_solved=TRUE, points_awarded=$3
     WHERE id=$4`,
    [now, durationSeconds, points, attempt.id]
  );

  const updUser = await db.query(
    `UPDATE users
        SET total_points = total_points + $1,
            total_solved = total_solved + 1,
            best_time = LEAST(COALESCE(best_time, $2), $2)
      WHERE id=$3
      RETURNING total_points, total_solved, best_time`,
    [points, durationSeconds, req.user.id]
  );

  const totalPoints = updUser.rows[0].total_points;
  const totalSolved = updUser.rows[0].total_solved;
  const newRank = rankForPoints(totalPoints);
  await db.query(`UPDATE users SET rank=$1 WHERE id=$2`, [newRank, req.user.id]);

  // ежедневные задания — прогресс
  const day = today();
  await db.query(
    `UPDATE daily_tasks
        SET progress = LEAST(progress + 1, target),
            is_completed = (progress + 1) >= target
      WHERE user_id=$1 AND day=$2 AND code='solve_any'`,
    [req.user.id, day]
  );
  if (puzzle.difficulty === 'hard' || puzzle.difficulty === 'expert') {
    await db.query(
      `UPDATE daily_tasks
          SET progress = LEAST(progress + 1, target),
              is_completed = (progress + 1) >= target
        WHERE user_id=$1 AND day=$2 AND code='solve_hard'`,
      [req.user.id, day]
    );
  }
  // награды за выполненные задания
  const completed = await db.query(
    `SELECT id, reward_points FROM daily_tasks
      WHERE user_id=$1 AND day=$2 AND is_completed=TRUE AND reward_points > 0`,
    [req.user.id, day]
  );
  let bonus = 0;
  for (const t of completed.rows) {
    bonus += t.reward_points;
    await db.query(`UPDATE daily_tasks SET reward_points=0 WHERE id=$1`, [t.id]);
  }
  if (bonus > 0) {
    await db.query(`UPDATE users SET total_points = total_points + $1 WHERE id=$2`, [bonus, req.user.id]);
  }

  const granted = await checkAfterSolve(req.user.id, {
    durationSeconds,
    difficulty: puzzle.difficulty,
    totalSolved,
  });

  // realtime уведомление
  broadcast({
    type: 'leaderboard_update',
    user: { id: req.user.id, username: req.user.username },
    points,
    totalPoints: totalPoints + bonus,
    puzzleId: puzzle.id,
  });

  res.json({
    ok: true,
    points,
    bonus,
    durationSeconds,
    totalPoints: totalPoints + bonus,
    rank: newRank,
    newAchievements: granted,
  });
});

module.exports = router;
