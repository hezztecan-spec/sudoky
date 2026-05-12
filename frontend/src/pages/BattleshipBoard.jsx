import { useState, useCallback } from 'react';
import { api } from '../api';
import { sfx } from '../sfx';
import Confetti from '../components/Confetti';

const SHIP_SIZES = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
const COLS = 'АБВГДЕЖЗИК'.split('');

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
      <p className="text-5xl animate-wiggle">⚓</p>
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
  const [hoverCells, setHoverCells] = useState([]);

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
    for (const idx of cells) {
      const cr = Math.floor(idx / 10);
      const cc = idx % 10;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10) {
            const n = nr * 10 + nc;
            if (board[n] === 1 && !cells.includes(n)) return null;
          }
        }
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
    setHoverCells([]);
  };

  const handleHover = (idx) => {
    if (currentShip >= SHIP_SIZES.length) { setHoverCells([]); return; }
    const cells = canPlace(idx);
    setHoverCells(cells || []);
  };

  const reset = () => {
    setBoard(Array(100).fill(0));
    setCurrentShip(0);
    setHoverCells([]);
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
        <h2 className="text-lg font-bold">🚢 Расставь корабли</h2>
        {!allPlaced && (
          <p className="text-sm text-paper-600">
            Корабль: <span className="font-bold">{shipSize}</span> клеток ({currentShip + 1}/{SHIP_SIZES.length})
          </p>
        )}
        {allPlaced && <p className="text-sm text-emerald-600 font-medium">Все корабли расставлены ✓</p>}
      </div>

      {!allPlaced && (
        <div className="flex justify-center gap-2">
          <button className="btn-ghost text-sm" onClick={() => setHorizontal(!horizontal)}>
            🔄 {horizontal ? 'Горизонтально' : 'Вертикально'}
          </button>
        </div>
      )}

      <BattleGrid
        cells={board.map((v, i) => {
          if (v === 1) return 'ship';
          if (hoverCells.includes(i)) return 'hover';
          return 'empty';
        })}
        onCellClick={!allPlaced ? place : undefined}
        onCellHover={!allPlaced ? handleHover : undefined}
      />

      <div className="flex gap-2 justify-center">
        <button className="btn-ghost text-sm" onClick={reset}>↻ Сбросить</button>
        {allPlaced && (
          <button className="btn" onClick={submit} disabled={submitting}>
            {submitting ? '…' : 'В бой! ⚔️'}
          </button>
        )}
      </div>
      {error && <p className="text-center text-red-600 text-sm">{error}</p>}
    </div>
  );
}

function BattlePhase({ state, session, userId, sessionId, isP1, opponentName, onUpdate }) {
  const [error, setError] = useState('');
  const [lastShot, setLastShot] = useState(null);
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
      const res = await api.makeMove(sessionId, { x, y });
      setLastShot({ x, y });
      // Звуки
      const shotResult = res.state;
      const updatedShots = isP1 ? shotResult.p1Shots : shotResult.p2Shots;
      const thisShot = updatedShots[updatedShots.length - 1];
      if (thisShot?.hit) {
        sfx.explosion();
      } else {
        sfx.splash();
      }
      if (res.finished) {
        if (res.winnerId === userId) sfx.win();
      }
      onUpdate();
    } catch (e) {
      setError(e.message);
    }
  };

  // Вражеское поле
  const enemyDisplay = Array(100).fill('water');
  for (const s of myShots) {
    enemyDisplay[s.y * 10 + s.x] = s.hit ? 'hit' : 'miss';
  }

  // Моё поле
  const myDisplay = Array(100).fill('water');
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
        <div className={`text-center py-2 rounded-xl text-sm font-medium ${isMyTurn ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-paper-100 text-paper-600 dark:bg-paper-800'}`}>
          {isMyTurn ? '🎯 Твой ход — стреляй по вражескому полю!' : `⏳ ${opponentName} целится…`}
        </div>
      )}

      {finished && (
        <div className="card p-5 text-center space-y-2 animate-pop">
          <p className="text-4xl">{iWon ? '🏆' : '💀'}</p>
          <p className="text-lg font-bold">{iWon ? 'Победа! +30 pts' : 'Поражение'}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-xs font-bold text-center uppercase tracking-wider text-paper-600">🎯 Враг</p>
          <BattleGrid
            cells={enemyDisplay}
            onCellClick={!finished && isMyTurn ? shoot : undefined}
            interactive={!finished && isMyTurn}
          />
          <p className="text-xs text-center text-paper-500">
            Попаданий: {myShots.filter((s) => s.hit).length} · Промахов: {myShots.filter((s) => !s.hit).length}
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold text-center uppercase tracking-wider text-paper-600">🛡 Ты</p>
          <BattleGrid cells={myDisplay} />
        </div>
      </div>

      {error && <p className="text-center text-red-600 text-sm">{error}</p>}
    </div>
  );
}

function BattleGrid({ cells, onCellClick, onCellHover, interactive }) {
  const [hover, setHover] = useState(null);

  return (
    <div className="relative">
      {/* Заголовки колонок */}
      <div className="grid grid-cols-[16px_repeat(10,1fr)] gap-[1px] max-w-[320px] mx-auto mb-[1px]">
        <div />
        {COLS.map((c) => (
          <div key={c} className="text-[9px] text-center text-paper-500 font-medium">{c}</div>
        ))}
      </div>
      {/* Поле */}
      <div className="grid grid-cols-[16px_repeat(10,1fr)] gap-[1px] max-w-[320px] mx-auto">
        {Array.from({ length: 10 }).map((_, row) => (
          <div key={`row-${row}`} className="contents">
            <div className="text-[9px] flex items-center justify-center text-paper-500 font-medium">
              {row + 1}
            </div>
            {Array.from({ length: 10 }).map((_, col) => {
              const idx = row * 10 + col;
              const cell = cells[idx];
              const isHover = hover === idx;

              let bg = 'bg-sky-100 dark:bg-sky-900/30'; // вода
              let content = '';
              let extra = '';

              if (cell === 'ship') { bg = 'bg-paper-700 dark:bg-paper-300'; }
              else if (cell === 'hover') { bg = 'bg-emerald-200 dark:bg-emerald-800'; }
              else if (cell === 'hit') { bg = 'bg-red-500'; content = '🔥'; extra = 'animate-pop'; }
              else if (cell === 'miss') { bg = 'bg-sky-200 dark:bg-sky-800'; content = '·'; }
              else if (cell === 'water' && isHover && interactive) { bg = 'bg-sky-200 dark:bg-sky-700'; }

              return (
                <div
                  key={idx}
                  className={`aspect-square rounded-[3px] flex items-center justify-center text-[10px] cursor-pointer transition-all ${bg} ${extra}
                    ${interactive ? 'hover:ring-1 hover:ring-black/20' : ''}`}
                  onClick={() => onCellClick && onCellClick(idx)}
                  onMouseEnter={() => { setHover(idx); onCellHover && onCellHover(idx); }}
                  onMouseLeave={() => { setHover(null); onCellHover && onCellHover(-1); }}
                >
                  {content}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
