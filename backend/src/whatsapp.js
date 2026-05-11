// Диспетчер WhatsApp-воркера.
// Сам WhatsApp-клиент работает на ноуте разработчика и подключается сюда
// по WebSocket как "воркер", аутентифицируясь по WORKER_SECRET.
// Когда бэку нужно отправить OTP — кладёт запрос в очередь и ждёт ответ.

const crypto = require('crypto');

const pending = new Map(); // jobId → { resolve, reject, timer }
let workerSocket = null;

function setWorker(ws) {
  if (workerSocket && workerSocket !== ws) {
    try { workerSocket.close(4000, 'replaced'); } catch { /* ignore */ }
  }
  workerSocket = ws;
  console.log('[whatsapp] воркер подключён');

  ws.on('close', () => {
    if (workerSocket === ws) workerSocket = null;
    console.warn('[whatsapp] воркер отключён');
  });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.type !== 'otp_result' || !msg.jobId) return;
    const entry = pending.get(msg.jobId);
    if (!entry) return;
    clearTimeout(entry.timer);
    pending.delete(msg.jobId);
    if (msg.ok) entry.resolve();
    else entry.reject(new Error(msg.error || 'WhatsApp worker error'));
  });
}

function isReady() {
  return !!workerSocket && workerSocket.readyState === 1;
}

function sendOtp(phone, code) {
  return new Promise((resolve, reject) => {
    if (!isReady()) {
      return reject(new Error('WhatsApp-воркер не подключён. Запусти sender у себя на ноуте.'));
    }
    const jobId = crypto.randomUUID();
    const timer = setTimeout(() => {
      pending.delete(jobId);
      reject(new Error('Таймаут отправки OTP'));
    }, 20000);
    pending.set(jobId, { resolve, reject, timer });
    workerSocket.send(JSON.stringify({ type: 'send_otp', jobId, phone, code }));
  });
}

function status() {
  return { ready: isReady() };
}

module.exports = { setWorker, sendOtp, status, isReady };
