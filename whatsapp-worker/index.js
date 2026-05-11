// Локальный WhatsApp-воркер.
// Подключается к удалённому бэку по WebSocket и отправляет OTP по команде.
// Запускать на ноуте/десктопе, где установлен Chromium и открыт WhatsApp.
//
// Требования:
//   BACKEND_WS   = wss://<твой-бэк>.onrender.com/ws/worker
//   WORKER_SECRET = тот же, что у бэка
//
// Запуск: npm install && npm start
// При первом запуске в консоль выведется QR-код — отсканируй его в WhatsApp
// (Настройки → Связанные устройства → Привязать устройство).

require('dotenv').config();
const WebSocket = require('ws');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');

const BACKEND_WS = process.env.BACKEND_WS;
const WORKER_SECRET = process.env.WORKER_SECRET;

if (!BACKEND_WS || !WORKER_SECRET) {
  console.error('✗ Не заданы BACKEND_WS и/или WORKER_SECRET (см. .env.example)');
  process.exit(1);
}

// === WhatsApp клиент ===
let waReady = false;

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'sudoku-championship',
    dataPath: path.join(__dirname, '.wwebjs_auth'),
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

client.on('qr', (qr) => {
  console.log('\n[whatsapp] Отсканируй QR в WhatsApp (Настройки → Связанные устройства):');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  waReady = true;
  console.log('[whatsapp] ✓ готов');
});

client.on('authenticated', () => console.log('[whatsapp] сессия сохранена'));
client.on('auth_failure', (msg) => console.error('[whatsapp] auth_failure:', msg));
client.on('disconnected', (reason) => {
  waReady = false;
  console.warn('[whatsapp] отключён:', reason);
  setTimeout(() => client.initialize().catch(console.error), 5000);
});

client.initialize().catch((err) => {
  console.error('[whatsapp] init failed:', err);
  process.exit(1);
});

async function sendOtp(phone, code) {
  if (!waReady) throw new Error('WhatsApp ещё не готов');
  const number = String(phone).replace(/\D/g, '');
  const chatId = `${number}@c.us`;

  try {
    const numberId = await client.getNumberId(number);
    if (!numberId) throw new Error('Номер не зарегистрирован в WhatsApp');
  } catch (e) {
    // если проверка упала — логируем и пробуем отправить
    console.warn('[whatsapp] getNumberId:', e.message);
  }

  const message =
    `🧩 sudoku.лето\n` +
    `Код для входа: *${code}*\n\n` +
    `Код действителен 5 минут. Если это был не ты — проигнорируй.`;

  await client.sendMessage(chatId, message);
}

// === Соединение с бэком ===
let ws = null;
let reconnectTimer = null;

function connect() {
  const url = `${BACKEND_WS}?secret=${encodeURIComponent(WORKER_SECRET)}`;
  console.log(`[worker] подключение к ${BACKEND_WS}…`);
  ws = new WebSocket(url);

  ws.on('open', () => console.log('[worker] ✓ подключён к бэку'));

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === 'send_otp') {
      const { jobId, phone, code } = msg;
      try {
        await sendOtp(phone, code);
        ws.send(JSON.stringify({ type: 'otp_result', jobId, ok: true }));
        console.log(`[worker] OTP отправлен на ${phone}`);
      } catch (e) {
        ws.send(JSON.stringify({ type: 'otp_result', jobId, ok: false, error: e.message }));
        console.error(`[worker] ошибка отправки на ${phone}:`, e.message);
      }
    }
  });

  ws.on('close', (code, reason) => {
    console.warn(`[worker] соединение закрыто (${code} ${reason}). Переподключение через 5 сек…`);
    reconnectTimer = setTimeout(connect, 5000);
  });

  ws.on('error', (err) => {
    console.error('[worker] ws error:', err.message);
  });
}

connect();

process.on('SIGINT', () => {
  console.log('\n[worker] выхожу…');
  clearTimeout(reconnectTimer);
  try { ws && ws.close(); } catch {}
  try { client.destroy(); } catch {}
  process.exit(0);
});
