const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const whatsapp = require('./whatsapp');

let wssClients = null;
let wssWorker = null;
const clients = new Set();

function initWebSocket(server) {
  // Основной канал для UI (лидерборд, чат)
  wssClients = new WebSocketServer({ noServer: true });
  // Канал для WhatsApp-воркера (локальный скрипт у разработчика)
  wssWorker = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname === '/ws/worker') {
      const secret = url.searchParams.get('secret');
      if (!process.env.WORKER_SECRET || secret !== process.env.WORKER_SECRET) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      wssWorker.handleUpgrade(req, socket, head, (ws) => {
        whatsapp.setWorker(ws);
      });
      return;
    }

    if (url.pathname === '/ws') {
      wssClients.handleUpgrade(req, socket, head, (ws) => {
        let user = null;
        try {
          const token = url.searchParams.get('token');
          if (token) user = jwt.verify(token, process.env.JWT_SECRET);
        } catch { /* гости тоже допускаются */ }
        ws.user = user;
        clients.add(ws);
        ws.on('close', () => clients.delete(ws));
        ws.on('error', () => clients.delete(ws));
        ws.send(JSON.stringify({
          type: 'hello',
          user: user ? { id: user.id, username: user.username } : null,
        }));
      });
      return;
    }

    socket.destroy();
  });
}

function broadcast(event) {
  const payload = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === 1) {
      try { client.send(payload); } catch { /* ignore */ }
    }
  }
}

module.exports = { initWebSocket, broadcast };
