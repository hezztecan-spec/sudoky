const express = require('express');
const webpush = require('web-push');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// Настройка VAPID
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@example.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

// Получить публичный ключ (фронт использует для подписки)
router.get('/vapid-key', (req, res) => {
  res.json({ key: VAPID_PUBLIC });
});

// Подписаться на push
router.post('/subscribe', authRequired, async (req, res) => {
  const subscription = req.body?.subscription;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'subscription обязателен' });
  }

  // Удаляем старые подписки этого юзера с тем же endpoint
  await db.query(
    `DELETE FROM push_subscriptions WHERE user_id=$1 AND subscription->>'endpoint'=$2`,
    [req.user.id, subscription.endpoint]
  );

  await db.query(
    `INSERT INTO push_subscriptions (user_id, subscription) VALUES ($1,$2)`,
    [req.user.id, JSON.stringify(subscription)]
  );

  res.json({ ok: true });
});

// Отписаться
router.post('/unsubscribe', authRequired, async (req, res) => {
  const endpoint = req.body?.endpoint;
  if (endpoint) {
    await db.query(
      `DELETE FROM push_subscriptions WHERE user_id=$1 AND subscription->>'endpoint'=$2`,
      [req.user.id, endpoint]
    );
  } else {
    await db.query(`DELETE FROM push_subscriptions WHERE user_id=$1`, [req.user.id]);
  }
  res.json({ ok: true });
});

// Утилита: отправить push конкретному юзеру
async function sendPushToUser(userId, payload) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  const { rows } = await db.query(
    `SELECT subscription FROM push_subscriptions WHERE user_id=$1`,
    [userId]
  );

  const body = JSON.stringify(payload);

  for (const row of rows) {
    try {
      await webpush.sendNotification(row.subscription, body);
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Подписка протухла — удаляем
        await db.query(
          `DELETE FROM push_subscriptions WHERE user_id=$1 AND subscription->>'endpoint'=$2`,
          [userId, row.subscription.endpoint]
        );
      }
    }
  }
}

module.exports = router;
module.exports.sendPushToUser = sendPushToUser;
