const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const { rows } = await db.query(
    `SELECT id, username, total_points, total_solved, best_time, rank, avatar_color, picture
     FROM users
     WHERE total_solved > 0
     ORDER BY total_points DESC, total_solved DESC, best_time ASC NULLS LAST
     LIMIT $1`,
    [limit]
  );
  res.json(rows);
});

module.exports = router;
