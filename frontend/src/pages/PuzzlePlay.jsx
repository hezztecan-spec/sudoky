import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import SudokuGrid from '../components/SudokuGrid';
import NumberPad from '../components/NumberPad';
import Timer from '../components/Timer';
import Confetti from '../components/Confetti';
import { sfx } from '../sfx';

const MAX_LIVES = 3;
const STORAGE_PREFIX = 'sudoku_progress_';

function saveProgress(id, data) {
  try { localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(data)); } catch {}
}
function loadProgress(id) {
  try { return JSON.parse(localStorage.getItem(STORAGE_PREFIX + id)); } catch { return null; }
}
function clearProgress(id) {
  try { localStorage.removeItem(STORAGE_PREFIX + id); } catch {}
}

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

  // Карандаш
  const [pencilMode, setPencilMode] = useState(false);
  const [notes, setNotes] = useState(() => new Map()); // Map<idx, Set<number>>

  // Undo
  const [history, setHistory] = useState([]); // [{value, notes, wrongSet, lockedSet, lives}]

  // Пауза
  const [paused, setPaused] = useState(false);
  const [pausedSeconds, setPausedSeconds] = useState(0);
  const pauseStart = useRef(null);

  // Percentile
  const [compare, setCompare] = useState(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [undoUsed, setUndoUsed] = useState(false);

  const initing = useRef(false);

  // Сохранение прогресса при каждом изменении
  useEffect(() => {
    if (!puzzle || result || loading) return;
    saveProgress(id, {
      value,
      lives,
      wrongSet: [...wrongSet],
      lockedSet: [...lockedSet],
      notes: [...notes.entries()].map(([k, v]) => [k, [...v]]),
      hintMode,
      hintsUsed,
      pausedSeconds,
    });
  }, [value, lives, wrongSet, lockedSet, notes, hintMode, hintsUsed, pausedSeconds, puzzle, result, loading, id]);

  const loadPuzzle = useCallback(async () => {
    try {
      const p = await api.getPuzzle(id);
      setPuzzle(p);

      // Попробуем восстановить прогресс
      const saved = loadProgress(id);
      if (saved && saved.value && saved.value.length === 81) {
        setValue(saved.value);
        setLives(saved.lives ?? MAX_LIVES);
        setWrongSet(new Set(saved.wrongSet || []));
        setLockedSet(new Set(saved.lockedSet || []));
        setNotes(new Map((saved.notes || []).map(([k, v]) => [k, new Set(v)])));
        setHintMode(saved.hintMode || false);
        setHintsUsed(saved.hintsUsed || 0);
        setPausedSeconds(saved.pausedSeconds || 0);
      } else {
        setValue(p.puzzle);
      }

      const start = await api.startPuzzle(id);
      if (start.error && start.solved) {
        setResult({ ok: true, alreadySolved: true });
      } else {
        setStartedAt(start.started_at);
      }
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

  // При уходе со страницы — ставим на паузу (чтобы время не шло)
  useEffect(() => {
    const onVisChange = () => {
      if (document.hidden && !paused && !result && !gameOver) {
        pauseStart.current = Date.now();
        setPaused(true);
      }
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }, [paused, result, gameOver]);

  const togglePause = () => {
    if (result || gameOver) return;
    if (paused) {
      const delta = Math.floor((Date.now() - pauseStart.current) / 1000);
      setPausedSeconds((p) => p + delta);
      setPaused(false);
    } else {
      pauseStart.current = Date.now();
      setPaused(true);
    }
  };

  // Сохранить состояние в историю (для undo)
  const pushHistory = () => {
    setHistory((h) => [...h.slice(-50), {
      value,
      wrongSet: new Set(wrongSet),
      lockedSet: new Set(lockedSet),
      notes: new Map([...notes.entries()].map(([k, v]) => [k, new Set(v)])),
      lives,
    }]);
  };

  const undo = () => {
    if (history.length === 0 || undoUsed) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setValue(prev.value);
    setWrongSet(prev.wrongSet);
    setLockedSet(prev.lockedSet);
    setNotes(prev.notes);
    setLives(prev.lives);
    setUndoUsed(true);
    sfx.click();
  };

  // Автостирание заметок: когда ставим цифру, убираем её из заметок в строке/столбце/квадрате
  const autoEraseNotes = (idx, num) => {
    const row = Math.floor(idx / 9);
    const col = idx % 9;
    const boxR = Math.floor(row / 3) * 3;
    const boxC = Math.floor(col / 3) * 3;

    setNotes((prev) => {
      const next = new Map(prev);
      for (let i = 0; i < 9; i++) {
        // строка
        const rIdx = row * 9 + i;
        if (next.has(rIdx)) { const s = new Set(next.get(rIdx)); s.delete(num); next.set(rIdx, s); }
        // столбец
        const cIdx = i * 9 + col;
        if (next.has(cIdx)) { const s = new Set(next.get(cIdx)); s.delete(num); next.set(cIdx, s); }
      }
      // квадрат
      for (let r = boxR; r < boxR + 3; r++) {
        for (let c = boxC; c < boxC + 3; c++) {
          const bIdx = r * 9 + c;
          if (next.has(bIdx)) { const s = new Set(next.get(bIdx)); s.delete(num); next.set(bIdx, s); }
        }
      }
      // Убираем заметки из самой клетки
      next.delete(idx);
      return next;
    });
  };

  const handleCellClick = useCallback(
    async (idx) => {
      if (!puzzle || result || gameOver || paused) return;
      setSelected(idx);

      if (activeDigit === null) return;

      // Стирание
      if (activeDigit === 0 && puzzle.puzzle[idx] === '0' && !lockedSet.has(idx)) {
        pushHistory();
        setValue((prev) => prev.slice(0, idx) + '0' + prev.slice(idx + 1));
        setWrongSet((prev) => { const n = new Set(prev); n.delete(idx); return n; });
        setNotes((prev) => { const n = new Map(prev); n.delete(idx); return n; });
        setActiveDigit(null);
        return;
      }

      if (activeDigit >= 1 && activeDigit <= 9 && puzzle.puzzle[idx] === '0' && !lockedSet.has(idx)) {
        // Карандаш
        if (pencilMode) {
          pushHistory();
          setNotes((prev) => {
            const next = new Map(prev);
            const existing = next.get(idx) || new Set();
            const updated = new Set(existing);
            if (updated.has(activeDigit)) updated.delete(activeDigit);
            else updated.add(activeDigit);
            next.set(idx, updated);
            return next;
          });
          sfx.tap();
          setActiveDigit(null);
          return;
        }

        // Обычная постановка
        pushHistory();
        await placeDigit(idx, activeDigit);
        setActiveDigit(null);
      }
    },
    [puzzle, result, gameOver, paused, activeDigit, lockedSet, pencilMode, value, wrongSet, notes, lives]
  );

  const placeDigit = async (idx, num) => {
    setValue((prev) => prev.slice(0, idx) + String(num) + prev.slice(idx + 1));
    sfx.tap();

    try {
      const { correct } = await api.checkCell(id, idx, String(num));
      if (correct) {
        sfx.correct();
        setLockedSet((prev) => new Set(prev).add(idx));
        setWrongSet((prev) => { const n = new Set(prev); n.delete(idx); return n; });
        autoEraseNotes(idx, num);
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
  };

  const handleNumPad = (num) => {
    if (result || gameOver || paused) return;
    setActiveDigit(num);
    sfx.click();
  };

  const handleHint = async () => {
    if (result || gameOver || paused || !puzzle || hintsUsed >= 1) return;
    try {
      const res = await api.hintCell(id, value, selected);
      pushHistory();
      setValue((prev) => prev.slice(0, res.index) + res.value + prev.slice(res.index + 1));
      setLockedSet((prev) => new Set(prev).add(res.index));
      setWrongSet((prev) => { const n = new Set(prev); n.delete(res.index); return n; });
      autoEraseNotes(res.index, parseInt(res.value, 10));
      setHintsUsed(1);
      sfx.correct();
    } catch (e) {
      setError(e.message);
    }
  };

  // Keyboard
  useEffect(() => {
    if (result || gameOver || paused) return;
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { undo(); e.preventDefault(); return; }
      if (e.key === 'n' || e.key === 'N') { setPencilMode((p) => !p); e.preventDefault(); return; }
      if (e.key === 'h' || e.key === 'H') { handleHint(); e.preventDefault(); return; }
      if (e.key === ' ') { togglePause(); e.preventDefault(); return; }
      if (e.key >= '1' && e.key <= '9') { setActiveDigit(parseInt(e.key, 10)); e.preventDefault(); }
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { setActiveDigit(0); e.preventDefault(); }
      else if (e.key === 'ArrowRight' && selected !== null && selected % 9 < 8) setSelected(selected + 1);
      else if (e.key === 'ArrowLeft' && selected !== null && selected % 9 > 0) setSelected(selected - 1);
      else if (e.key === 'ArrowDown' && selected !== null && selected < 72) setSelected(selected + 9);
      else if (e.key === 'ArrowUp' && selected !== null && selected > 8) setSelected(selected - 9);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, result, gameOver, paused, history]);

  const restart = async () => {
    try {
      await api.resetPuzzle(id);
      const start = await api.startPuzzle(id);
      setStartedAt(start.started_at);
      setValue(puzzle.puzzle);
      setWrongSet(new Set());
      setLockedSet(new Set());
      setNotes(new Map());
      setLives(MAX_LIVES);
      setGameOver(false);
      setResult(null);
      setError('');
      setSelected(null);
      setActiveDigit(null);
      setPaused(false);
      setPausedSeconds(0);
      setHistory([]);
      setHintsUsed(0);
      setUndoUsed(false);
      clearProgress(id);
    } catch (e) {
      setError(e.message);
    }
  };

  const submit = async () => {
    if (value.includes('0')) { setError('Осталось заполнить ещё несколько клеток'); return; }
    if (wrongSet.size > 0) { setError('Есть ошибки — исправь красные клетки'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await api.submitPuzzle(id, value, hintMode);
      setResult(res);
      if (res.ok) {
        sfx.win();
        clearProgress(id);
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

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold truncate">{puzzle?.title || puzzle?.difficulty}</h1>
          <div className="flex gap-1.5 mt-1">
            <span className="chip">{puzzle?.difficulty}</span>
            {hintsUsed > 0 && <span className="chip">💡×{hintsUsed}</span>}
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
              className="w-8 h-8 rounded-lg bg-paper-200 flex items-center justify-center active:scale-95 transition"
              title="Пауза (Space)"
            >
              {paused ? '▶' : '⏸'}
            </button>
          )}
        </div>
      </div>

      {/* Hint mode toggle */}
      <div className="flex items-center justify-between card p-3 text-sm">
        <div>
          <div className="font-medium">💡 Подсветка одинаковых</div>
          <div className="text-xs text-paper-600">Очки ×0.5</div>
        </div>
        <button
          type="button"
          className={`shrink-0 w-12 h-7 rounded-full transition relative ${hintMode ? 'bg-black' : 'bg-paper-300'}`}
          onClick={() => setHintMode(!hintMode)}
        >
          <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${hintMode ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>

      {/* Grid */}
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
          notes={notes}
        />
        {paused && (
          <div className="absolute inset-0 rounded-2xl bg-paper-50/95 backdrop-blur flex flex-col items-center justify-center space-y-3">
            <p className="text-5xl">⏸</p>
            <p className="text-lg font-bold">Пауза</p>
            <button className="btn px-5 mt-2" onClick={togglePause}>Продолжить</button>
          </div>
        )}
      </div>

      {/* Controls */}
      {!result && !gameOver && !paused && (
        <>
          <NumberPad
            onInput={handleNumPad}
            activeDigit={activeDigit}
            value={correctValue}
            pencilMode={pencilMode}
            onTogglePencil={() => setPencilMode(!pencilMode)}
            onUndo={undo}
            onHint={handleHint}
            undoDisabled={undoUsed || history.length === 0}
            hintDisabled={hintsUsed >= 1}
          />
          <div className="flex gap-2 justify-center pt-1 flex-wrap">
            <button className="btn-ghost px-4 py-2 text-sm" onClick={restart}>↻ Заново</button>
            <button className="btn-danger px-4 py-2 text-sm" onClick={() => setGameOver(true)}>Завершить</button>
            <button className="btn px-6 py-2.5" onClick={submit} disabled={submitting}>
              {submitting ? '…' : 'Готово'}
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
            <button className="btn-ghost" onClick={() => nav('/sudoku')}>К списку</button>
            <button className="btn" onClick={restart}>↻ Заново</button>
          </div>
        </div>
      )}

      {result && (
        <div className={`card p-6 text-center space-y-3 animate-pop ${result.ok ? '' : 'border-red-300'}`}>
          {result.ok ? (
            <>
              <p className="text-4xl">🎉</p>
              <p className="text-xl font-bold">{result.alreadySolved ? 'Уже решено' : 'Красавчик!'}</p>
              {result.durationSeconds && (
                <p className="text-paper-600 text-sm">
                  Время: {Math.floor(result.durationSeconds / 60)}:{String(result.durationSeconds % 60).padStart(2, '0')}
                </p>
              )}
              {result.points && <p className="text-2xl font-bold">+{result.points} pts</p>}
              {compare?.percentile != null && (
                <p className="text-sm text-paper-700">🚀 Быстрее {compare.percentile}% игроков</p>
              )}
              {hintsUsed > 0 && <p className="text-xs text-paper-600">Подсказок: {hintsUsed} (−20% за каждую)</p>}
              {result.hint && <p className="text-xs text-paper-600">Подсветка → очки ×0.5</p>}
              <div className="flex gap-2 justify-center pt-2">
                <button className="btn-ghost" onClick={() => nav('/sudoku')}>К списку</button>
                <button className="btn" onClick={() => nav('/leaderboard')}>Топ</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-4xl">😅</p>
              <p className="text-xl font-bold">Почти!</p>
              <button className="btn-ghost mt-2" onClick={() => setResult(null)}>Ещё раз</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
