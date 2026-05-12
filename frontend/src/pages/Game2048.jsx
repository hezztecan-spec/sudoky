import { useState, useEffect, useCallback } from 'react';
import { sfx } from '../sfx';
import Confetti from '../components/Confetti';

function createBoard() {
  const b = Array(16).fill(0);
  addRandom(b); addRandom(b);
  return b;
}

function addRandom(board) {
  const empty = board.reduce((acc, v, i) => v === 0 ? [...acc, i] : acc, []);
  if (empty.length === 0) return;
  const idx = empty[Math.floor(Math.random() * empty.length)];
  board[idx] = Math.random() < 0.9 ? 2 : 4;
}

function slide(row) {
  const filtered = row.filter((v) => v !== 0);
  const merged = [];
  let score = 0;
  for (let i = 0; i < filtered.length; i++) {
    if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
      merged.push(filtered[i] * 2);
      score += filtered[i] * 2;
      i++;
    } else {
      merged.push(filtered[i]);
    }
  }
  while (merged.length < 4) merged.push(0);
  return { row: merged, score };
}

function move(board, dir) {
  let newBoard = [...board];
  let totalScore = 0;
  let moved = false;

  for (let i = 0; i < 4; i++) {
    let row;
    if (dir === 'left') row = [newBoard[i*4], newBoard[i*4+1], newBoard[i*4+2], newBoard[i*4+3]];
    else if (dir === 'right') row = [newBoard[i*4+3], newBoard[i*4+2], newBoard[i*4+1], newBoard[i*4]];
    else if (dir === 'up') row = [newBoard[i], newBoard[i+4], newBoard[i+8], newBoard[i+12]];
    else row = [newBoard[i+12], newBoard[i+8], newBoard[i+4], newBoard[i]];

    const { row: slid, score } = slide(row);
    totalScore += score;

    if (dir === 'left') { for (let j = 0; j < 4; j++) newBoard[i*4+j] = slid[j]; }
    else if (dir === 'right') { for (let j = 0; j < 4; j++) newBoard[i*4+3-j] = slid[j]; }
    else if (dir === 'up') { for (let j = 0; j < 4; j++) newBoard[i+j*4] = slid[j]; }
    else { for (let j = 0; j < 4; j++) newBoard[i+(3-j)*4] = slid[j]; }
  }

  if (JSON.stringify(newBoard) !== JSON.stringify(board)) {
    moved = true;
    addRandom(newBoard);
  }

  return { board: newBoard, score: totalScore, moved };
}

function canMove(board) {
  if (board.includes(0)) return true;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const idx = i * 4 + j;
      if (j < 3 && board[idx] === board[idx + 1]) return true;
      if (i < 3 && board[idx] === board[idx + 4]) return true;
    }
  }
  return false;
}

const COLORS = {
  0: 'bg-paper-200 dark:bg-paper-700', 2: 'bg-paper-100 text-paper-800', 4: 'bg-amber-100 text-amber-900',
  8: 'bg-orange-300 text-white', 16: 'bg-orange-400 text-white', 32: 'bg-red-400 text-white',
  64: 'bg-red-500 text-white', 128: 'bg-yellow-400 text-white', 256: 'bg-yellow-500 text-white',
  512: 'bg-yellow-600 text-white', 1024: 'bg-amber-500 text-white', 2048: 'bg-amber-600 text-white',
};

export default function Game2048() {
  const [board, setBoard] = useState(createBoard);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem('2048_best') || '0', 10));
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const doMove = useCallback((dir) => {
    if (gameOver) return;
    const result = move(board, dir);
    if (!result.moved) return;
    setBoard(result.board);
    setScore((s) => s + result.score);
    sfx.tap();
    if (result.board.includes(2048) && !won) { setWon(true); sfx.win(); }
    if (!canMove(result.board)) { setGameOver(true); sfx.wrong(); }
  }, [board, gameOver, won]);

  useEffect(() => {
    if (score > best) { setBest(score); localStorage.setItem('2048_best', String(score)); }
  }, [score, best]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') doMove('left');
      else if (e.key === 'ArrowRight') doMove('right');
      else if (e.key === 'ArrowUp') doMove('up');
      else if (e.key === 'ArrowDown') doMove('down');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doMove]);

  // Свайпы
  useEffect(() => {
    let startX = 0, startY = 0;
    const onStart = (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; };
    const onEnd = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
      if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 'right' : 'left');
      else doMove(dy > 0 ? 'down' : 'up');
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    return () => { document.removeEventListener('touchstart', onStart); document.removeEventListener('touchend', onEnd); };
  }, [doMove]);

  const restart = () => { setBoard(createBoard()); setScore(0); setGameOver(false); setWon(false); };

  return (
    <div className="max-w-sm mx-auto space-y-4 text-center">
      <Confetti show={won} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">2048</h1>
        <div className="flex gap-2">
          <span className="chip font-bold">{score}</span>
          <span className="chip text-paper-500">🏆 {best}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 p-3 bg-paper-300 dark:bg-paper-700 rounded-2xl">
        {board.map((v, i) => (
          <div key={i} className={`aspect-square rounded-xl flex items-center justify-center font-bold text-lg sm:text-xl transition-all ${COLORS[v] || 'bg-purple-500 text-white'}`}>
            {v || ''}
          </div>
        ))}
      </div>

      {gameOver && (
        <div className="card p-5 space-y-2 animate-pop">
          <p className="text-xl font-bold">Game Over</p>
          <p className="text-paper-600">Счёт: {score}</p>
          <button className="btn" onClick={restart}>Ещё раз</button>
        </div>
      )}

      <p className="text-xs text-paper-500">Свайпай или стрелки на клавиатуре</p>
      <button className="btn-ghost text-sm" onClick={restart}>↻ Новая игра</button>
    </div>
  );
}
