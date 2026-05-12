import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import SudokuGrid from '../components/SudokuGrid';
import NumberPad from '../components/NumberPad';
import Timer from '../components/Timer';
import Confetti from '../components/Confetti';
import { sfx } from '../sfx';

const MAX_LIVES = 3;

export default function PuzzlePlay() {
  const { id } = useParams();
  const nav = useNavigate();
  const [puzzle, setPuzzle] = useState(null);
  const [value, setValue] = useState('');
  const [selected, setSelected] = useState(null);
  const [activeDigit, setActiveDigit] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [lives, setLives] = useState(MAX_LIVES);
  const [wrongSet, setWrongSet] = useState(() => new Set());
  const [lockedSet, setLockedSet] = useState(() => new Set());
  const [gameOver, setGameOver] = useState(false);

  const [hintMode, setHintMode] = useState(false);

  // Pause
  const [paused, setPaused] = useState(false);
  const [pausedSeconds, setPausedSeconds] = useState(0);
  const pauseStart = useRef(null);

  // Percentile
  const [compare, setCompare] = useState(null);

  const initing = useRef(false);

  const loadPuzzle = useCallback(async () => {
    try {
      const p = await api.getPuzzle(id);
      setPuzzle(p);
      setValue(p.puzzle);
      const start = await api.startPuzzle(id);
      setStartedAt(start.started_at);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (initing.current) return;
    initing.current = true;
    loadPuzzle();
  }, [loadPuzzle]);

  const togglePause = () => {
    if (result || gameOver) return;
    if (paused) {
      // resume — добавляем время паузы к pausedSeconds
      const delta = Math.floor((Date.now() - pauseStart.current) / 1000);
      setPausedSeconds((p) => p + delta);
      setPaused(false);
    } else {
      pauseStart.current = Date.now();
      setPaused(true);
    }
  };

  const handleCellClick = useCallback(
    async (idx) => {
      if (!puzzle || result || gameOver || paused) return;
      setSelected(idx);

      if (activeDigit !== null && activeDigit !== 0 && puzzle.puzzle[idx] === '0' && !lockedSet.has(idx)) {
        await placeDigit(idx, activeDigit);
      }
      if (activeDigit === 0 && puzzle.puzzle[idx] === '0' && !lockedSet.has(idx)) {
        setValue((prev) => prev.slice(0, idx) + '0' + prev.slice(idx + 1));
        setWrongSet((prev) => {
          if (!prev.has(idx)) return prev;
          const next = new Set(prev);
          next.delete(idx);
          return next;
        });
        setActiveDigit(null);
      }
    },
    [puzzle, result, gameOver, paused, activeDigit, lockedSet]
  );

  const placeDigit = async (idx, num) => {
    setValue((prev) => prev.slice(0, idx) + String(num) + prev.slice(idx + 1));
    sfx.tap();

    try {
      const { correct } = await api.checkCell(id, idx, String(num));
      if (correct) {
        sfx.correct();
        setLockedSet((prev) => new Set(prev).add(idx));
        setWrongSet((prev) => {
          if (!prev.has(idx)) return prev;
          const next = new Set(prev);
          next.delete(idx);
          return next;
        });
      } else {
        sfx.wrong();
        setWrongSet((prev) => new Set(prev).add(idx));
        setLives((prev) => {
          const next = prev - 1;
          if (next <= 0) setGameOver(true);
          return Math.max(0, next);
        });
      }
    } catch (e) {
      console.warn('check failed', e.message);
    }

    setActiveDigit(null);
  };

  const handleNumPad = (num) => {
    if (result || gameOver || paused) return;
    setActiveDigit(num);
    sfx.click();
  };

  useEffect(() => {
    if (result || gameOver || paused) return;
    const onKey = (e) => {
      if (e.key >= '1' && e.key <= '9') { setActiveDigit(parseInt(e.key, 10)); e.preventDefault(); }
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { setActiveDigit(0); e.preventDefault(); }
      else if (e.key === 'ArrowRight' && selected !== null && selected % 9 < 8) setSelected(selected + 1);
      else if (e.key === 'ArrowLeft' && selected !== null && selected % 9 > 0) setSelected(selected - 1);
      else if (e.key === 'ArrowDown' && selected !== null && selected < 72) setSelected(selected + 9);
      else if (e.key === 'ArrowUp' && selected !== null && selected > 8) setSelected(selected - 9);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, result, gameOver, paused]);

  const restart = async () => {
    try {
      await api.resetPuzzle(id);
      const start = await api.startPuzzle(id);
      setStartedAt(start.started_at);
      setValue(puzzle.puzzle);
      setWrongSet(new Set());
      setLockedSet(new Set());
      setLives(MAX_LIVES);
      setGameOver(false);
      setResult(null);
      setError('');
      setSelected(null);
      setActiveDigit(null);
      setPaused(false);
      setPausedSeconds(0);
    } catch (e) {
      setError(e.message);
    }
  };

  const submit = async () => {
    if (value.includes('0')) {
      setError('Осталось заполнить ещё несколько клеток 🙂');
      return;
    }
    if (wrongSet.size > 0) {
      setError('Есть ошибки — исправь красные клетки');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await api.submitPuzzle(id, value, hintMode);
      setResult(res);
      if (res.ok) {
        sfx.win();
        // Запрашиваем перцентиль
        api.compareOnPuzzle(id).then(setCompare).catch(() => {});
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const correctValue = value.split('').map((ch, i) => wrongSet.has(i) ? '0' : ch).join('');

  if (loading) return <p className="text-center text-paper-500 pt-10">Загрузка…</p>;
  if (error && !puzzle) return <p className="text-center text-red-600 pt-10">{error}</p>;

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
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 text-lg">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <span key={i} className={`heart ${i >= lives ? 'lost' : ''}`}>❤️</span>
            ))}
          </div>
          <Timer startedAt={startedAt} stopped={!!result || gameOver} paused={paused} pausedSeconds={pausedSeconds} />
          {!result && !gameOver && (
            <button
              type="button"
              onClick={togglePause}
              className="w-8 h-8 rounded-lg bg-paper-200 text-paper-900 flex items-center justify-center active:scale-95 transition"
              title={paused ? 'Продолжить' : 'Пауза'}
            >
              {paused ? '▶' : '⏸'}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between card p-3 text-sm">
        <div>
          <div className="font-medium">💡 Подсветка одинаковых цифр</div>
          <div className="text-xs text-paper-600">Очки за решение ×0.5</div>
        </div>
        <button
          type="button"
          className={`shrink-0 w-12 h-7 rounded-full transition relative ${hintMode ? 'bg-black' : 'bg-paper-300'}`}
          onClick={() => setHintMode(!hintMode)}
        >
          <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${hintMode ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>

      <div className="relative">
        <SudokuGrid
          puzzle={puzzle?.puzzle || ''}
          value={value}
          selected={selected}
          setSelected={handleCellClick}
          wrongSet={wrongSet}
          lockedSet={lockedSet}
          hintMode={hintMode}
          activeDigit={activeDigit}
          disabled={!!result || gameOver || paused}
        />
        {paused && (
          <div className="absolute inset-0 rounded-2xl bg-paper-50/95 backdrop-blur flex flex-col items-center justify-center space-y-3">
            <p className="text-5xl">⏸</p>
            <p className="text-lg font-bold">Пауза</p>
            <p className="text-sm text-paper-600">Таймер остановлен</p>
            <button className="btn px-5 mt-2" onClick={togglePause}>Продолжить</button>
          </div>
        )}
      </div>

      {!result && !gameOver && !paused && (
        <>
          <NumberPad onInput={handleNumPad} disabled={false} activeDigit={activeDigit} value={correctValue} />
          <div className="flex gap-2 justify-center pt-1 flex-wrap">
            <button className="btn-ghost px-4 py-2 text-sm" onClick={restart}>↻ Начать заново</button>
            <button className="btn-danger px-4 py-2 text-sm" onClick={() => setGameOver(true)}>Завершить игру</button>
            <button className="btn px-6 py-2.5" onClick={submit} disabled={submitting}>
              {submitting ? 'Проверяю…' : 'Готово'}
            </button>
          </div>
        </>
      )}

      {error && <p className="text-center text-red-600 text-sm">{error}</p>}

      {gameOver && !result && (
        <div className="card p-6 text-center space-y-3 animate-pop">
          <p className="text-4xl">💔</p>
          <p className="text-xl font-bold">Жизни закончились</p>
          <div className="flex gap-2 justify-center pt-2">
            <button className="btn-ghost" onClick={() => nav('/puzzles')}>К списку</button>
            <button className="btn" onClick={restart}>↻ Заново</button>
          </div>
        </div>
      )}

      {result && (
        <div className={`card p-6 text-center space-y-3 animate-pop ${result.ok ? '' : 'border-red-300'}`}>
          {result.ok ? (
            <>
              <p className="text-4xl">🎉</p>
              <p className="text-xl font-bold">Красавчик!</p>
              <p className="text-paper-600 text-sm">
                Время: {Math.floor(result.durationSeconds / 60)}:{String(result.durationSeconds % 60).padStart(2, '0')}
              </p>
              <p className="text-2xl font-bold">+{result.points} pts</p>
              {compare?.percentile !== null && compare?.percentile !== undefined && (
                <p className="text-sm text-paper-700">
                  🚀 Ты быстрее {compare.percentile}% игроков на этой сложности
                </p>
              )}
              {result.hint && <p className="text-xs text-paper-600">Подсветка включена → очки ×0.5</p>}
              {result.bonus > 0 && <p className="text-paper-600 text-sm">+{result.bonus} бонус</p>}
              <p className="text-sm text-paper-600">Ранг: {result.rank} · Всего: {result.totalPoints}</p>
              {result.newAchievements?.length > 0 && (
                <p className="text-sm">✨ {result.newAchievements.join(', ')}</p>
              )}
              <div className="flex gap-2 justify-center pt-2">
                <button className="btn-ghost" onClick={() => nav('/puzzles')}>К списку</button>
                <button className="btn" onClick={() => nav('/leaderboard')}>Топ</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-4xl">😅</p>
              <p className="text-xl font-bold">Почти!</p>
              <button className="btn-ghost mt-2" onClick={() => setResult(null)}>Попробовать ещё</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
