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
  const users = await db.query(`SELECT COUNT(*)::int AS c FROM users WHERE is_admin=FALSE`);
  const puzzles = await db.query(`SELECT COUNT(*)::int AS c FROM puzzles`);
  const attempts = await db.query(`SELECT COUNT(*)::int AS c, COUNT(*) FILTER (WHERE is_solved)::int AS solved FROM attempts`);
  const top = await db.query(
    `SELECT id, username, total_points FROM users
     WHERE is_admin=FALSE ORDER BY total_points DESC LIMIT 10`
  );
  res.json({
    users: users.rows[0].c,
    puzzles: puzzles.rows[0].c,
    attempts: attempts.rows[0].c,
    solved: attempts.rows[0].solved,
    top: top.rows,
  });
});

module.exports = router;
