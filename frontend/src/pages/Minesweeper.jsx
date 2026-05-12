import { useState, useEffect } from 'react';
import { sfx } from '../sfx';
import Confetti from '../components/Confetti';

const LEVELS = [
  { name: 'Лёгкий', rows: 8, cols: 8, mines: 10 },
  { name: 'Средний', rows: 12, cols: 12, mines: 30 },
  { name: 'Сложный', rows: 16, cols: 16, mines: 60 },
];

function createBoard(rows, cols, mines, firstClick) {
  const total = rows * cols;
  const board = Array(total).fill(0);
  const exclude = new Set([firstClick]);
  // Исключаем соседей первого клика
  const fr = Math.floor(firstClick / cols), fc = firstClick % cols;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const nr = fr + dr, nc = fc + dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) exclude.add(nr * cols + nc);
  }

  let placed = 0;
  while (placed < mines) {
    const idx = Math.floor(Math.random() * total);
    if (board[idx] === -1 || exclude.has(idx)) continue;
    board[idx] = -1;
    placed++;
  }
  // Числа
  for (let i = 0; i < total; i++) {
    if (board[i] === -1) continue;
    const r = Math.floor(i / cols), c = i % cols;
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr * cols + nc] === -1) count++;
    }
    board[i] = count;
  }
  return board;
}

export default function Minesweeper() {
  const [level, setLevel] = useState(null);
  const [board, setBoard] = useState([]);
  const [revealed, setRevealed] = useState(new Set());
  const [flagged, setFlagged] = useState(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [firstClick, setFirstClick] = useState(true);

  const config = level !== null ? LEVELS[level] : null;

  useEffect(() => {
    if (!startTime || gameOver || won) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startTime, gameOver, won]);

  const startGame = (lvl) => {
    setLevel(lvl);
    const cfg = LEVELS[lvl];
    setBoard(Array(cfg.rows * cfg.cols).fill(0));
    setRevealed(new Set());
    setFlagged(new Set());
    setGameOver(false);
    setWon(false);
    setStartTime(null);
    setElapsed(0);
    setFirstClick(true);
  };

  const reveal = (idx) => {
    if (gameOver || won || flagged.has(idx) || revealed.has(idx)) return;

    let b = board;
    if (firstClick) {
      b = createBoard(config.rows, config.cols, config.mines, idx);
      setBoard(b);
      setFirstClick(false);
      setStartTime(Date.now());
    }

    if (b[idx] === -1) {
      // Бум
      setRevealed(new Set(Array.from({ length: b.length }, (_, i) => i)));
      setGameOver(true);
      sfx.wrong();
      return;
    }

    // Flood fill для пустых
    const newRevealed = new Set(revealed);
    const queue = [idx];
    while (queue.length) {
      const cur = queue.shift();
      if (newRevealed.has(cur)) continue;
      newRevealed.add(cur);
      if (b[cur] === 0) {
        const r = Math.floor(cur / config.cols), c = cur % config.cols;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < config.rows && nc >= 0 && nc < config.cols) {
            const ni = nr * config.cols + nc;
            if (!newRevealed.has(ni) && !flagged.has(ni)) queue.push(ni);
          }
        }
      }
    }
    setRevealed(newRevealed);
    sfx.tap();

    // Проверка победы
    const safe = b.length - config.mines;
    if (newRevealed.size >= safe) {
      setWon(true);
      sfx.win();
    }
  };

  const flag = (e, idx) => {
    e.preventDefault();
    if (gameOver || won || revealed.has(idx)) return;
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
    sfx.click();
  };

  if (level === null) {
    return (
      <div className="max-w-md mx-auto space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-5xl">💣</p>
          <h1 className="text-2xl font-bold">Сапёр</h1>
          <p className="text-paper-600 text-sm">Открой все клетки без мин. Долгий тап/правый клик = флаг.</p>
        </div>
        {LEVELS.map((l, i) => (
          <button key={i} onClick={() => startGame(i)}
            className="card p-4 w-full text-left hover:bg-paper-50 transition flex items-center justify-between">
            <div>
              <p className="font-bold">{l.name}</p>
              <p className="text-xs text-paper-500">{l.rows}×{l.cols} · {l.mines} мин</p>
            </div>
            <span className="text-paper-400">→</span>
          </button>
        ))}
      </div>
    );
  }

  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="max-w-lg mx-auto space-y-3 text-center">
      <Confetti show={won} />
      <div className="flex items-center justify-between">
        <button className="btn-ghost text-sm" onClick={() => setLevel(null)}>← Назад</button>
        <div className="flex gap-2">
          <span className="chip">🕐 {m}:{s}</span>
          <span className="chip">🚩 {flagged.size}/{config.mines}</span>
        </div>
      </div>

      <div className="overflow-auto">
        <div className="inline-grid gap-[2px] p-1 bg-paper-300 dark:bg-paper-700 rounded-xl"
          style={{ gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))` }}>
          {board.map((cell, idx) => {
            const isRevealed = revealed.has(idx);
            const isFlagged = flagged.has(idx);
            let content = '';
            let bg = 'bg-paper-400 dark:bg-paper-600 hover:bg-paper-500';

            if (isRevealed) {
              bg = 'bg-white dark:bg-paper-800';
              if (cell === -1) { content = '💣'; bg = 'bg-red-200 dark:bg-red-900'; }
              else if (cell > 0) content = cell;
            } else if (isFlagged) {
              content = '🚩';
            }

            const numColors = ['', 'text-blue-600', 'text-green-600', 'text-red-600', 'text-purple-700', 'text-amber-700', 'text-cyan-600', 'text-black', 'text-paper-500'];

            return (
              <button
                key={idx}
                onClick={() => reveal(idx)}
                onContextMenu={(e) => flag(e, idx)}
                onTouchStart={(e) => {
                  const t = setTimeout(() => flag(e, idx), 400);
                  e.target._longPress = t;
                }}
                onTouchEnd={(e) => clearTimeout(e.target._longPress)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-[3px] flex items-center justify-center text-xs sm:text-sm font-bold transition ${bg} ${numColors[cell] || ''}`}
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>

      {(gameOver || won) && (
        <div className="card p-4 space-y-2 animate-pop">
          <p className="text-xl font-bold">{won ? '🎉 Победа!' : '💥 Бум!'}</p>
          <p className="text-sm text-paper-600">{m}:{s}</p>
          <button className="btn" onClick={() => startGame(level)}>Ещё раз</button>
        </div>
      )}

      {!gameOver && !won && <button className="btn-ghost text-sm" onClick={() => startGame(level)}>↻ Заново</button>}
    </div>
  );
}
