import { useState, useRef, useCallback } from 'react';
import { sfx } from '../sfx';

const ROUNDS = 5;

export default function Reaction() {
  const [phase, setPhase] = useState('idle'); // idle | waiting | go | result | done
  const [round, setRound] = useState(0);
  const [times, setTimes] = useState([]);
  const [tooEarly, setTooEarly] = useState(false);
  const goTime = useRef(0);
  const timer = useRef(null);

  const start = () => {
    setPhase('waiting');
    setTooEarly(false);
    const delay = 1500 + Math.random() * 3000; // 1.5–4.5 сек
    timer.current = setTimeout(() => {
      goTime.current = Date.now();
      setPhase('go');
    }, delay);
  };

  const tap = () => {
    if (phase === 'waiting') {
      clearTimeout(timer.current);
      setTooEarly(true);
      setPhase('idle');
      return;
    }
    if (phase === 'go') {
      const ms = Date.now() - goTime.current;
      sfx.correct();
      const newTimes = [...times, ms];
      setTimes(newTimes);
      if (newTimes.length >= ROUNDS) {
        setPhase('done');
      } else {
        setRound(round + 1);
        setPhase('result');
      }
    }
  };

  const next = () => start();

  const reset = () => {
    setPhase('idle');
    setRound(0);
    setTimes([]);
    setTooEarly(false);
  };

  const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

  return (
    <div className="max-w-md mx-auto space-y-6 text-center">
      <div className="space-y-2">
        <p className="text-5xl">⚡</p>
        <h1 className="text-2xl font-bold">Реакция</h1>
        <p className="text-paper-600 text-sm">Нажми как можно быстрее когда экран станет зелёным. {ROUNDS} раундов.</p>
      </div>

      {phase === 'idle' && (
        <div className="space-y-3">
          {tooEarly && <p className="text-red-600 text-sm font-medium">Слишком рано! Жди зелёный.</p>}
          <button className="btn w-full py-4 text-lg" onClick={start}>
            {times.length === 0 ? 'Начать' : 'Следующий раунд'}
          </button>
          {times.length > 0 && <p className="text-sm text-paper-600">Раунд {times.length}/{ROUNDS}</p>}
        </div>
      )}

      {phase === 'waiting' && (
        <button
          className="w-full aspect-[2/1] rounded-2xl bg-red-500 text-white text-xl font-bold flex items-center justify-center active:scale-[0.98] transition"
          onClick={tap}
        >
          Жди…
        </button>
      )}

      {phase === 'go' && (
        <button
          className="w-full aspect-[2/1] rounded-2xl bg-emerald-500 text-white text-xl font-bold flex items-center justify-center active:scale-[0.98] transition animate-pop"
          onClick={tap}
        >
          ЖМИИ!
        </button>
      )}

      {phase === 'result' && (
        <div className="space-y-3">
          <div className="card p-5">
            <p className="text-3xl font-bold">{times[times.length - 1]} мс</p>
            <p className="text-sm text-paper-600">Раунд {times.length}/{ROUNDS}</p>
          </div>
          <button className="btn w-full" onClick={next}>Следующий</button>
        </div>
      )}

      {phase === 'done' && (
        <div className="card p-6 space-y-3 animate-pop">
          <p className="text-4xl">🏁</p>
          <p className="text-2xl font-bold">{avg} мс</p>
          <p className="text-sm text-paper-600">Среднее время за {ROUNDS} раундов</p>
          <div className="text-xs text-paper-500 space-y-0.5">
            {times.map((t, i) => <span key={i} className="inline-block mr-2">R{i + 1}: {t}мс</span>)}
          </div>
          <button className="btn mt-3" onClick={reset}>Ещё раз</button>
        </div>
      )}
    </div>
  );
}
