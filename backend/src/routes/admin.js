const express = require('express');
const db = require('../db');
const { authRequired, adminRequired } = require('../middleware/auth');
const { normalize, isValidSolution, matchesPuzzle } = require('../utils/sudoku');

const router = express.Router();

router.use(authRequired, adminRequired);

router.post('/puzzles', async (req, res) => {
  const { title, difficulty, kind, puzzle, solution, base_points, min_seconds, active_from, active_to } = req.body || {};
  const p = normalize(puzzle);
  const s = normalize(solution);
  if (!p || !s) return res.status(400).json({ error: 'puzzle и solution должны быть 81 символа (0 для пустых)' });
  if (!isValidSolution(s)) return res.status(400).json({ error: 'solution невалидное' });
  if (!matchesPuzzle(p, s)) return res.status(400).json({ error: 'solution не совпадает с puzzle' });
  if (!['easy', 'medium', 'hard', 'expert'].includes(difficulty)) return res.status(400).json({ error: 'Плохой difficulty' });
  if (!['daily', 'weekly', 'bonus'].includes(kind)) return res.status(400).json({ error: 'Плохой kind' });

  const { rows } = await db.query(
    `INSERT INTO puzzles (title, difficulty, kind, puzzle, solution, base_points, min_seconds, active_from, active_to)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, title, difficulty, kind, base_points, active_from, active_to`,
    [
      title || `${kind} ${new Date().toISOString().slice(0, 10)}`,
      difficulty,
      kind,
      p,
      s,
      base_points || 100,
      min_seconds || 30,
      active_from || new Date().toISOString().slice(0, 10),
      active_to || new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10),
    ]
  );
  res.json(rows[0]);
});

router.get('/stats', async (req, res) => {
  const users = await db.query(`SELECT COUNT(*)::int AS c FROM users`);
  const puzzles = await db.query(`SELECT COUNT(*)::int AS c FROM puzzles`);
  const attempts = await db.query(`SELECT COUNT(*)::int AS c, COUNT(*) FILTER (WHERE is_solved)::int AS solved FROM attempts`);
  const top = await db.query(
    `SELECT id, username, total_points FROM users ORDER BY total_points DESC LIMIT 10`
  );
  res.json({
    users: users.rows[0].c,
    puzzles: puzzles.rows[0].c,
    attempts: attempts.rows[0].c,
    solved: attempts.rows[0].solved,
    top: top.rows,
  });
});

// Список всех пользователей (для управления)
router.get('/users', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, phone, username, is_admin, total_points, total_solved, rank, streak, created_at, last_active_date
     FROM users ORDER BY created_at DESC`
  );
  res.json(rows);
});

// Получить конкретного пользователя
router.get('/users/:id', async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM users WHERE id=$1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Не найден' });
  const { password_hash, ...user } = rows[0];
  res.json(user);
});

// Обновить пользователя (ник, очки, ранг, бан, админ)
router.patch('/users/:id', async (req, res) => {
  const { username, total_points, rank, is_admin, streak, avatar_color } = req.body || {};
  const fields = [];
  const values = [];
  let idx = 1;

  if (username !== undefined) { fields.push(`username=$${idx++}`); values.push(username); }
  if (total_points !== undefined) { fields.push(`total_points=$${idx++}`); values.push(total_points); }
  if (rank !== undefined) { fields.push(`rank=$${idx++}`); values.push(rank); }
  if (is_admin !== undefined) { fields.push(`is_admin=$${idx++}`); values.push(is_admin); }
  if (streak !== undefined) { fields.push(`streak=$${idx++}`); values.push(streak); }
  if (avatar_color !== undefined) { fields.push(`avatar_color=$${idx++}`); values.push(avatar_color); }

  if (fields.length === 0) return res.status(400).json({ error: 'Нечего обновлять' });

  values.push(req.params.id);
  const { rows } = await db.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id=$${idx} RETURNING id, username, is_admin, total_points, rank`,
    values
  );
  if (!rows[0]) return res.status(404).json({ error: 'Не найден' });
  res.json(rows[0]);
});

// Удалить пользователя
router.delete('/users/:id', async (req, res) => {
  await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// Сбросить очки пользователя
router.post('/users/:id/reset-points', async (req, res) => {
  await db.query('UPDATE users SET total_points=0, total_solved=0, best_time=NULL, rank=$1 WHERE id=$2', ['Новичок', req.params.id]);
  res.json({ ok: true });
});

// Принудительное обновление у всех клиентов
router.post('/force-reload', async (req, res) => {
  const { broadcast } = require('../ws');
  broadcast({ type: 'force_reload' });
  res.json({ ok: true });
});

module.exports = router;
