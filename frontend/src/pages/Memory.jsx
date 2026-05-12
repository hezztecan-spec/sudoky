import { useState, useEffect, useRef } from 'react';
import { sfx } from '../sfx';

const EMOJIS = ['🐶', '🐱', '🐸', '🦊', '🐻', '🐼', '🐨', '🦁'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Memory() {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const lockRef = useRef(false);
  const timerRef = useRef(null);

  const init = () => {
    const pairs = shuffle([...EMOJIS, ...EMOJIS]);
    setCards(pairs);
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setStartTime(null);
    setElapsed(0);
    setDone(false);
  };

  useEffect(() => { init(); }, []);

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
          setDone(true);
          sfx.win();
        }
      } else {
        sfx.wrong();
        setTimeout(() => {
          setFlipped([]);
          lockRef.current = false;
        }, 800);
      }
    }
  };

  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="max-w-md mx-auto space-y-5 text-center">
      <div className="space-y-2">
        <p className="text-5xl">🃏</p>
        <h1 className="text-2xl font-bold">Память</h1>
        <p className="text-paper-600 text-sm">Найди все пары. Чем меньше ходов — тем лучше.</p>
      </div>

      <div className="flex justify-center gap-4 text-sm">
        <span className="chip">🕐 {m}:{s}</span>
        <span className="chip">Ходов: {moves}</span>
      </div>

      <div className="grid grid-cols-4 gap-2 max-w-[320px] mx-auto">
        {cards.map((emoji, idx) => {
          const isFlipped = flipped.includes(idx) || matched.has(idx);
          return (
            <button
              key={idx}
              onClick={() => flip(idx)}
              className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all duration-200
                ${isFlipped ? 'bg-white border-2 border-black scale-105' : 'bg-black text-transparent hover:bg-paper-800'}
                ${matched.has(idx) ? 'opacity-60' : ''}`}
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
          <button className="btn mt-2" onClick={init}>Ещё раз</button>
        </div>
      )}

      {!done && cards.length > 0 && (
        <button className="btn-ghost text-sm" onClick={init}>↻ Сбросить</button>
      )}
    </div>
  );
}
