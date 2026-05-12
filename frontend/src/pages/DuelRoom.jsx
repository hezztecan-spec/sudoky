import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../store';
import { useWs } from '../useWs';
import SudokuGrid from '../components/SudokuGrid';
import NumberPad from '../components/NumberPad';
import Timer from '../components/Timer';
import Confetti from '../components/Confetti';
import { sfx } from '../sfx';

export default function DuelRoom() {
  const { id } = useParams();
  const nav = useNavigate();
  const user = useAuth((s) => s.user);

  const [duel, setDuel] = useState(null);
  const [value, setValue] = useState('');
  const [selected, setSelected] = useState(null);
  const [activeDigit, setActiveDigit] = useState(null);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [won, setWon] = useState(null); // null | true | false
  const [error, setError] = useState('');
  const lastProgress = useRef(0);

  const load = useCallback(async () => {
    try {
      const d = await api.getDuel(id);
      setDuel(d);
      if (!value) setValue(d.puzzle);
      // присоединяемся (creator = no-op, opponent = создаёт запись)
      await api.joinDuel(id);
      const d2 = await api.getDuel(id);
      setDuel(d2);
    } catch (e) {
      setError(e.message);
    }
  }, [id, value]);

  useEffect(() => { load(); }, [load]);

  useWs((msg) => {
    if (!msg || !msg.duelId || msg.duelId !== id) return;
    if (msg.type === 'duel_start') load();
    if (msg.type === 'duel_progress' && msg.userId !== user?.id) {
      setOpponentProgress(msg.filled);
    }
    if (msg.type === 'duel_finished') {
      setWon(msg.winnerId === user?.id);
      if (msg.winnerId === user?.id) sfx.win();
      load();
    }
  });

  const placeDigit = async (idx, num) => {
    if (!duel || duel.status !== 'running') return;
    if (duel.puzzle[idx] !== '0') return;

    const next = num === 0
      ? value.slice(0, idx) + '0' + value.slice(idx + 1)
      : value.slice(0, idx) + String(num) + value.slice(idx + 1);
    setValue(next);
    sfx.tap();

    // Отправляем прогресс (сколько непустых, кроме изначальных)
    const filled = next.split('').filter((ch, i) => ch !== '0' && duel.puzzle[i] === '0').length;
    if (filled !== lastProgress.current) {
      lastProgress.current = filled;
      api.duelProgress(id, filled).catch(() => {});
    }

    // Если всё заполнено — авто-отправка
    if (!next.includes('0')) {
      try {
        const r = await api.finishDuel(id, next);
        if (r.ok) {
          setWon(!!r.won);
          if (r.won) sfx.win();
        }
      } catch (e) {
        setError(e.message);
      }
    }
  };

  const handleCellClick = async (idx) => {
    if (!duel || duel.status !== 'running' || won !== null) return;
    setSelected(idx);
    if (activeDigit !== null && activeDigit !== 0 && duel.puzzle[idx] === '0') {
      await placeDigit(idx, activeDigit);
      setActiveDigit(null);
    }
    if (activeDigit === 0 && duel.puzzle[idx] === '0') {
      await placeDigit(idx, 0);
      setActiveDigit(null);
    }
  };

  if (error) return <p className="text-center text-red-600 pt-10">{error}</p>;
  if (!duel) return <p className="text-center text-paper-500 pt-10">Загрузка…</p>;

  const emptyTotal = duel.puzzle ? duel.puzzle.split('').filter((c) => c === '0').length : 81;
  const myFilled = duel.puzzle
    ? value.split('').filter((ch, i) => ch !== '0' && duel.puzzle[i] === '0').length
    : 0;

  const shareLink = typeof window !== 'undefined' ? `${window.location.origin}/duel/${id}` : '';

  return (
    <div className="space-y-4 max-w-[560px] mx-auto">
      <Confetti show={won === true} />

      <div className="card p-4">
        <h1 className="text-lg font-bold">⚔️ Дуэль · {duel.difficulty}</h1>
        <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
          <div>
            <p className="text-xs text-paper-600">Ты</p>
            <p className="font-semibold">{duel.creator?.id === user?.id ? duel.creator.username : duel.opponent?.username || user?.username}</p>
            <div className="h-1.5 rounded-full bg-paper-200 mt-1 overflow-hidden">
              <div className="h-full bg-black transition-all" style={{ width: `${(myFilled / emptyTotal) * 100}%` }} />
            </div>
          </div>
          <div>
            <p className="text-xs text-paper-600">Соперник</p>
            <p className="font-semibold">
              {duel.creator?.id === user?.id
                ? (duel.opponent?.username || <span className="text-paper-500">ждём…</span>)
                : duel.creator?.username}
            </p>
            <div className="h-1.5 rounded-full bg-paper-200 mt-1 overflow-hidden">
              <div className="h-full bg-red-500 transition-all" style={{ width: `${(opponentProgress / emptyTotal) * 100}%` }} />
            </div>
          </div>
        </div>
        {duel.status === 'running' && duel.started_at && (
          <div className="mt-3 flex justify-center">
            <Timer startedAt={duel.started_at} stopped={won !== null} />
          </div>
        )}
      </div>

      {duel.status === 'waiting' && (
        <div className="card p-5 space-y-3 text-center">
          <p className="text-sm text-paper-700">Отправь ссылку сопернику:</p>
          <div className="flex gap-2">
            <input className="input text-xs flex-1" readOnly value={shareLink} onFocus={(e) => e.target.select()} />
            <button
              className="btn"
              onClick={() => { navigator.clipboard?.writeText(shareLink); }}
            >
              Скопировать
            </button>
          </div>
        </div>
      )}

      {duel.status !== 'waiting' && (
        <SudokuGrid
          puzzle={duel.puzzle || ''}
          value={value}
          selected={selected}
          setSelected={handleCellClick}
          wrongSet={new Set()}
          lockedSet={new Set()}
          hintMode={false}
          activeDigit={activeDigit}
          disabled={won !== null || duel.status !== 'running'}
        />
      )}

      {duel.status === 'running' && won === null && (
        <>
          <NumberPad
            onInput={(n) => { setActiveDigit(n); sfx.click(); }}
            activeDigit={activeDigit}
            value={value}
          />
        </>
      )}

      {won !== null && (
        <div className="card p-6 text-center space-y-2 animate-pop">
          <p className="text-4xl">{won ? '🏆' : '💀'}</p>
          <p className="text-xl font-bold">{won ? 'Победа!' : 'Соперник был быстрее'}</p>
          <button className="btn mt-3" onClick={() => nav('/puzzles')}>К судоку</button>
        </div>
      )}
    </div>
  );
}
