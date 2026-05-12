import { useMemo } from 'react';

export default function NumberPad({ onInput, activeDigit, value, pencilMode, onTogglePencil, onUndo, onHint, undoDisabled, hintDisabled }) {
  const counts = useMemo(() => {
    const c = {};
    for (let i = 1; i <= 9; i++) c[i] = 0;
    if (value) {
      for (const ch of value) {
        const n = parseInt(ch, 10);
        if (n >= 1 && n <= 9) c[n]++;
      }
    }
    return c;
  }, [value]);

  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="w-full max-w-[540px] mx-auto space-y-2">
      {/* Цифры в один ряд */}
      <div className="grid grid-cols-9 gap-1.5">
        {nums.map((n) => {
          const remaining = 9 - counts[n];
          const exhausted = remaining <= 0;
          return (
            <button
              key={n}
              type="button"
              disabled={exhausted}
              onClick={() => onInput(n)}
              className={`aspect-square rounded-xl font-bold text-lg sm:text-xl
                         active:scale-[0.96] transition
                         ${exhausted ? 'opacity-15 cursor-not-allowed bg-paper-100' : ''}
                         ${!exhausted && activeDigit === n ? 'bg-black text-white ring-2 ring-black ring-offset-2' : ''}
                         ${!exhausted && activeDigit !== n ? 'bg-paper-200 text-black hover:bg-paper-300' : ''}`}
            >
              {n}
            </button>
          );
        })}
      </div>

      {/* Нижняя панель: undo, стереть, карандаш, подсказка */}
      <div className="flex gap-2 justify-center">
        <button
          type="button"
          onClick={onUndo}
          disabled={undoDisabled}
          className="h-9 px-3 rounded-lg bg-paper-200 text-paper-700 hover:bg-paper-300 active:scale-95 transition text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          title="Отменить (1 раз)"
        >
          ↩
        </button>
        <button
          type="button"
          onClick={() => onInput(0)}
          className={`h-9 px-3 rounded-lg border border-paper-300 text-paper-700 hover:bg-paper-100 active:scale-95 transition text-sm
                     ${activeDigit === 0 ? 'bg-paper-300 ring-2 ring-black ring-offset-1' : 'bg-white'}`}
          title="Стереть"
        >
          ⌫
        </button>
        <button
          type="button"
          onClick={onTogglePencil}
          className={`h-9 px-3 rounded-lg active:scale-95 transition text-sm
                     ${pencilMode ? 'bg-black text-white' : 'bg-paper-200 text-paper-700 hover:bg-paper-300'}`}
          title="Карандаш"
        >
          ✏️
        </button>
        <button
          type="button"
          onClick={onHint}
          disabled={hintDisabled}
          className="h-9 px-3 rounded-lg bg-paper-200 text-paper-700 hover:bg-paper-300 active:scale-95 transition text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          title="Подсказка (1 раз)"
        >
          💡
        </button>
      </div>
    </div>
  );
}
