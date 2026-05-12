const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { broadcast, sendToUser } = require('../ws');

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
  await db.query(
    `UPDATE game_sessions SET status='declined' WHERE id=$1 AND player2_id=$2 AND status='pending'`,
    [req.params.id, req.user.id]
  );
  const { rows } = await db.query(`SELECT player1_id FROM game_sessions WHERE id=$1`, [req.params.id]);
  if (rows[0]) {
    sendToUser(rows[0].player1_id, { type: 'challenge_declined', sessionId: req.params.id });
  }
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
    // Начислить очки
    if (result.winnerId) {
      const pts = getWinPoints(session.game_type);
      await db.query(
        `INSERT INTO game_scores (user_id, game_type, points, session_id) VALUES ($1,$2,$3,$4)`,
        [result.winnerId, session.game_type, pts, req.params.id]
      );
      await db.query(`UPDATE users SET total_points = total_points + $1 WHERE id=$2`, [pts, result.winnerId]);
    } else if (result.draw) {
      const pts = getDrawPoints(session.game_type);
      await db.query(`INSERT INTO game_scores (user_id, game_type, points, session_id) VALUES ($1,$2,$3,$4)`, [session.player1_id, session.game_type, pts, req.params.id]);
      await db.query(`INSERT INTO game_scores (user_id, game_type, points, session_id) VALUES ($1,$2,$3,$4)`, [session.player2_id, session.game_type, pts, req.params.id]);
      await db.query(`UPDATE users SET total_points = total_points + $1 WHERE id=$2`, [pts, session.player1_id]);
      await db.query(`UPDATE users SET total_points = total_points + $1 WHERE id=$2`, [pts, session.player2_id]);
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
  return { turnUserId: p1 };
}

function processMove(session, userId, move) {
  if (session.game_type === 'tictactoe') return tttMove(session, userId, move);
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

function getWinPoints(gameType) {
  const map = { tictactoe: 10, battleship: 30, wordle: 50, reaction: 20, memory: 20 };
  return map[gameType] || 10;
}

function getDrawPoints(gameType) {
  const map = { tictactoe: 3 };
  return map[gameType] || 0;
}

module.exports = router;
