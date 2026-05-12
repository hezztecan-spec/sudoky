const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { addToFeed } = require('./feed');

const router = express.Router();

// Сохранить результат реакции
router.post('/reaction/submit', authRequired, async (req, res) => {
  const avgMs = parseInt(req.body?.avgMs, 10);
  if (!avgMs || avgMs < 50 || avgMs > 5000) return res.status(400).json({ error: 'Некорректный результат' });

  // Очки: чем быстрее, тем больше. 100мс = 100pts, 500мс = 20pts
  const points = Math.max(1, Math.round(10000 / avgMs));

  await db.query(
    `INSERT INTO game_scores (user_id, game_type, points) VALUES ($1,'reaction',$2)`,
    [req.user.id, points]
  );
  await db.query(`UPDATE users SET total_points = total_points + $1 WHERE id=$2`, [points, req.user.id]);

  addToFeed(req.user.id, 'won_game', { gameType: 'реакция', detail: `${avgMs}мс` });

  // Лучший результат
  const best = await db.query(
    `SELECT MIN(points) AS worst, MAX(points) AS best FROM game_scores WHERE user_id=$1 AND game_type='reaction'`,
    [req.user.id]
  );

  res.json({ points, avgMs, totalGames: best.rows[0] });
});

// Сохранить результат памяти
router.post('/memory/submit', authRequired, async (req, res) => {
  const moves = parseInt(req.body?.moves, 10);
  const seconds = parseInt(req.body?.seconds, 10);
  const pairs = parseInt(req.body?.pairs, 10) || 8;
  if (!moves || !seconds) return res.status(400).json({ error: 'moves и seconds обязательны' });

  // Очки: меньше ходов и быстрее = больше. Идеал: 8 пар = 8 ходов.
  const efficiency = Math.max(0.3, pairs / moves); // 1.0 = идеально
  const speedBonus = Math.max(0.5, 60 / Math.max(seconds, 10)); // быстрее минуты = бонус
  const points = Math.max(1, Math.round(50 * efficiency * speedBonus));

  await db.query(
    `INSERT INTO game_scores (user_id, game_type, points) VALUES ($1,'memory',$2)`,
    [req.user.id, points]
  );
  await db.query(`UPDATE users SET total_points = total_points + $1 WHERE id=$2`, [points, req.user.id]);

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
    // 1 попытка = 100, 2 = 80, 3 = 60, 4 = 40, 5 = 25, 6 = 10
    const map = { 1: 100, 2: 80, 3: 60, 4: 40, 5: 25, 6: 10 };
    points = map[attempts] || 10;
  }

  if (points > 0) {
    await db.query(
      `INSERT INTO game_scores (user_id, game_type, points) VALUES ($1,'wordle',$2)`,
      [req.user.id, points]
    );
    await db.query(`UPDATE users SET total_points = total_points + $1 WHERE id=$2`, [points, req.user.id]);
    addToFeed(req.user.id, 'won_game', { gameType: 'слова', detail: `за ${attempts} попыток` });
  }

  res.json({ points, attempts, won });
});

module.exports = router;
