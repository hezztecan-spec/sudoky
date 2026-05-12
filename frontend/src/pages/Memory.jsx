import { useState, useEffect, useRef } from 'react';
import { sfx } from '../sfx';
import { api } from '../api';
import { sendStatus } from '../useStatus';
import Confetti from '../components/Confetti';

const EMOJI_SETS = ['🐶','🐱','🐸','🦊','🐻','🐼','🐨','🦁','🐯','🐮','🐷','🐵','🦄','🐙','🦋','🐢'];

const LEVELS = [
  { name: 'Лёгкий', pairs: 6, cols: 4 },
  { name: 'Средний', pairs: 8, cols: 4 },
  { name: 'Сложный', pairs: 12, cols: 6 },
  { name: 'Экстрим', pairs: 16, cols: 8 },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Memory() {
  const [level, setLevel] = useState(null);
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [points, setPoints] = useState(null);
  const lockRef = useRef(false);
  const timerRef = useRef(null);

  const config = level !== null ? LEVELS[level] : null;

  const startGame = (lvl) => {
    const cfg = LEVELS[lvl];
    setLevel(lvl);
    const emojis = shuffle(EMOJI_SETS).slice(0, cfg.pairs);
    setCards(shuffle([...emojis, ...emojis]));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setStartTime(null);
    setElapsed(0);
    setDone(false);
    setPoints(null);
    sendStatus('играет в память 🃏');
  };

  useEffect(() => {
    if (!startTime || done) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(timerRef.current);
  }, [startTime, done]);

  const flip = (idx) => {
    if (lockRef.current || flipped.includes(idx) || matched.has(idx) || done) return;
    if (!startTime) setStartTime(Date.now());

    sfx.tap();
    const next = [...flipped, idx];
    setFlipped(next);

    if (next.length === 2) {
      setMoves((m) => m + 1);
      lockRef.current = true;
      const [a, b] = next;
      if (cards[a] === cards[b]) {
        sfx.correct();
        const newMatched = new Set(matched);
        newMatched.add(a);
        newMatched.add(b);
        setMatched(newMatched);
        setFlipped([]);
        lockRef.current = false;
        if (newMatched.size === cards.length) {
          finishGame(moves + 1);
        }
      } else {
        sfx.wrong();
        setTimeout(() => {
          setFlipped([]);
          lockRef.current = false;
        }, 700);
      }
    }
  };

  const finishGame = async (totalMoves) => {
    setDone(true);
    sfx.win();
    sendStatus(null);
    const secs = Math.floor((Date.now() - startTime) / 1000);
    try {
      const res = await api.submitMemory(totalMoves, secs, config.pairs);
      setPoints(res.points);
    } catch {}
  };

  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');

  if (level === null) {
    return (
      <div className="max-w-md mx-auto space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-5xl">🃏</p>
          <h1 className="text-2xl font-bold">Память</h1>
          <p className="text-paper-600 text-sm">Найди все пары. Чем меньше ходов — тем больше очков.</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-paper-700">Выбери уровень:</p>
          {LEVELS.map((l, i) => (
            <button key={i} onClick={() => startGame(i)}
              className="card p-4 w-full text-left hover:bg-paper-50 transition flex items-center justify-between">
              <div>
                <p className="font-bold">{l.name}</p>
                <p className="text-xs text-paper-500">{l.pairs} пар · {l.cols} колонок</p>
              </div>
              <span className="text-paper-400">→</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 text-center">
      <Confetti show={done} />

      <div className="flex items-center justify-between">
        <button className="btn-ghost text-sm" onClick={() => { setLevel(null); sendStatus(null); }}>← Назад</button>
        <div className="flex gap-2">
          <span className="chip">🕐 {m}:{s}</span>
          <span className="chip">Ходов: {moves}</span>
        </div>
      </div>

      <div className={`grid gap-2 mx-auto`} style={{ gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))`, maxWidth: `${config.cols * 56}px` }}>
        {cards.map((emoji, idx) => {
          const isFlipped = flipped.includes(idx) || matched.has(idx);
          return (
            <button
              key={idx}
              onClick={() => flip(idx)}
              className={`aspect-square rounded-xl text-xl sm:text-2xl flex items-center justify-center transition-all duration-200
                ${isFlipped ? 'bg-white border-2 border-black scale-105 dark:bg-paper-800 dark:border-white' : 'bg-black text-transparent hover:bg-paper-800 dark:bg-white dark:hover:bg-paper-200'}
                ${matched.has(idx) ? 'opacity-50' : ''}`}
            >
              {isFlipped ? emoji : '?'}
            </button>
          );
        })}
      </div>

      {done && (
        <div className="card p-5 space-y-2 animate-pop">
          <p className="text-3xl">🎉</p>
          <p className="text-lg font-bold">Все пары найдены!</p>
          <p className="text-sm text-paper-600">{moves} ходов · {m}:{s}</p>
          {points && <p className="text-lg font-bold text-emerald-600">+{points} pts</p>}
          <div className="flex gap-2 justify-center pt-2">
            <button className="btn-ghost" onClick={() => setLevel(null)}>Уровни</button>
            <button className="btn" onClick={() => startGame(level)}>Ещё раз</button>
          </div>
        </div>
      )}

      {!done && (
        <button className="btn-ghost text-sm" onClick={() => startGame(level)}>↻ Сбросить</button>
      )}
    </div>
  );
}
