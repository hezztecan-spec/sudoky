import { useState, useRef } from 'react';
import { sfx } from '../sfx';
import { api } from '../api';
import { sendStatus } from '../useStatus';
import Confetti from '../components/Confetti';

const LEVELS = [
  { name: 'Лёгкий', rounds: 3, minDelay: 2000, maxDelay: 4000 },
  { name: 'Средний', rounds: 5, minDelay: 1500, maxDelay: 3500 },
  { name: 'Сложный', rounds: 7, minDelay: 1000, maxDelay: 3000 },
  { name: 'Экстрим', rounds: 10, minDelay: 800, maxDelay: 2500 },
];

export default function Reaction() {
  const [level, setLevel] = useState(null);
  const [phase, setPhase] = useState('menu'); // menu | waiting | go | result | done
  const [round, setRound] = useState(0);
  const [times, setTimes] = useState([]);
  const [tooEarly, setTooEarly] = useState(false);
  const [points, setPoints] = useState(null);
  const goTime = useRef(0);
  const timer = useRef(null);

  const config = level !== null ? LEVELS[level] : null;

  const startGame = (lvl) => {
    setLevel(lvl);
    setPhase('idle');
    setRound(0);
    setTimes([]);
    setTooEarly(false);
    setPoints(null);
    sendStatus('играет в реакцию ⚡');
  };

  const startRound = () => {
    setPhase('waiting');
    setTooEarly(false);
    const delay = config.minDelay + Math.random() * (config.maxDelay - config.minDelay);
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
      sfx.wrong();
      return;
    }
    if (phase === 'go') {
      const ms = Date.now() - goTime.current;
      sfx.correct();
      const newTimes = [...times, ms];
      setTimes(newTimes);
      if (newTimes.length >= config.rounds) {
        finishGame(newTimes);
      } else {
        setRound(round + 1);
        setPhase('result');
      }
    }
  };

  const finishGame = async (allTimes) => {
    setPhase('done');
    const avg = Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length);
    sfx.win();
    sendStatus(null);
    try {
      const res = await api.submitReaction(avg);
      setPoints(res.points);
    } catch {}
  };

  const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

  if (phase === 'menu') {
    return (
      <div className="max-w-md mx-auto space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-5xl">⚡</p>
          <h1 className="text-2xl font-bold">Реакция</h1>
          <p className="text-paper-600 text-sm">Нажми как можно быстрее когда экран станет зелёным.</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-paper-700">Выбери уровень:</p>
          {LEVELS.map((l, i) => (
            <button key={i} onClick={() => startGame(i)}
              className="card p-4 w-full text-left hover:bg-paper-50 transition flex items-center justify-between">
              <div>
                <p className="font-bold">{l.name}</p>
                <p className="text-xs text-paper-500">{l.rounds} раундов</p>
              </div>
              <span className="text-paper-400">→</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6 text-center">
      <Confetti show={phase === 'done'} />
      <div className="flex items-center justify-between">
        <button className="btn-ghost text-sm" onClick={() => { setPhase('menu'); sendStatus(null); }}>← Назад</button>
        <span className="chip">{config.name} · {times.length}/{config.rounds}</span>
      </div>

      {(phase === 'idle' || phase === 'result') && (
        <div className="space-y-3">
          {tooEarly && <p className="text-red-600 text-sm font-medium">Слишком рано! Жди зелёный.</p>}
          {phase === 'result' && <p className="text-2xl font-bold">{times[times.length - 1]} мс</p>}
          <button className="btn w-full py-4 text-lg" onClick={startRound}>
            {times.length === 0 ? 'Начать' : 'Следующий раунд'}
          </button>
        </div>
      )}

      {phase === 'waiting' && (
        <button
          className="w-full aspect-[2/1] rounded-2xl bg-red-500 text-white text-xl font-bold flex items-center justify-center active:scale-[0.98] transition"
          onClick={tap}
        >
          ⏳ Жди…
        </button>
      )}

      {phase === 'go' && (
        <button
          className="w-full aspect-[2/1] rounded-2xl bg-emerald-500 text-white text-xl font-bold flex items-center justify-center active:scale-[0.98] transition animate-pop"
          onClick={tap}
        >
          ⚡ ЖМИИ!
        </button>
      )}

      {phase === 'done' && (
        <div className="card p-6 space-y-3 animate-pop">
          <p className="text-4xl">🏁</p>
          <p className="text-3xl font-bold">{avg} мс</p>
          <p className="text-sm text-paper-600">Среднее за {config.rounds} раундов</p>
          {points && <p className="text-lg font-bold text-emerald-600">+{points} pts</p>}
          <div className="text-xs text-paper-500 flex flex-wrap gap-2 justify-center">
            {times.map((t, i) => <span key={i} className="chip">R{i + 1}: {t}мс</span>)}
          </div>
          <div className="flex gap-2 justify-center pt-2">
            <button className="btn-ghost" onClick={() => setPhase('menu')}>Уровни</button>
            <button className="btn" onClick={() => startGame(level)}>Ещё раз</button>
          </div>
        </div>
      )}
    </div>
  );
}
