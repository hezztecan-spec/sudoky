import { useMemo } from 'react';

export default function NumberPad({ onInput, disabled, activeDigit, value }) {
  // Считаем сколько раз каждая цифра уже стоит на поле
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
    <div className="w-full max-w-[540px] mx-auto grid grid-cols-10 gap-1.5 sm:gap-2">
      {nums.map((n) => {
        const exhausted = counts[n] >= 9;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled || exhausted}
            onClick={() => onInput(n)}
            className={`aspect-square rounded-xl font-bold text-xl sm:text-2xl
                       active:scale-[0.96] transition
                       ${exhausted ? 'opacity-20 cursor-not-allowed' : ''}
                       ${!exhausted && activeDigit === n ? 'bg-black text-white ring-2 ring-black ring-offset-2' : ''}
                       ${!exhausted && activeDigit !== n ? 'bg-paper-200 text-black' : ''}`}
          >
            {n}
          </button>
        );
      })}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onInput(0)}
        aria-label="Стереть"
        className={`aspect-square rounded-xl border border-paper-300 text-paper-700
                   active:scale-[0.96] transition disabled:opacity-40
                   ${activeDigit === 0 ? 'bg-paper-300 ring-2 ring-black ring-offset-2' : 'bg-white'}`}
      >
        ⌫
      </button>
    </div>
  );
}
