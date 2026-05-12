const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { authRequired, optionalAuth } = require('../middleware/auth');
const { checkUserSolution, normalize } = require('../utils/sudoku');
const { calcPoints, rankForPoints } = require('../utils/ranks');
const { checkAfterSolve } = require('../utils/achievements');
const { broadcast } = require('../ws');
const { ensureCurrentPuzzles, currentSlot } = require('../utils/rotation');

const router = express.Router();

const submitLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });
const checkLimiter = rateLimit({ windowMs: 60 * 1000, max: 400 });

function today() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizePuzzle(row) {
  if (!row) return row;
  const { solution, ...rest } = row;
  return rest;
}

// Список текущих судоку (7 сложностей). Помечает пройденные для залогиненного.
router.get('/', optionalAuth, async (req, res) => {
  await ensureCurrentPuzzles();
  const { from, to } = currentSlot();

  const { rows } = await db.query(
    `SELECT id, title, difficulty, kind, base_points, min_seconds, active_from, active_to, created_at
     FROM puzzles
     WHERE active_from = $1 AND active_to = $2
     ORDER BY base_points ASC`,
    [from.toISOString(), to.toISOString()]
  );

  // Если пользователь залогинен — пометим пройденные и незавершённые
  let solvedIds = new Set();
  let inProgressIds = new Set();
  if (req.user) {
    const ids = rows.map((r) => r.id);
    if (ids.length > 0) {
      const solved = await db.query(
        `SELECT puzzle_id FROM attempts WHERE user_id=$1 AND puzzle_id = ANY($2) AND is_solved=TRUE`,
        [req.user.id, ids]
      );
      solvedIds = new Set(solved.rows.map((r) => r.puzzle_id));

      const inProgress = await db.query(
        `SELECT puzzle_id FROM attempts WHERE user_id=$1 AND puzzle_id = ANY($2) AND is_solved=FALSE`,
        [req.user.id, ids]
      );
      inProgressIds = new Set(inProgress.rows.map((r) => r.puzzle_id));
    }
  }

  res.json(rows.map((r) => ({ ...r, solved: solvedIds.has(r.id), in_progress: inProgressIds.has(r.id) })));
});

router.get('/:id', optionalAuth, async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM puzzles WHERE id=$1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Не найдено' });
  res.json(sanitizePuzzle(rows[0]));
});

// Старт попытки
router.post('/:id/start', authRequired, async (req, res) => {
  const puzzle = await db.query(`SELECT id FROM puzzles WHERE id=$1`, [req.params.id]);
  if (!puzzle.rows[0]) return res.status(404).json({ error: 'Не найдено' });

  const existing = await db.query(
    `SELECT * FROM attempts WHERE user_id=$1 AND puzzle_id=$2`,
    [req.user.id, req.params.id]
  );
  if (existing.rows[0]) {
    if (existing.rows[0].is_solved) return res.status(400).json({ error: 'Уже решено', solved: true });
    return res.json({ started_at: existing.rows[0].started_at, resumed: true });
  }

  const { rows } = await db.query(
    `INSERT INTO attempts (user_id, puzzle_id) VALUES ($1,$2)
     RETURNING started_at`,
    [req.user.id, req.params.id]
  );
  res.json({ started_at: rows[0].started_at, resumed: false });
});

// Проверка одной клетки
router.post('/:id/check', authRequired, checkLimiter, async (req, res) => {
  const idx = parseInt(req.body?.index, 10);
  const val = String(req.body?.value || '').trim();
  if (!(idx >= 0 && idx < 81)) return res.status(400).json({ error: 'bad index' });
  if (!/^[1-9]$/.test(val)) return res.status(400).json({ error: 'bad value' });

  const { rows } = await db.query(`SELECT solution FROM puzzles WHERE id=$1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Не найдено' });
  const correct = rows[0].solution[idx] === val;
  res.json({ correct });
});

// Подсказка: возвращает одну правильную цифру для указанной клетки или первой пустой
router.post('/:id/hint', authRequired, async (req, res) => {
  const { rows } = await db.query(`SELECT puzzle, solution FROM puzzles WHERE id=$1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Не найдено' });
  const { puzzle, solution } = rows[0];

  const filled = String(req.body?.value || puzzle);
  const idx = parseInt(req.body?.index, 10);

  let hintIdx = null;
  if (idx >= 0 && idx < 81 && puzzle[idx] === '0' && filled[idx] === '0') {
    hintIdx = idx;
  } else {
    const emptyIndices = [];
    for (let i = 0; i < 81; i++) {
      if (puzzle[i] === '0' && (!filled[i] || filled[i] === '0')) emptyIndices.push(i);
    }
    if (emptyIndices.length === 0) return res.status(400).json({ error: 'Всё заполнено' });
    hintIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  }

  // Инкрементируем hints_used
  await db.query(
    `UPDATE attempts SET hints_used = COALESCE(hints_used, 0) + 1 WHERE user_id=$1 AND puzzle_id=$2 AND is_solved=FALSE`,
    [req.user.id, req.params.id]
  );

  res.json({ index: hintIdx, value: solution[hintIdx] });
});

// Reset attempt
router.post('/:id/reset', authRequired, async (req, res) => {
  await db.query(
    `DELETE FROM attempts WHERE user_id=$1 AND puzzle_id=$2 AND is_solved=FALSE`,
    [req.user.id, req.params.id]
  );
  const { rows } = await db.query(
    `INSERT INTO attempts (user_id, puzzle_id) VALUES ($1,$2) RETURNING started_at`,
    [req.user.id, req.params.id]
  );
  res.json({ started_at: rows[0].started_at });
});

// Отправка решения
router.post('/:id/submit', authRequired, submitLimiter, async (req, res) => {
  const userSolution = normalize(req.body?.solution);
  const hint = !!req.body?.hint;
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
    const ins = await db.query(
      `INSERT INTO attempts (user_id, puzzle_id) VALUES ($1,$2) RETURNING *`,
      [req.user.id, req.params.id]
    );
    attempt = ins.rows[0];
  }
  if (attempt.is_solved) return res.status(400).json({ error: 'Уже решено' });

  const now = new Date();
  const started = new Date(attempt.started_at);
  const durationSeconds = Math.max(1, Math.round((now - started) / 1000));

  if (durationSeconds < puzzle.min_seconds) {
    return res.status(400).json({ error: 'Слишком быстро', minSeconds: puzzle.min_seconds, durationSeconds });
  }

  const check = checkUserSolution({
    puzzle: puzzle.puzzle,
    correctSolution: puzzle.solution,
    userSolution,
  });
  if (!check.ok) {
    return res.status(200).json({ ok: false, reason: check.reason, durationSeconds });
  }

  let points = calcPoints({
    basePoints: puzzle.base_points,
    difficulty: puzzle.difficulty,
    durationSeconds,
    minSeconds: puzzle.min_seconds,
  });
  if (hint) points = Math.max(1, Math.round(points / 2));

  await db.query(
    `UPDATE attempts SET finished_at=$1, duration_seconds=$2, is_solved=TRUE, points_awarded=$3 WHERE id=$4`,
    [now, durationSeconds, points, attempt.id]
  );

  const updUser = await db.query(
    `UPDATE users SET total_points = total_points + $1, total_solved = total_solved + 1,
            best_time = LEAST(COALESCE(best_time, $2), $2) WHERE id=$3
      RETURNING total_points, total_solved, best_time`,
    [points, durationSeconds, req.user.id]
  );

  const totalPoints = updUser.rows[0].total_points;
  const totalSolved = updUser.rows[0].total_solved;
  const newRank = rankForPoints(totalPoints);
  await db.query(`UPDATE users SET rank=$1 WHERE id=$2`, [newRank, req.user.id]);

  const day = today();
  await db.query(
    `UPDATE daily_tasks SET progress = LEAST(progress + 1, target), is_completed = (progress + 1) >= target
      WHERE user_id=$1 AND day=$2 AND code='solve_any'`,
    [req.user.id, day]
  );

  const completed = await db.query(
    `SELECT id, reward_points FROM daily_tasks WHERE user_id=$1 AND day=$2 AND is_completed=TRUE AND reward_points > 0`,
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

  const granted = await checkAfterSolve(req.user.id, { durationSeconds, difficulty: puzzle.difficulty, totalSolved });

  broadcast({
    type: 'leaderboard_update',
    user: { id: req.user.id, username: req.user.username },
    points,
    totalPoints: totalPoints + bonus,
    puzzleId: puzzle.id,
  });

  // Начисляем монеты (1 монета за каждые 10 очков)
  const coinsEarned = Math.max(1, Math.round(points / 10));
  await db.query('UPDATE users SET coins = coins + $1 WHERE id=$2', [coinsEarned, req.user.id]);

  res.json({ ok: true, points, bonus, hint, durationSeconds, totalPoints: totalPoints + bonus, rank: newRank, newAchievements: granted, coins: coinsEarned });
});

module.exports = router;
