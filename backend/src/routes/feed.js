const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// Получить ленту (последние 50 событий)
router.get('/', authRequired, async (req, res) => {
  const { rows } = await db.query(
    `SELECT f.id, f.action, f.details, f.created_at, u.id AS user_id, u.username, u.avatar_color
     FROM activity_feed f
     JOIN users u ON u.id = f.user_id
     ORDER BY f.created_at DESC
     LIMIT 50`
  );
  res.json(rows);
});

module.exports = router;

// Утилита для добавления в ленту
module.exports.addToFeed = async function(userId, action, details = {}) {
  try {
    await db.query(
      `INSERT INTO activity_feed (user_id, action, details) VALUES ($1,$2,$3)`,
      [userId, action, JSON.stringify(details)]
    );
  } catch (e) {
    console.warn('[feed] error:', e.message);
  }
};
