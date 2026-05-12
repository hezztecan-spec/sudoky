// Компонент игрового поля морского боя (используется в GameRoom)
import { useState, useCallback } from 'react';
import { api } from '../api';
import { sfx } from '../sfx';
import Confetti from '../components/Confetti';

const SHIP_SIZES = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

export default function BattleshipBoard({ session, userId, sessionId, onUpdate }) {
  const state = typeof session.state === 'string' ? JSON.parse(session.state) : session.state;
  const isP1 = session.player1_id === userId;
  const opponentName = isP1 ? session.p2_name : session.p1_name;

  if (state.phase === 'setup') {
    const myReady = isP1 ? state.p1Ready : state.p2Ready;
    if (myReady) return <WaitingForOpponent opponentName={opponentName} />;
    return <SetupPhase sessionId={sessionId} onUpdate={onUpdate} />;
  }

  if (state.phase === 'battle' || state.phase === 'finished') {
    return (
      <BattlePhase
        state={state}
        session={session}
        userId={userId}
        sessionId={sessionId}
        isP1={isP1}
        opponentName={opponentName}
        onUpdate={onUpdate}
      />
    );
  }

  return null;
}

function WaitingForOpponent({ opponentName }) {
  return (
    <div className="text-center space-y-3 py-10">
      <p className="text-4xl animate-wiggle">⏳</p>
      <p className="text-lg font-bold">Ждём {opponentName}…</p>
      <p className="text-sm text-paper-600">Соперник расставляет корабли</p>
    </div>
  );
}

function SetupPhase({ sessionId, onUpdate }) {
  const [board, setBoard] = useState(Array(100).fill(0));
  const [currentShip, setCurrentShip] = useState(0);
  const [horizontal, setHorizontal] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const shipSize = SHIP_SIZES[currentShip] || 0;

  const canPlace = (startIdx) => {
    const r = Math.floor(startIdx / 10);
    const c = startIdx % 10;
    const cells = [];
    for (let i = 0; i < shipSize; i++) {
      const nr = horizontal ? r : r + i;
      const nc = horizontal ? c + i : c;
      if (nr >= 10 || nc >= 10) return null;
      const idx = nr * 10 + nc;
      if (board[idx] !== 0) return null;
      cells.push(idx);
    }
    // Проверяем окружение (нет соседних кораблей по диагонали)
    for (const idx of cells) {
      const cr = Math.floor(idx / 10);
      const cc = idx % 10;
      const neighbors = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10) neighbors.push(nr * 10 + nc);
        }
      }
      for (const n of neighbors) {
        if (board[n] === 1 && !cells.includes(n)) return null;
      }
    }
    return cells;
  };

  const place = (startIdx) => {
    const cells = canPlace(startIdx);
    if (!cells) return;
    const next = [...board];
    for (const c of cells) next[c] = 1;
    setBoard(next);
    setCurrentShip(currentShip + 1);
    sfx.tap();
  };

  const reset = () => {
    setBoard(Array(100).fill(0));
    setCurrentShip(0);
  };

  const submit = async () => {
    setError('');
    setSubmitting(true);
    try {
      await api.makeMove(sessionId, { action: 'place', board });
      sfx.correct();
      onUpdate();
    } catch (e) {
      setError(e.message);
    }
    setSubmitting(false);
  };

  const allPlaced = currentShip >= SHIP_SIZES.length;

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold">Расставь корабли</h2>
        {!allPlaced && (
          <p className="text-sm text-paper-600">
            Корабль: {shipSize} клеток ({currentShip + 1}/{SHIP_SIZES.length})
          </p>
        )}
      </div>

      {!allPlaced && (
        <div className="flex justify-center">
          <button className="btn-ghost text-sm" onClick={() => setHorizontal(!horizontal)}>
            🔄 {horizontal ? 'Горизонтально' : 'Вертикально'}
          </button>
        </div>
      )}

      <Grid10
        cells={board}
        onCellClick={!allPlaced ? place : undefined}
        highlightFn={!allPlaced ? (idx) => {
          const cells = canPlace(idx);
          return cells ? 'bg-paper-300' : '';
        } : undefined}
      />

      <div className="flex gap-2 justify-center">
        <button className="btn-ghost text-sm" onClick={reset}>↻ Сбросить</button>
        {allPlaced && (
          <button className="btn" onClick={submit} disabled={submitting}>
            {submitting ? '…' : 'Готово!'}
          </button>
        )}
      </div>
      {error && <p className="text-center text-red-600 text-sm">{error}</p>}
    </div>
  );
}

function BattlePhase({ state, session, userId, sessionId, isP1, opponentName, onUpdate }) {
  const [error, setError] = useState('');
  const myShots = isP1 ? state.p1Shots : state.p2Shots;
  const enemyShots = isP1 ? state.p2Shots : state.p1Shots;
  const myBoard = isP1 ? state.p1Board : state.p2Board;
  const isMyTurn = state.turnUserId === userId;
  const finished = state.phase === 'finished' || session.status === 'finished';
  const iWon = finished && session.winner_id === userId;

  const shoot = async (idx) => {
    if (!isMyTurn || finished) return;
    const x = idx % 10;
    const y = Math.floor(idx / 10);
    if (myShots.some((s) => s.x === x && s.y === y)) return;
    setError('');
    try {
      await api.makeMove(sessionId, { x, y });
      sfx.tap();
      onUpdate();
    } catch (e) {
      setError(e.message);
    }
  };

  // Строим отображение вражеского поля (только выстрелы)
  const enemyDisplay = Array(100).fill('empty');
  for (const s of myShots) {
    enemyDisplay[s.y * 10 + s.x] = s.hit ? 'hit' : 'miss';
  }

  // Моё поле (мои корабли + выстрелы врага)
  const myDisplay = Array(100).fill('empty');
  if (myBoard) {
    for (let i = 0; i < 100; i++) {
      if (myBoard[i] === 1) myDisplay[i] = 'ship';
    }
  }
  for (const s of enemyShots) {
    const idx = s.y * 10 + s.x;
    myDisplay[idx] = s.hit ? 'hit' : 'miss';
  }

  return (
    <div className="space-y-4">
      <Confetti show={iWon} />

      {!finished && (
        <p className={`text-center text-sm font-medium ${isMyTurn ? 'text-black' : 'text-paper-500'}`}>
          {isMyTurn ? '🎯 Твой ход — стреляй!' : `⏳ Ход ${opponentName}…`}
        </p>
      )}

      {finished && (
        <div className="card p-5 text-center space-y-2 animate-pop">
          <p className="text-3xl">{iWon ? '🏆' : '💀'}</p>
          <p className="text-lg font-bold">{iWon ? 'Победа! +30 pts' : 'Поражение'}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-center text-paper-600">Враг</p>
          <Grid10
            cells={enemyDisplay}
            onCellClick={!finished && isMyTurn ? shoot : undefined}
            mode="attack"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-center text-paper-600">Ты</p>
          <Grid10 cells={myDisplay} mode="defense" />
        </div>
      </div>

      {error && <p className="text-center text-red-600 text-sm">{error}</p>}
    </div>
  );
}

function Grid10({ cells, onCellClick, mode, highlightFn }) {
  const [hover, setHover] = useState(null);

  return (
    <div className="grid grid-cols-10 gap-[2px] max-w-[320px] mx-auto bg-paper-300 p-[2px] rounded-lg">
      {cells.map((cell, idx) => {
        let bg = 'bg-white';
        if (mode === 'attack') {
          if (cell === 'hit') bg = 'bg-red-400';
          else if (cell === 'miss') bg = 'bg-paper-200';
        } else if (mode === 'defense') {
          if (cell === 'ship') bg = 'bg-paper-700';
          else if (cell === 'hit') bg = 'bg-red-400';
          else if (cell === 'miss') bg = 'bg-blue-100';
        } else {
          // setup
          if (cell === 1) bg = 'bg-black';
          if (highlightFn && hover === idx) {
            const h = highlightFn(idx);
            if (h) bg = h;
          }
        }

        return (
          <div
            key={idx}
            className={`aspect-square ${bg} rounded-sm cursor-pointer transition-colors text-[8px] flex items-center justify-center`}
            onClick={() => onCellClick && onCellClick(idx)}
            onMouseEnter={() => setHover(idx)}
            onMouseLeave={() => setHover(null)}
          >
            {mode === 'attack' && cell === 'hit' && '💥'}
            {mode === 'attack' && cell === 'miss' && '·'}
            {mode === 'defense' && cell === 'hit' && '💥'}
            {mode === 'defense' && cell === 'miss' && '·'}
          </div>
        );
      })}
    </div>
  );
}
