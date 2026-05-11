const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/me', authRequired, async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, phone, username, is_admin, total_points, total_solved, best_time, rank, avatar_color, picture, created_at
     FROM users WHERE id=$1`,
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.get('/users/:id', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, username, total_points, total_solved, best_time, rank, avatar_color, picture, created_at
     FROM users WHERE id=$1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });

  const stats = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE is_solved) AS solved,
       COUNT(*) AS attempts,
       AVG(duration_seconds) FILTER (WHERE is_solved) AS avg_time,
       MIN(duration_seconds) FILTER (WHERE is_solved) AS best_time
     FROM attempts WHERE user_id=$1`,
    [req.params.id]
  );

  const achievements = await db.query(
    `SELECT a.code, a.title, a.description, a.icon, ua.earned_at
     FROM user_achievements ua
     JOIN achievements a ON a.id=ua.achievement_id
     WHERE ua.user_id=$1
     ORDER BY ua.earned_at DESC`,
    [req.params.id]
  );

  res.json({
    user: rows[0],
    stats: stats.rows[0],
    achievements: achievements.rows,
  });
});

router.get('/history', authRequired, async (req, res) => {
  const { rows } = await db.query(
    `SELECT a.id, a.started_at, a.finished_at, a.duration_seconds, a.is_solved, a.points_awarded,
            p.id AS puzzle_id, p.title, p.difficulty, p.kind
     FROM attempts a
     JOIN puzzles p ON p.id=a.puzzle_id
     WHERE a.user_id=$1
     ORDER BY a.started_at DESC
     LIMIT 100`,
    [req.user.id]
  );
  res.json(rows);
});

module.exports = router;
