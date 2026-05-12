import { useMemo } from 'react';

// Сетка 3×3 + кнопки ⌫ и ✏️ (карандаш)
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
    <div className="w-full max-w-[320px] mx-auto space-y-2">
      {/* 3×3 цифры */}
      <div className="grid grid-cols-3 gap-2">
        {nums.map((n) => {
          const remaining = 9 - counts[n];
          const exhausted = remaining <= 0;
          return (
            <button
              key={n}
              type="button"
              disabled={exhausted}
              onClick={() => onInput(n)}
              className={`relative aspect-[5/3] rounded-xl font-bold text-2xl
                         active:scale-[0.96] transition
                         ${exhausted ? 'opacity-15 cursor-not-allowed bg-paper-100' : ''}
                         ${!exhausted && activeDigit === n ? 'bg-black text-white ring-2 ring-black ring-offset-2' : ''}
                         ${!exhausted && activeDigit !== n ? 'bg-paper-200 text-black hover:bg-paper-300' : ''}`}
            >
              {n}
              {!exhausted && (
                <span className="absolute top-1 right-2 text-[10px] font-normal text-paper-500">
                  {remaining}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Нижняя панель: undo, стереть, карандаш, подсказка */}
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={onUndo}
          disabled={undoDisabled}
          className="aspect-[5/3] rounded-xl bg-paper-200 text-paper-700 hover:bg-paper-300 active:scale-95 transition flex items-center justify-center text-lg disabled:opacity-30 disabled:cursor-not-allowed"
          title="Отменить (1 раз)"
        >
          ↩
        </button>
        <button
          type="button"
          onClick={() => onInput(0)}
          className={`aspect-[5/3] rounded-xl border border-paper-300 text-paper-700 hover:bg-paper-100 active:scale-95 transition flex items-center justify-center text-lg
                     ${activeDigit === 0 ? 'bg-paper-300 ring-2 ring-black ring-offset-1' : 'bg-white'}`}
          title="Стереть"
        >
          ⌫
        </button>
        <button
          type="button"
          onClick={onTogglePencil}
          className={`aspect-[5/3] rounded-xl active:scale-95 transition flex items-center justify-center text-lg
                     ${pencilMode ? 'bg-black text-white' : 'bg-paper-200 text-paper-700 hover:bg-paper-300'}`}
          title="Карандаш (заметки)"
        >
          ✏️
        </button>
        <button
          type="button"
          onClick={onHint}
          disabled={hintDisabled}
          className="aspect-[5/3] rounded-xl bg-paper-200 text-paper-700 hover:bg-paper-300 active:scale-95 transition flex items-center justify-center text-lg disabled:opacity-30 disabled:cursor-not-allowed"
          title="Подсказка (1 раз)"
        >
          💡
        </button>
      </div>
    </div>
  );
}
