const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, async (req, res) => {
  const all = await db.query(`SELECT id, code, title, description, icon FROM achievements ORDER BY id`);
  const mine = await db.query(
    `SELECT achievement_id, earned_at FROM user_achievements WHERE user_id=$1`,
    [req.user.id]
  );
  const map = new Map(mine.rows.map((r) => [r.achievement_id, r.earned_at]));
  res.json(
    all.rows.map((a) => ({
      ...a,
      earned: map.has(a.id),
      earned_at: map.get(a.id) || null,
    }))
  );
});

module.exports = router;
