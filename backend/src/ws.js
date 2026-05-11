const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const whatsapp = require('./whatsapp');

let wssClients = null;
let wssWorker = null;
const clients = new Set();
const online = new Map(); // userId -> { username, count }

function initWebSocket(server) {
  wssClients = new WebSocketServer({ noServer: true });
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

        if (user) {
          const cur = online.get(user.id) || { username: user.username, count: 0 };
          cur.count += 1;
          cur.username = user.username;
          online.set(user.id, cur);
          broadcastOnline();
        }

        ws.on('close', () => {
          clients.delete(ws);
          if (user) {
            const cur = online.get(user.id);
            if (cur) {
              cur.count -= 1;
              if (cur.count <= 0) online.delete(user.id);
              broadcastOnline();
            }
          }
        });
        ws.on('error', () => clients.delete(ws));

        ws.send(JSON.stringify({
          type: 'hello',
          user: user ? { id: user.id, username: user.username } : null,
        }));
        ws.send(JSON.stringify({ type: 'online_list', online: onlinePayload() }));
      });
      return;
    }

    socket.destroy();
  });
}

function onlinePayload() {
  return Array.from(online.entries()).map(([id, v]) => ({ id, username: v.username }));
}

function broadcastOnline() {
  broadcast({ type: 'online_list', online: onlinePayload() });
}

function broadcast(event) {
  const payload = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === 1) {
      try { client.send(payload); } catch { /* ignore */ }
    }
  }
}

function getOnline() { return onlinePayload(); }

module.exports = { initWebSocket, broadcast, getOnline };
