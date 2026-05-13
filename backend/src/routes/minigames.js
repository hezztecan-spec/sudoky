const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { addToFeed } = require('./feed');

const router = express.Router();

// Сохранить результат реакции
router.post('/reaction/submit', authRequired, async (req, res) => {
  const avgMs = parseInt(req.body?.avgMs, 10);
  if (!avgMs || avgMs < 50 || avgMs > 5000) return res.status(400).json({ error: 'Некорректный результат' });

  const points = Math.max(1, Math.round(10000 / avgMs));

  await db.query(
    `INSERT INTO game_scores (user_id, game_type, points) VALUES ($1,'reaction',$2)`,
    [req.user.id, points]
  );

  addToFeed(req.user.id, 'won_game', { gameType: 'реакция', detail: `${avgMs}мс` });

  res.json({ points, avgMs });
});

// Сохранить результат памяти
router.post('/memory/submit', authRequired, async (req, res) => {
  const moves = parseInt(req.body?.moves, 10);
  const seconds = parseInt(req.body?.seconds, 10);
  const pairs = parseInt(req.body?.pairs, 10) || 8;
  if (!moves || !seconds) return res.status(400).json({ error: 'moves и seconds обязательны' });

  const efficiency = Math.max(0.3, pairs / moves);
  const speedBonus = Math.max(0.5, 60 / Math.max(seconds, 10));
  const points = Math.max(1, Math.round(50 * efficiency * speedBonus));

  await db.query(
    `INSERT INTO game_scores (user_id, game_type, points) VALUES ($1,'memory',$2)`,
    [req.user.id, points]
  );

  addToFeed(req.user.id, 'won_game', { gameType: 'память', detail: `${moves} ходов, ${seconds}с` });

  res.json({ points, moves, seconds });
});

// Сохранить результат wordle
router.post('/wordle/submit', authRequired, async (req, res) => {
  const attempts = parseInt(req.body?.attempts, 10);
  const won = !!req.body?.won;
  if (!attempts) return res.status(400).json({ error: 'attempts обязателен' });

  let points = 0;
  if (won) {
    const map = { 1: 100, 2: 80, 3: 60, 4: 40, 5: 25, 6: 10 };
    points = map[attempts] || 10;
  }

  if (points > 0) {
    await db.query(
      `INSERT INTO game_scores (user_id, game_type, points) VALUES ($1,'wordle',$2)`,
      [req.user.id, points]
    );
    addToFeed(req.user.id, 'won_game', { gameType: 'слова', detail: `за ${attempts} попыток` });
  }

  res.json({ points, attempts, won });
});

module.exports = router;
