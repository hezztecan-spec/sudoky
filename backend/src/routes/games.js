const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { broadcast, sendToUser } = require('../ws');
const { sendPushToUser } = require('./push');

const router = express.Router();

// Создать вызов (challenge) — выбираешь игрока из онлайна
router.post('/challenge', authRequired, async (req, res) => {
  const { opponentId, gameType } = req.body || {};
  if (!opponentId || !gameType) return res.status(400).json({ error: 'opponentId и gameType обязательны' });
  if (!['tictactoe', 'battleship', 'wordle', 'reaction', 'memory'].includes(gameType)) {
    return res.status(400).json({ error: 'Неизвестный тип игры' });
  }
  if (opponentId === req.user.id) return res.status(400).json({ error: 'Нельзя вызвать себя' });

  const id = crypto.randomUUID().slice(0, 8);
  await db.query(
    `INSERT INTO game_sessions (id, game_type, player1_id, player2_id, status)
     VALUES ($1,$2,$3,$4,'pending')`,
    [id, gameType, req.user.id, opponentId]
  );

  // Уведомляем оппонента через WS
  sendToUser(opponentId, {
    type: 'challenge',
    sessionId: id,
    gameType,
    from: { id: req.user.id, username: req.user.username },
  });

  // Push-уведомление
  const gameNames = { tictactoe: 'Крестики-нолики', battleship: 'Морской бой', reaction: 'Реакция', memory: 'Память' };
  sendPushToUser(opponentId, {
    title: '⚔️ Вызов!',
    body: `${req.user.username} зовёт тебя в ${gameNames[gameType] || gameType}`,
    url: '/',
  }).catch(() => {});

  res.json({ sessionId: id });
});

// Принять вызов
router.post('/challenge/:id/accept', authRequired, async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM game_sessions WHERE id=$1 AND player2_id=$2 AND status='pending'`,
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Вызов не найден или уже обработан' });

  const session = rows[0];
  const initialState = getInitialState(session.game_type, session.player1_id, session.player2_id);

  await db.query(
    `UPDATE game_sessions SET status='running', state=$1, turn_user_id=$2 WHERE id=$3`,
    [JSON.stringify(initialState), initialState.turnUserId || session.player1_id, req.params.id]
  );

  // Уведомляем обоих
  broadcast({
    type: 'game_start',
    sessionId: req.params.id,
    gameType: session.game_type,
    player1: session.player1_id,
    player2: session.player2_id,
  });

  res.json({ ok: true, sessionId: req.params.id });
});

// Отклонить вызов
router.post('/challenge/:id/decline', authRequired, async (req, res) => {
  const { rows: sessionRows } = await db.query(
    `SELECT * FROM game_sessions WHERE id=$1 AND player2_id=$2 AND status='pending'`,
    [req.params.id, req.user.id]
  );
  if (!sessionRows[0]) return res.status(404).json({ error: 'Вызов не найден' });

  await db.query(
    `UPDATE game_sessions SET status='declined' WHERE id=$1`,
    [req.params.id]
  );

  sendToUser(sessionRows[0].player1_id, {
    type: 'challenge_declined',
    sessionId: req.params.id,
    by: { id: req.user.id, username: req.user.username },
  });

  res.json({ ok: true });
});

// Получить сессию
router.get('/session/:id', authRequired, async (req, res) => {
  const { rows } = await db.query(
    `SELECT gs.*, u1.username AS p1_name, u2.username AS p2_name
     FROM game_sessions gs
     JOIN users u1 ON u1.id=gs.player1_id
     LEFT JOIN users u2 ON u2.id=gs.player2_id
     WHERE gs.id=$1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Не найдено' });
  const s = rows[0];
  if (s.player1_id !== req.user.id && s.player2_id !== req.user.id) {
    return res.status(403).json({ error: 'Ты не участник' });
  }
  res.json(s);
});

// Сделать ход (универсальный)
router.post('/session/:id/move', authRequired, async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM game_sessions WHERE id=$1 AND status='running'`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Сессия не найдена или завершена' });
  const session = rows[0];

  if (session.player1_id !== req.user.id && session.player2_id !== req.user.id) {
    return res.status(403).json({ error: 'Не участник' });
  }

  const move = req.body?.move;
  if (move === undefined || move === null) return res.status(400).json({ error: 'move обязателен' });

  const result = processMove(session, req.user.id, move);
  if (result.error) return res.status(400).json({ error: result.error });

  if (result.finished) {
    await db.query(
      `UPDATE game_sessions SET state=$1, status='finished', winner_id=$2, turn_user_id=NULL, finished_at=NOW() WHERE id=$3`,
      [JSON.stringify(result.state), result.winnerId, req.params.id]
    );
    // Начислить очки (только в game_scores, не в users.total_points)
    if (result.winnerId) {
      const pts = getWinPoints(session.game_type);
      await db.query(
        `INSERT INTO game_scores (user_id, game_type, points, session_id) VALUES ($1,$2,$3,$4)`,
        [result.winnerId, session.game_type, pts, req.params.id]
      );
      // Монеты за победу
      await db.query('UPDATE users SET coins = coins + $1 WHERE id=$2', [Math.max(1, Math.round(pts / 3)), result.winnerId]);
    } else if (result.draw) {
      const pts = getDrawPoints(session.game_type);
      await db.query(`INSERT INTO game_scores (user_id, game_type, points, session_id) VALUES ($1,$2,$3,$4)`, [session.player1_id, session.game_type, pts, req.params.id]);
      await db.query(`INSERT INTO game_scores (user_id, game_type, points, session_id) VALUES ($1,$2,$3,$4)`, [session.player2_id, session.game_type, pts, req.params.id]);
      await db.query('UPDATE users SET coins = coins + 1 WHERE id=$1', [session.player1_id]);
      await db.query('UPDATE users SET coins = coins + 1 WHERE id=$2', [session.player2_id]);
    }
  } else {
    await db.query(
      `UPDATE game_sessions SET state=$1, turn_user_id=$2 WHERE id=$3`,
      [JSON.stringify(result.state), result.nextTurn, req.params.id]
    );
  }

  broadcast({
    type: 'game_move',
    sessionId: req.params.id,
    gameType: session.game_type,
    move,
    userId: req.user.id,
    state: result.state,
    finished: result.finished || false,
    winnerId: result.winnerId || null,
    draw: result.draw || false,
    nextTurn: result.nextTurn || null,
  });

  res.json({
    state: result.state,
    finished: result.finished || false,
    winnerId: result.winnerId || null,
    draw: result.draw || false,
    nextTurn: result.nextTurn || null,
  });
});

// Мини-чат в партии (быстрые эмодзи/сообщения)
router.post('/session/:id/chat', authRequired, async (req, res) => {
  const msg = String(req.body?.message || '').slice(0, 100);
  if (!msg) return res.status(400).json({ error: 'Пустое сообщение' });

  const { rows } = await db.query(`SELECT player1_id, player2_id FROM game_sessions WHERE id=$1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  if (rows[0].player1_id !== req.user.id && rows[0].player2_id !== req.user.id) {
    return res.status(403).json({ error: 'Не участник' });
  }

  broadcast({
    type: 'game_chat',
    sessionId: req.params.id,
    userId: req.user.id,
    username: req.user.username,
    message: msg,
  });

  res.json({ ok: true });
});

// Рейтинг по игре
router.get('/leaderboard/:gameType', async (req, res) => {
  const { rows } = await db.query(
    `SELECT u.id, u.username, u.avatar_color, u.picture,
            SUM(gs.points)::int AS total_points,
            COUNT(*)::int AS games_played
     FROM game_scores gs
     JOIN users u ON u.id=gs.user_id
     WHERE gs.game_type=$1
     GROUP BY u.id, u.username, u.avatar_color, u.picture
     ORDER BY total_points DESC
     LIMIT 50`,
    [req.params.gameType]
  );
  res.json(rows);
});

// === Логика игр ===

function getInitialState(gameType, p1, p2) {
  if (gameType === 'tictactoe') {
    return { board: Array(9).fill(null), turnUserId: p1 };
  }
  if (gameType === 'battleship') {
    // Морской бой: оба игрока сначала расставляют корабли, потом стреляют
    return {
      phase: 'setup', // setup | battle | finished
      turnUserId: p1,
      p1Board: null,  // будет заполнено после расстановки
      p2Board: null,
      p1Shots: [],    // [{x,y,hit}]
      p2Shots: [],
      p1Ready: false,
      p2Ready: false,
    };
  }
  return { turnUserId: p1 };
}

function processMove(session, userId, move) {
  if (session.game_type === 'tictactoe') return tttMove(session, userId, move);
  if (session.game_type === 'battleship') return battleshipMove(session, userId, move);
  return { error: 'Игра не поддерживает ходы через этот эндпоинт' };
}

function tttMove(session, userId, move) {
  const state = typeof session.state === 'string' ? JSON.parse(session.state) : session.state;
  const { board, turnUserId } = state;

  if (turnUserId !== userId) return { error: 'Не твой ход' };
  const idx = parseInt(move, 10);
  if (!(idx >= 0 && idx < 9)) return { error: 'Некорректный ход' };
  if (board[idx] !== null) return { error: 'Клетка занята' };

  const symbol = userId === session.player1_id ? 'X' : 'O';
  board[idx] = symbol;

  const winner = checkTTTWinner(board);
  if (winner) {
    const winnerId = winner === 'X' ? session.player1_id : session.player2_id;
    return { state: { board, turnUserId: null }, finished: true, winnerId };
  }
  if (board.every((c) => c !== null)) {
    return { state: { board, turnUserId: null }, finished: true, draw: true, winnerId: null };
  }

  const nextTurn = userId === session.player1_id ? session.player2_id : session.player1_id;
  return { state: { board, turnUserId: nextTurn }, nextTurn };
}

function checkTTTWinner(board) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

// === МОРСКОЙ БОЙ ===
// Корабли: 4,3,3,2,2,2,1,1,1,1 (всего 10 кораблей, 20 клеток)
const SHIP_SIZES = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

function validateBoard(board) {
  // board = массив 100 элементов: 0 = пусто, 1 = корабль
  if (!Array.isArray(board) || board.length !== 100) return false;
  if (board.some((c) => c !== 0 && c !== 1)) return false;

  // Находим корабли (связные компоненты по горизонтали/вертикали)
  const visited = new Set();
  const ships = [];

  for (let i = 0; i < 100; i++) {
    if (board[i] !== 1 || visited.has(i)) continue;
    const ship = [];
    const queue = [i];
    visited.add(i);
    while (queue.length) {
      const cur = queue.shift();
      ship.push(cur);
      const r = Math.floor(cur / 10);
      const c = cur % 10;
      const neighbors = [];
      if (c < 9) neighbors.push(cur + 1);
      if (c > 0) neighbors.push(cur - 1);
      if (r < 9) neighbors.push(cur + 10);
      if (r > 0) neighbors.push(cur - 10);
      for (const n of neighbors) {
        if (board[n] === 1 && !visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }
    ships.push(ship);
  }

  // Проверяем что корабли прямые (все в одной строке или одном столбце)
  for (const ship of ships) {
    const rows = ship.map((i) => Math.floor(i / 10));
    const cols = ship.map((i) => i % 10);
    const sameRow = rows.every((r) => r === rows[0]);
    const sameCol = cols.every((c) => c === cols[0]);
    if (!sameRow && !sameCol) return false;
  }

  // Проверяем что корабли не касаются по диагонали
  for (let i = 0; i < 100; i++) {
    if (board[i] !== 1) continue;
    const r = Math.floor(i / 10);
    const c = i % 10;
    const diags = [];
    if (r > 0 && c > 0) diags.push(i - 11);
    if (r > 0 && c < 9) diags.push(i - 9);
    if (r < 9 && c > 0) diags.push(i + 9);
    if (r < 9 && c < 9) diags.push(i + 11);
    for (const d of diags) {
      if (board[d] === 1) {
        // Проверяем что это не часть того же корабля (соседи по горизонтали/вертикали)
        const dr = Math.floor(d / 10);
        const dc = d % 10;
        const shareRow = (dr === r) && (Math.abs(dc - c) === 1);
        const shareCol = (dc === c) && (Math.abs(dr - r) === 1);
        if (!shareRow && !shareCol) return false;
      }
    }
  }

  // Проверяем размеры кораблей
  const sizes = ships.map((s) => s.length).sort((a, b) => b - a);
  const expected = [...SHIP_SIZES].sort((a, b) => b - a);
  if (sizes.length !== expected.length) return false;
  for (let i = 0; i < sizes.length; i++) {
    if (sizes[i] !== expected[i]) return false;
  }

  return true;
}

function battleshipMove(session, userId, move) {
  const state = typeof session.state === 'string' ? JSON.parse(session.state) : session.state;
  const isP1 = userId === session.player1_id;
  const isP2 = userId === session.player2_id;

  // Фаза расстановки
  if (state.phase === 'setup') {
    if (!move || !move.action) return { error: 'Нужен move.action' };

    if (move.action === 'place') {
      const board = move.board;
      if (!validateBoard(board)) return { error: 'Некорректная расстановка кораблей' };

      if (isP1) { state.p1Board = board; state.p1Ready = true; }
      else if (isP2) { state.p2Board = board; state.p2Ready = true; }
      else return { error: 'Не участник' };

      // Если оба готовы — переходим к бою
      if (state.p1Ready && state.p2Ready) {
        state.phase = 'battle';
        state.turnUserId = session.player1_id;
      }

      return { state, nextTurn: state.turnUserId };
    }

    return { error: 'В фазе setup допустим только action=place' };
  }

  // Фаза боя
  if (state.phase === 'battle') {
    if (state.turnUserId !== userId) return { error: 'Не твой ход' };

    const x = parseInt(move.x, 10);
    const y = parseInt(move.y, 10);
    if (!(x >= 0 && x < 10 && y >= 0 && y < 10)) return { error: 'Координаты 0-9' };

    const idx = y * 10 + x;
    const myShots = isP1 ? state.p1Shots : state.p2Shots;
    const enemyBoard = isP1 ? state.p2Board : state.p1Board;

    // Уже стреляли сюда?
    if (myShots.some((s) => s.x === x && s.y === y)) return { error: 'Уже стреляли сюда' };

    const hit = enemyBoard[idx] === 1;
    myShots.push({ x, y, hit });

    // Проверяем победу: все клетки кораблей противника поражены
    const enemyShipCells = enemyBoard.reduce((acc, v, i) => v === 1 ? acc + 1 : acc, 0);
    const hits = myShots.filter((s) => s.hit).length;

    if (hits >= enemyShipCells) {
      state.phase = 'finished';
      state.turnUserId = null;
      return { state, finished: true, winnerId: userId };
    }

    // Если попал — ещё ход, если мимо — ход переходит
    if (!hit) {
      state.turnUserId = isP1 ? session.player2_id : session.player1_id;
    }

    return { state, nextTurn: state.turnUserId };
  }

  return { error: 'Игра завершена' };
}

function getWinPoints(gameType) {
  const map = { tictactoe: 10, battleship: 30, wordle: 50, reaction: 20, memory: 20 };
  return map[gameType] || 10;
}

function getDrawPoints(gameType) {
  const map = { tictactoe: 3 };
  return map[gameType] || 0;
}

module.exports = router;
