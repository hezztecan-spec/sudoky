// Сетка судоку.
// hintMode + activeDigit — подсвечивает ВСЕ клетки с цифрой activeDigit (fixed, locked, user-placed).

export default function SudokuGrid({ puzzle, value, selected, setSelected, wrongSet, lockedSet, hintMode, activeDigit, disabled }) {
  const selRow = selected != null ? Math.floor(selected / 9) : -1;
  const selCol = selected != null ? selected % 9 : -1;
  const selBox = selected != null ? Math.floor(selRow / 3) * 3 + Math.floor(selCol / 3) : -1;

  // Подсветка: по activeDigit (выбранная цифра на панели)
  const highlightVal = hintMode && activeDigit && activeDigit !== 0 ? String(activeDigit) : null;

  return (
    <div className="sudoku-grid" role="grid">
      {Array.from({ length: 81 }, (_, idx) => {
        const row = Math.floor(idx / 9);
        const col = idx % 9;
        const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
        const isOriginalFixed = puzzle[idx] !== '0';
        const isLocked = lockedSet?.has(idx);
        const isFixed = isOriginalFixed || isLocked;
        const ch = value[idx] === '0' ? '' : value[idx];
        const isSelected = idx === selected;
        const sameRow = row === selRow && !isSelected;
        const sameCol = col === selCol && !isSelected;
        const sameBox = box === selBox && !isSelected && !sameRow && !sameCol;
        // Подсвечиваем ВСЕ клетки с этой цифрой (включая fixed)
        const sameValHint = highlightVal && ch === highlightVal;
        const isWrong = wrongSet?.has(idx);

        let cls = 'sudoku-cell';
        if (isFixed && !sameValHint) cls += ' fixed';
        if (isFixed && sameValHint) cls += ' fixed same-value';
        if (!isFixed && sameValHint && !isSelected) cls += ' same-value';
        if (isSelected) cls += ' selected';
        if (!isSelected && !sameValHint) {
          if (sameRow) cls += ' same-row';
          if (sameCol) cls += ' same-col';
          if (sameBox) cls += ' same-box';
        }
        if (isWrong) cls += ' wrong';

        return (
          <div
            key={idx}
            className={cls}
            data-row={row}
            data-col={col}
            role="gridcell"
            onClick={() => !disabled && setSelected(idx)}
          >
            {ch}
          </div>
        );
      })}
    </div>
  );
}
