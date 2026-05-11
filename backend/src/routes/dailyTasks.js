const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

const DAILY_TEMPLATES = [
  { code: 'solve_any', title: 'Реши любое судоку', target: 1, reward_points: 30 },
  { code: 'solve_hard', title: 'Реши сложное или экспертное', target: 1, reward_points: 70 },
  { code: 'play_30min', title: 'Проведи 30 минут за судоку', target: 1800, reward_points: 50 },
];

async function ensureDailyTasks(userId) {
  const day = new Date().toISOString().slice(0, 10);
  for (const t of DAILY_TEMPLATES) {
    await db.query(
      `INSERT INTO daily_tasks (user_id, day, code, title, target, reward_points)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id, day, code) DO NOTHING`,
      [userId, day, t.code, t.title, t.target, t.reward_points]
    );
  }
}

router.get('/', authRequired, async (req, res) => {
  await ensureDailyTasks(req.user.id);
  const day = new Date().toISOString().slice(0, 10);
  const { rows } = await db.query(
    `SELECT id, code, title, target, progress, reward_points, is_completed
     FROM daily_tasks WHERE user_id=$1 AND day=$2
     ORDER BY id`,
    [req.user.id, day]
  );
  res.json(rows);
});

module.exports = router;
module.exports.ensureDailyTasks = ensureDailyTasks;
