const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { checkUserSolution, normalize } = require('../utils/sudoku');
const { broadcast } = require('../ws');
const { generate } = require('../utils/generator');

const router = express.Router();

// Создать дуэль
router.post('/', authRequired, async (req, res) => {
  const difficulty = String(req.body?.difficulty || 'средний');

  // Генерируем специальный пазл для дуэли (не ротируется, не в списке)
  const p = generate(difficulty);
  const puzzleRes = await db.query(
    `INSERT INTO puzzles (title, difficulty, kind, puzzle, solution, base_points, min_seconds, active_from, active_to)
     VALUES ('Дуэль', $1, 'bonus', $2, $3, $4, $5, NOW(), NOW() + INTERVAL '1 day')
     RETURNING id`,
    [difficulty, p.puzzle, p.solution, p.base_points, p.min_seconds]
  );
  const puzzleId = puzzleRes.rows[0].id;

  const id = crypto.randomUUID().slice(0, 8);
  await db.query(
    `INSERT INTO duels (id, puzzle_id, creator_id) VALUES ($1,$2,$3)`,
    [id, puzzleId, req.user.id]
  );

  res.json({ id, puzzleId });
});

// Получить информацию о дуэли
router.get('/:id', authRequired, async (req, res) => {
  const { rows } = await db.query(
    `SELECT d.*, p.puzzle, p.difficulty, p.base_points, p.min_seconds,
            u1.username AS creator_username,
            u2.username AS opponent_username
     FROM duels d
     JOIN puzzles p ON p.id = d.puzzle_id
     JOIN users u1 ON u1.id = d.creator_id
     LEFT JOIN users u2 ON u2.id = d.opponent_id
     WHERE d.id=$1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Дуэль не найдена' });
  const d = rows[0];
  res.json({
    id: d.id,
    puzzle: d.puzzle,
    difficulty: d.difficulty,
    base_points: d.base_points,
    min_seconds: d.min_seconds,
    creator: { id: d.creator_id, username: d.creator_username },
    opponent: d.opponent_id ? { id: d.opponent_id, username: d.opponent_username } : null,
    status: d.status,
    started_at: d.started_at,
    creator_finished_at: d.creator_finished_at,
    opponent_finished_at: d.opponent_finished_at,
    winner_id: d.winner_id,
  });
});

// Присоединиться к дуэли (если ты не создатель — становишься оппонентом)
router.post('/:id/join', authRequired, async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM duels WHERE id=$1`, [req.params.id]);
  const d = rows[0];
  if (!d) return res.status(404).json({ error: 'Дуэль не найдена' });

  if (d.creator_id === req.user.id) return res.json({ ok: true, role: 'creator' });

  if (!d.opponent_id && d.status === 'waiting') {
    const upd = await db.query(
      `UPDATE duels SET opponent_id=$1, status='running', started_at=NOW()
        WHERE id=$2 AND opponent_id IS NULL RETURNING *`,
      [req.user.id, req.params.id]
    );
    if (upd.rows[0]) {
      broadcast({ type: 'duel_start', duelId: req.params.id });
      return res.json({ ok: true, role: 'opponent', duel: upd.rows[0] });
    }
  }

  if (d.opponent_id === req.user.id) return res.json({ ok: true, role: 'opponent' });
  return res.status(400).json({ error: 'Дуэль уже занята' });
});

// Завершить свою сторону дуэли
router.post('/:id/finish', authRequired, async (req, res) => {
  const userSolution = normalize(req.body?.solution);
  if (!userSolution) return res.status(400).json({ error: 'Некорректный формат' });

  const { rows } = await db.query(
    `SELECT d.*, p.puzzle, p.solution FROM duels d
     JOIN puzzles p ON p.id=d.puzzle_id WHERE d.id=$1`,
    [req.params.id]
  );
  const d = rows[0];
  if (!d) return res.status(404).json({ error: 'Не найдено' });
  if (d.status !== 'running') return res.status(400).json({ error: 'Дуэль не активна' });

  const isCreator = d.creator_id === req.user.id;
  const isOpponent = d.opponent_id === req.user.id;
  if (!isCreator && !isOpponent) return res.status(403).json({ error: 'Ты не участник' });

  const check = checkUserSolution({
    puzzle: d.puzzle,
    correctSolution: d.solution,
    userSolution,
  });
  if (!check.ok) return res.json({ ok: false, reason: check.reason });

  const field = isCreator ? 'creator_finished_at' : 'opponent_finished_at';
  const now = new Date();
  await db.query(`UPDATE duels SET ${field}=$1 WHERE id=$2`, [now, req.params.id]);

  // Если второй ещё не финишировал — объявляем победителя сразу (первый, кто решил)
  const upd = await db.query(
    `UPDATE duels SET status='finished', winner_id=$1
     WHERE id=$2 AND status='running' AND winner_id IS NULL RETURNING *`,
    [req.user.id, req.params.id]
  );
  if (upd.rows[0]) {
    broadcast({ type: 'duel_finished', duelId: req.params.id, winnerId: req.user.id });
  }

  res.json({ ok: true, won: !!upd.rows[0] });
});

// Прогресс дуэли (сколько клеток заполнил) — для real-time индикатора
router.post('/:id/progress', authRequired, async (req, res) => {
  const filled = parseInt(req.body?.filled || 0, 10);
  const { rows } = await db.query(`SELECT creator_id, opponent_id FROM duels WHERE id=$1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  const isCreator = rows[0].creator_id === req.user.id;
  const isOpponent = rows[0].opponent_id === req.user.id;
  if (!isCreator && !isOpponent) return res.status(403).json({ error: 'Not a participant' });

  broadcast({
    type: 'duel_progress',
    duelId: req.params.id,
    userId: req.user.id,
    filled,
  });
  res.json({ ok: true });
});

module.exports = router;
