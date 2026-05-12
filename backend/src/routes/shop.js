const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// Список товаров
router.get('/items', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM shop_items ORDER BY category, price');
  res.json(rows);
});

// Мои покупки
router.get('/my', authRequired, async (req, res) => {
  const { rows } = await db.query(
    `SELECT ui.*, si.code, si.category, si.name, si.data
     FROM user_items ui JOIN shop_items si ON si.id=ui.item_id
     WHERE ui.user_id=$1`,
    [req.user.id]
  );
  res.json(rows);
});

// Купить
router.post('/buy', authRequired, async (req, res) => {
  const code = String(req.body?.code || '');
  const item = (await db.query('SELECT * FROM shop_items WHERE code=$1', [code])).rows[0];
  if (!item) return res.status(404).json({ error: 'Товар не найден' });

  const user = (await db.query('SELECT coins FROM users WHERE id=$1', [req.user.id])).rows[0];
  if (user.coins < item.price) return res.status(400).json({ error: 'Недостаточно монет' });

  // Проверяем не куплен ли уже
  const exists = (await db.query('SELECT 1 FROM user_items WHERE user_id=$1 AND item_id=$2', [req.user.id, item.id])).rows[0];
  if (exists) return res.status(400).json({ error: 'Уже куплено' });

  await db.query('UPDATE users SET coins = coins - $1 WHERE id=$2', [item.price, req.user.id]);
  await db.query('INSERT INTO user_items (user_id, item_id) VALUES ($1,$2)', [req.user.id, item.id]);

  res.json({ ok: true, coins: user.coins - item.price });
});

// Экипировать/снять
router.post('/equip', authRequired, async (req, res) => {
  const code = String(req.body?.code || '');
  const item = (await db.query('SELECT * FROM shop_items WHERE code=$1', [code])).rows[0];
  if (!item) return res.status(404).json({ error: 'Товар не найден' });

  const owned = (await db.query('SELECT * FROM user_items WHERE user_id=$1 AND item_id=$2', [req.user.id, item.id])).rows[0];
  if (!owned) return res.status(400).json({ error: 'Не куплено' });

  // Снимаем все в этой категории
  await db.query(
    `UPDATE user_items SET equipped=FALSE
     WHERE user_id=$1 AND item_id IN (SELECT id FROM shop_items WHERE category=$2)`,
    [req.user.id, item.category]
  );

  // Экипируем (или снимаем если уже был)
  const newState = !owned.equipped;
  await db.query('UPDATE user_items SET equipped=$1 WHERE user_id=$2 AND item_id=$3', [newState, req.user.id, item.id]);

  res.json({ ok: true, equipped: newState });
});

module.exports = router;
