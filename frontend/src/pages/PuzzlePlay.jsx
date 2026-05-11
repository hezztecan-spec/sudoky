import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import SudokuGrid from '../components/SudokuGrid';
import NumberPad from '../components/NumberPad';
import Timer from '../components/Timer';
import Confetti from '../components/Confetti';

const MAX_LIVES = 3;

export default function PuzzlePlay() {
  const { id } = useParams();
  const nav = useNavigate();
  const [puzzle, setPuzzle] = useState(null);
  const [value, setValue] = useState('');
  const [selected, setSelected] = useState(null);       // выбранная клетка
  const [activeDigit, setActiveDigit] = useState(null); // выбранная цифра (сначала цифра, потом клетка)
  const [startedAt, setStartedAt] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Жизни и ошибки
  const [lives, setLives] = useState(MAX_LIVES);
  const [wrongSet, setWrongSet] = useState(() => new Set());
  const [gameOver, setGameOver] = useState(false);

  // Бафф подсветки
  const [hintMode, setHintMode] = useState(false);

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

  // Когда игрок кликает на клетку — если есть activeDigit, ставим цифру
  const handleCellClick = useCallback(
    async (idx) => {
      if (!puzzle || result || gameOver) return;
      setSelected(idx);

      // Если цифра уже выбрана и клетка пустая — ставим
      if (activeDigit !== null && puzzle.puzzle[idx] === '0') {
        await placeDigit(idx, activeDigit);
      }
    },
    [puzzle, result, gameOver, activeDigit]
  );

  // Ставим цифру в клетку
  const placeDigit = async (idx, num) => {
    if (!puzzle || puzzle.puzzle[idx] !== '0') return;

    if (num === 0) {
      // стирание
      setValue((prev) => prev.slice(0, idx) + '0' + prev.slice(idx + 1));
      setWrongSet((prev) => {
        if (!prev.has(idx)) return prev;
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
      return;
    }

    setValue((prev) => prev.slice(0, idx) + String(num) + prev.slice(idx + 1));

    try {
      const { correct } = await api.checkCell(id, idx, String(num));
      if (!correct) {
        setWrongSet((prev) => new Set(prev).add(idx));
        setLives((prev) => {
          const next = prev - 1;
          if (next <= 0) setGameOver(true);
          return Math.max(0, next);
        });
      } else {
        setWrongSet((prev) => {
          if (!prev.has(idx)) return prev;
          const next = new Set(prev);
          next.delete(idx);
          return next;
        });
      }
    } catch (e) {
      console.warn('check failed', e.message);
    }
  };

  // Клик по цифровой клавиатуре: выбираем цифру.
  // Если клетка уже выбрана и она пустая — сразу ставим.
  const handleNumPad = useCallback(
    async (num) => {
      if (result || gameOver) return;
      setActiveDigit(num === 0 ? 0 : num);

      if (selected !== null && puzzle && puzzle.puzzle[selected] === '0') {
        await placeDigit(selected, num);
      }
    },
    [selected, puzzle, result, gameOver]
  );

  // Физическая клавиатура
  useEffect(() => {
    if (result || gameOver) return;
    const onKey = (e) => {
      if (e.key >= '1' && e.key <= '9') {
        const num = parseInt(e.key, 10);
        setActiveDigit(num);
        if (selected !== null && puzzle && puzzle.puzzle[selected] === '0') {
          placeDigit(selected, num);
        }
        e.preventDefault();
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        setActiveDigit(0);
        if (selected !== null && puzzle && puzzle.puzzle[selected] === '0') {
          placeDigit(selected, 0);
        }
        e.preventDefault();
      } else if (e.key === 'ArrowRight' && selected !== null && selected % 9 < 8) setSelected(selected + 1);
      else if (e.key === 'ArrowLeft' && selected !== null && selected % 9 > 0) setSelected(selected - 1);
      else if (e.key === 'ArrowDown' && selected !== null && selected < 72) setSelected(selected + 9);
      else if (e.key === 'ArrowUp' && selected !== null && selected > 8) setSelected(selected - 9);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, puzzle, result, gameOver]);

  const restart = async () => {
    try {
      await api.resetPuzzle(id);
      setValue(puzzle.puzzle);
      // НЕ обновляем startedAt — время продолжает идти с первого старта
      setWrongSet(new Set());
      setLives(MAX_LIVES);
      setGameOver(false);
      setResult(null);
      setError('');
      setSelected(null);
      setActiveDigit(null);
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
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-center text-paper-500 pt-10">Загрузка…</p>;
  if (error && !puzzle) return <p className="text-center text-red-600 pt-10">{error}</p>;

  return (
    <div className="space-y-4 max-w-[560px] mx-auto">
      <Confetti show={result?.ok} />

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold truncate">{puzzle?.title}</h1>
          <div className="flex gap-1.5 mt-1">
            <span className="chip">{puzzle?.difficulty}</span>
            <span className="chip">{puzzle?.kind}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-0.5 text-lg">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <span key={i} className={`heart ${i >= lives ? 'lost' : ''}`}>❤️</span>
            ))}
          </div>
          <Timer startedAt={startedAt} stopped={!!result || gameOver} />
        </div>
      </div>

      {/* Bonus toggle */}
      <div className="flex items-center justify-between card p-3 text-sm">
        <div>
          <div className="font-medium">💡 Подсветка одинаковых цифр</div>
          <div className="text-xs text-paper-600">Очки за решение ×0.5</div>
        </div>
        <button
          type="button"
          className={`shrink-0 w-12 h-7 rounded-full transition relative ${hintMode ? 'bg-black' : 'bg-paper-300'}`}
          onClick={() => setHintMode(!hintMode)}
          aria-label="Toggle hint"
        >
          <span
            className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${hintMode ? 'left-[22px]' : 'left-0.5'}`}
          />
        </button>
      </div>

      <SudokuGrid
        puzzle={puzzle?.puzzle || ''}
        value={value}
        selected={selected}
        setSelected={handleCellClick}
        onInput={() => {}} // ввод через handleCellClick
        wrongSet={wrongSet}
        hintMode={hintMode}
        disabled={!!result || gameOver}
      />

      {!result && !gameOver && (
        <>
          <NumberPad
            onInput={handleNumPad}
            disabled={false}
            activeDigit={activeDigit}
          />
          <div className="flex gap-2 justify-center pt-1 flex-wrap">
            <button className="btn-ghost px-4 py-2 text-sm" onClick={restart}>
              ↻ Начать заново
            </button>
            <button className="btn-danger px-4 py-2 text-sm" onClick={() => setGameOver(true)}>
              Завершить игру
            </button>
            <button className="btn px-6 py-2.5" onClick={submit} disabled={submitting}>
              {submitting ? 'Проверяю…' : 'Готово'}
            </button>
          </div>
        </>
      )}

      {error && <p className="text-center text-red-600 text-sm">{error}</p>}

      {/* Game over */}
      {gameOver && !result && (
        <div className="card p-6 text-center space-y-3 animate-pop">
          <p className="text-4xl">💔</p>
          <p className="text-xl font-bold">Жизни закончились</p>
          <p className="text-sm text-paper-600">Попробуй ещё раз — сброс не отнимает очки, только время.</p>
          <div className="flex gap-2 justify-center pt-2">
            <button className="btn-ghost" onClick={() => nav('/puzzles')}>К списку</button>
            <button className="btn" onClick={restart}>↻ Начать заново</button>
          </div>
        </div>
      )}

      {/* Result */}
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
              {result.hint && <p className="text-xs text-paper-600">Подсветка была включена → очки ×0.5</p>}
              {result.bonus > 0 && <p className="text-paper-600 text-sm">+{result.bonus} бонус</p>}
              <p className="text-sm text-paper-600">Ранг: {result.rank} · Всего: {result.totalPoints}</p>
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
              <p className="text-paper-600 text-sm">Что-то не сошлось, проверь внимательно.</p>
              <button className="btn-ghost mt-2" onClick={() => setResult(null)}>Попробовать ещё</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
