import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import SudokuGrid from '../components/SudokuGrid';
import NumberPad from '../components/NumberPad';
import Timer from '../components/Timer';
import Confetti from '../components/Confetti';

export default function PuzzlePlay() {
  const { id } = useParams();
  const nav = useNavigate();
  const [puzzle, setPuzzle] = useState(null);
  const [value, setValue] = useState('');
  const [selected, setSelected] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await api.getPuzzle(id);
        if (cancelled) return;
        setPuzzle(p);
        setValue(p.puzzle);
        // первая пустая клетка — в фокус
        const first = p.puzzle.indexOf('0');
        if (first >= 0) setSelected(first);
        const start = await api.startPuzzle(id);
        if (cancelled) return;
        setStartedAt(start.started_at);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleInput = useCallback(
    (num) => {
      if (!puzzle || selected == null || result) return;
      if (puzzle.puzzle[selected] !== '0') return; // в фиксированную не пишем
      setValue((prev) => prev.slice(0, selected) + String(num) + prev.slice(selected + 1));
    },
    [puzzle, selected, result]
  );

  const submit = async () => {
    if (value.includes('0')) {
      setError('Осталось заполнить ещё несколько клеток 🙂');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await api.submitPuzzle(id, value);
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-center text-ink-400 pt-10">Загрузка…</p>;
  if (error && !puzzle) return <p className="text-center text-red-400 pt-10">{error}</p>;

  return (
    <div className="space-y-4 max-w-[560px] mx-auto">
      <Confetti show={result?.ok} />

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold truncate">{puzzle?.title}</h1>
          <div className="flex gap-1.5 mt-1">
            <span className="chip">{puzzle?.difficulty}</span>
            <span className="chip">{puzzle?.kind}</span>
          </div>
        </div>
        <Timer startedAt={startedAt} stopped={!!result} />
      </div>

      <SudokuGrid
        puzzle={puzzle?.puzzle || ''}
        value={value}
        selected={selected}
        setSelected={setSelected}
        onInput={handleInput}
        disabled={!!result}
      />

      {!result && (
        <>
          <NumberPad onInput={handleInput} disabled={selected == null || puzzle?.puzzle[selected] !== '0'} />
          <div className="flex gap-2 justify-center pt-1">
            <button className="btn-ghost px-4 py-2 text-sm" onClick={() => setValue(puzzle.puzzle)}>
              Сбросить
            </button>
            <button className="btn px-6 py-2.5" onClick={submit} disabled={submitting}>
              {submitting ? 'Проверяю…' : 'Готово'}
            </button>
          </div>
        </>
      )}

      {error && <p className="text-center text-red-400 text-sm">{error}</p>}

      {result && (
        <div className={`card p-6 text-center space-y-3 animate-pop ${result.ok ? 'border-white/40' : 'border-red-500/40'}`}>
          {result.ok ? (
            <>
              <p className="text-4xl">🎉</p>
              <p className="text-xl font-bold">Красавчик!</p>
              <p className="text-ink-300 text-sm">
                Время: {Math.floor(result.durationSeconds / 60)}:{String(result.durationSeconds % 60).padStart(2, '0')}
              </p>
              <p className="text-2xl font-bold">+{result.points} pts</p>
              {result.bonus > 0 && <p className="text-ink-400 text-sm">+{result.bonus} бонус</p>}
              <p className="text-sm text-ink-400">Ранг: {result.rank} · Всего: {result.totalPoints}</p>
              {result.newAchievements?.length > 0 && (
                <p className="text-sm">✨ Новая ачивка: {result.newAchievements.join(', ')}</p>
              )}
              <div className="flex gap-2 justify-center pt-2">
                <button className="btn-ghost" onClick={() => nav('/puzzles')}>К списку</button>
                <button className="btn" onClick={() => nav('/leaderboard')}>Смотреть топ</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-4xl">😅</p>
              <p className="text-xl font-bold">Почти!</p>
              <p className="text-ink-400 text-sm">Что-то не сошлось, проверь внимательно.</p>
              <button className="btn-ghost mt-2" onClick={() => setResult(null)}>Попробовать ещё</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
