const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const db = require('../db');
const { signToken } = require('../middleware/auth');
const whatsapp = require('../whatsapp');

const router = express.Router();

const OTP_TTL_MIN = 5;
const OTP_MAX_ATTEMPTS = 5;

const sendLimiter = rateLimit({ windowMs: 60 * 1000, max: 2 });        // 2/мин
const verifyLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });     // 10/мин

function normalizePhone(raw) {
  if (!raw) return null;
  const pn = parsePhoneNumberFromString(String(raw).trim(), 'RU');
  if (!pn || !pn.isValid()) return null;
  return pn.number; // +7XXXXXXXXXX
}

function generateCode() {
  // 6-значный код, лидирующие нули сохраняем
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
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

// POST /api/auth/send-code  { phone }
router.post('/send-code', sendLimiter, async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (!phone) return res.status(400).json({ error: 'Некорректный номер телефона' });

  const wa = whatsapp.status();
  if (!wa.ready) {
    return res.status(503).json({ error: 'WhatsApp-клиент ещё не готов. Попробуйте через минуту.' });
  }

  const code = generateCode();
  const hash = await bcrypt.hash(code, 10);
  const expires = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);

  // Удалим старые неиспользованные коды для этого номера
  await db.query('DELETE FROM otp_codes WHERE phone=$1 AND consumed=FALSE', [phone]);
  await db.query(
    'INSERT INTO otp_codes (phone, code_hash, expires_at) VALUES ($1,$2,$3)',
    [phone, hash, expires]
  );

  try {
    await whatsapp.sendOtp(phone, code);
  } catch (e) {
    console.error('[auth] ошибка отправки WhatsApp:', e.message);
    return res.status(502).json({ error: 'Не удалось отправить код в WhatsApp: ' + e.message });
  }

  res.json({ ok: true, ttl: OTP_TTL_MIN * 60 });
});

// POST /api/auth/verify-code  { phone, code }
router.post('/verify-code', verifyLimiter, async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const code = String(req.body?.code || '').trim();
  if (!phone || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Проверь номер и код (6 цифр)' });
  }

  const { rows } = await db.query(
    `SELECT * FROM otp_codes
      WHERE phone=$1 AND consumed=FALSE
      ORDER BY created_at DESC LIMIT 1`,
    [phone]
  );
  const otp = rows[0];
  if (!otp) return res.status(400).json({ error: 'Сначала запросите код' });
  if (new Date(otp.expires_at) < new Date()) return res.status(400).json({ error: 'Код истёк, запроси новый' });
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return res.status(429).json({ error: 'Слишком много попыток, запроси новый код' });

  const matches = await bcrypt.compare(code, otp.code_hash);
  if (!matches) {
    await db.query('UPDATE otp_codes SET attempts=attempts+1 WHERE id=$1', [otp.id]);
    return res.status(400).json({ error: 'Неверный код' });
  }

  await db.query('UPDATE otp_codes SET consumed=TRUE WHERE id=$1', [otp.id]);

  // Найти или создать пользователя
  let user = (await db.query('SELECT * FROM users WHERE phone=$1', [phone])).rows[0];
  if (!user) {
    const base = 'игрок' + phone.slice(-4);
    const username = await uniqueUsername(base);
    const inserted = await db.query(
      `INSERT INTO users (phone, username, avatar_color)
       VALUES ($1,$2,'#ffffff') RETURNING *`,
      [phone, username]
    );
    user = inserted.rows[0];
  }

  // Промоут админа по ADMIN_PHONE, если совпадает
  if (process.env.ADMIN_PHONE) {
    const adminPhone = normalizePhone(process.env.ADMIN_PHONE);
    if (adminPhone === phone && !user.is_admin) {
      const r = await db.query('UPDATE users SET is_admin=TRUE WHERE id=$1 RETURNING *', [user.id]);
      user = r.rows[0];
    }
  }

  const token = signToken({ id: user.id, username: user.username, is_admin: user.is_admin });
  res.json({
    token,
    user: {
      id: user.id,
      phone: user.phone,
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

// GET /api/auth/whatsapp-status — для админки/диагностики
router.get('/whatsapp-status', (req, res) => {
  res.json(whatsapp.status());
});

// POST /api/auth/update-username  { username }
router.post('/update-username', require('../middleware/auth').authRequired, async (req, res) => {
  const username = (req.body?.username || '').toString().trim();
  if (!/^[\w\dа-яА-Я_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'Ник 3–20 символов, без пробелов' });
  }
  try {
    const r = await db.query(
      'UPDATE users SET username=$1 WHERE id=$2 RETURNING id, username',
      [username, req.user.id]
    );
    res.json(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Ник занят' });
    throw e;
  }
});

module.exports = router;
