const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');

let wss = null;
const clients = new Set();

function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    let user = null;
    try {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      if (token) user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      /* гости тоже допускаются, просто не смогут писать в чат */
    }
    ws.user = user;
    clients.add(ws);

    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));

    ws.send(JSON.stringify({ type: 'hello', user: user ? { id: user.id, username: user.username } : null }));
  });

  return wss;
}

function broadcast(event) {
  const payload = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === 1) {
      try {
        client.send(payload);
      } catch {
        /* ignore */
      }
    }
  }
}

module.exports = { initWebSocket, broadcast };
