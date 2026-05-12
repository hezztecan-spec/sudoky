const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// Список друзей
router.get('/', authRequired, async (req, res) => {
  const { rows } = await db.query(
    `SELECT u.id, u.username, u.avatar_color, u.picture, u.rank, u.total_points
     FROM friends f JOIN users u ON u.id = f.friend_id
     WHERE f.user_id = $1
     ORDER BY u.username`,
    [req.user.id]
  );
  res.json(rows);
});

// Добавить друга по username
router.post('/add', authRequired, async (req, res) => {
  const username = String(req.body?.username || '').trim();
  if (!username) return res.status(400).json({ error: 'username обязателен' });

  const { rows } = await db.query('SELECT id FROM users WHERE username=$1', [username]);
  if (!rows[0]) return res.status(404).json({ error: 'Пользователь не найден' });
  if (rows[0].id === req.user.id) return res.status(400).json({ error: 'Нельзя добавить себя' });

  await db.query(
    `INSERT INTO friends (user_id, friend_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [req.user.id, rows[0].id]
  );
  // Взаимная дружба
  await db.query(
    `INSERT INTO friends (user_id, friend_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [rows[0].id, req.user.id]
  );
  res.json({ ok: true, friendId: rows[0].id });
});

// Удалить друга
router.post('/remove', authRequired, async (req, res) => {
  const friendId = parseInt(req.body?.friendId, 10);
  if (!friendId) return res.status(400).json({ error: 'friendId обязателен' });
  await db.query('DELETE FROM friends WHERE user_id=$1 AND friend_id=$2', [req.user.id, friendId]);
  await db.query('DELETE FROM friends WHERE user_id=$1 AND friend_id=$2', [friendId, req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
