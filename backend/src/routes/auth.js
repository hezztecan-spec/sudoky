const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const db = require('../db');
const { signToken } = require('../middleware/auth');

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

function pickUsername(payload) {
  const base = (payload.given_name || payload.name || payload.email.split('@')[0])
    .toString()
    .replace(/[^\w\dа-яА-Я_]/g, '')
    .slice(0, 20) || 'player';
  return base;
}

async function uniqueUsername(base) {
  let name = base;
  let i = 1;
  while (true) {
    const { rows } = await db.query('SELECT 1 FROM users WHERE username=$1', [name]);
    if (!rows[0]) return name;
    i += 1;
    name = `${base}${i}`;
  }
}

router.post('/google', async (req, res) => {
  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ error: 'credential обязателен' });
  if (!googleClient) return res.status(500).json({ error: 'Google OAuth не настроен на сервере' });

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch (e) {
    return res.status(401).json({ error: 'Некорректный Google токен' });
  }

  const googleId = payload.sub;
  const email = (payload.email || '').toLowerCase();
  if (!email) return res.status(400).json({ error: 'Нет email от Google' });

  // найти или создать
  let user = (await db.query('SELECT * FROM users WHERE google_id=$1 OR email=$2', [googleId, email])).rows[0];
  if (!user) {
    const username = await uniqueUsername(pickUsername(payload));
    const inserted = await db.query(
      `INSERT INTO users (email, username, google_id, picture, avatar_color)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [email, username, googleId, payload.picture || null, '#ffffff']
    );
    user = inserted.rows[0];
  } else if (!user.google_id) {
    const upd = await db.query(
      `UPDATE users SET google_id=$1, picture=COALESCE(picture,$2) WHERE id=$3 RETURNING *`,
      [googleId, payload.picture || null, user.id]
    );
    user = upd.rows[0];
  }

  const token = signToken({ id: user.id, username: user.username, is_admin: user.is_admin });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      is_admin: user.is_admin,
      total_points: user.total_points,
      total_solved: user.total_solved,
      rank: user.rank,
      avatar_color: user.avatar_color,
      picture: user.picture,
    },
  });
});

module.exports = router;
