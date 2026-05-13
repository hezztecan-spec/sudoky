const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// Общая статистика пользователя по всем играм
router.get('/me/overview', authRequired, async (req, res) => {
  const userId = req.user.id;

  const sudoku = await db.query(
    `SELECT COUNT(*)::int AS solved, COALESCE(SUM(points_awarded),0)::int AS points,
            ROUND(AVG(duration_seconds))::int AS avg_time
     FROM attempts WHERE user_id=$1 AND is_solved=TRUE`, [userId]
  );

  const games = await db.query(
    `SELECT game_type, SUM(points)::int AS points, COUNT(*)::int AS games
     FROM game_scores WHERE user_id=$1 GROUP BY game_type`, [userId]
  );

  const mpWins = await db.query(
    `SELECT COUNT(*)::int AS wins FROM game_sessions WHERE winner_id=$1`, [userId]
  );
  const mpTotal = await db.query(
    `SELECT COUNT(*)::int AS total FROM game_sessions
     WHERE (player1_id=$1 OR player2_id=$1) AND status='finished'`, [userId]
  );

  const user = await db.query('SELECT coins, streak, total_points FROM users WHERE id=$1', [userId]);

  res.json({
    sudoku: sudoku.rows[0],
    games: games.rows,
    multiplayer: { wins: mpWins.rows[0].wins, total: mpTotal.rows[0].total },
    coins: user.rows[0]?.coins || 0,
    streak: user.rows[0]?.streak || 0,
    totalSudokuPoints: user.rows[0]?.total_points || 0,
  });
});

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
