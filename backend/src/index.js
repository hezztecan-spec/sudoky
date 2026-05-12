require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');

const db = require('./db');
const { initWebSocket } = require('./ws');
const { ensureCatalog } = require('./utils/achievements');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const puzzleRoutes = require('./routes/puzzles');
const leaderboardRoutes = require('./routes/leaderboard');
const achievementRoutes = require('./routes/achievements');
const dailyTaskRoutes = require('./routes/dailyTasks');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const statsRoutes = require('./routes/stats');
const duelsRoutes = require('./routes/duels');
const gamesRoutes = require('./routes/games');
const wordleRoutes = require('./routes/wordle');
const friendsRoutes = require('./routes/friends');
const feedRoutes = require('./routes/feed');
const minigamesRoutes = require('./routes/minigames');

const app = express();
app.use(cors({
  origin: (origin, cb) => cb(null, true), // при необходимости заменить на whitelist
  credentials: false,
}));
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api/puzzles', puzzleRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/daily-tasks', dailyTaskRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/duels', duelsRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/wordle', wordleRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/minigames', minigamesRoutes);

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal error' });
});

const server = http.createServer(app);
initWebSocket(server);

const PORT = process.env.PORT || 4000;

async function start() {
  await ensureCatalog();
  server.listen(PORT, () => {
    console.log(`🧩 backend on :${PORT}`);
    console.log(`🔌 WhatsApp-воркер подключится к ws://…/ws/worker когда запустишь его на ноуте`);
  });
}

start().catch((err) => {
  console.error('start failed', err);
  process.exit(1);
});
