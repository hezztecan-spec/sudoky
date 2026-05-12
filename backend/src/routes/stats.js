const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// График: среднее время по дням (последние 14 дней)
router.get('/me/timeline', authRequired, async (req, res) => {
  const { rows } = await db.query(
    `SELECT
       DATE(finished_at) AS day,
       COUNT(*)::int AS solved,
       ROUND(AVG(duration_seconds))::int AS avg_time,
       SUM(points_awarded)::int AS points
     FROM attempts
     WHERE user_id=$1 AND is_solved=TRUE AND finished_at > NOW() - INTERVAL '14 days'
     GROUP BY day
     ORDER BY day ASC`,
    [req.user.id]
  );
  res.json(rows);
});

// Распределение по сложностям
router.get('/me/by-difficulty', authRequired, async (req, res) => {
  const { rows } = await db.query(
    `SELECT p.difficulty, COUNT(*)::int AS count,
            ROUND(AVG(a.duration_seconds))::int AS avg_time
     FROM attempts a JOIN puzzles p ON p.id = a.puzzle_id
     WHERE a.user_id=$1 AND a.is_solved=TRUE
     GROUP BY p.difficulty
     ORDER BY COUNT(*) DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// Сравнение результата по конкретному judge: быстрее скольки процентов игроков
router.get('/compare/:puzzleId', authRequired, async (req, res) => {
  const { rows: mine } = await db.query(
    `SELECT duration_seconds FROM attempts WHERE user_id=$1 AND puzzle_id=$2 AND is_solved=TRUE`,
    [req.user.id, req.params.puzzleId]
  );
  if (!mine[0]) return res.json({ percentile: null });

  const myTime = mine[0].duration_seconds;
  const { rows } = await db.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE duration_seconds > $1)::int AS slower
     FROM attempts
     WHERE puzzle_id=$2 AND is_solved=TRUE`,
    [myTime, req.params.puzzleId]
  );
  const { total, slower } = rows[0];
  if (total < 2) return res.json({ percentile: null, total });
  const percentile = Math.round((slower / total) * 100);
  res.json({ percentile, total, myTime });
});

module.exports = router;
