const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { broadcast } = require('../ws');

const router = express.Router();
const chatLimiter = rateLimit({ windowMs: 10 * 1000, max: 5 });

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT m.id, m.message, m.created_at, u.id AS user_id, u.username, u.avatar_color, u.picture, u.rank
     FROM chat_messages m
     JOIN users u ON u.id=m.user_id
     ORDER BY m.created_at DESC
     LIMIT 100`
  );
  res.json(rows.reverse());
});

router.post('/', authRequired, chatLimiter, async (req, res) => {
  const message = (req.body?.message || '').toString().trim().slice(0, 500);
  if (!message) return res.status(400).json({ error: 'Пустое сообщение' });

  const { rows } = await db.query(
    `INSERT INTO chat_messages (user_id, message) VALUES ($1,$2)
     RETURNING id, user_id, message, created_at`,
    [req.user.id, message]
  );
  const user = await db.query(
    `SELECT id, username, avatar_color, picture, rank FROM users WHERE id=$1`,
    [req.user.id]
  );
  const payload = {
    ...rows[0],
    username: user.rows[0].username,
    avatar_color: user.rows[0].avatar_color,
    picture: user.rows[0].picture,
    rank: user.rows[0].rank,
  };
  broadcast({ type: 'chat_message', message: payload });
  res.json(payload);
});

module.exports = router;
