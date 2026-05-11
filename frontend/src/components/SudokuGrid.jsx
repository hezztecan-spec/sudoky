// Сетка судоку. Клетку выбираем тапом/кликом.
// wrongSet — Set индексов клеток с неправильными цифрами.
// hintMode — подсвечивает все клетки с тем же значением что в выбранной.

export default function SudokuGrid({ puzzle, value, selected, setSelected, wrongSet, hintMode, disabled }) {
  const selRow = selected != null ? Math.floor(selected / 9) : -1;
  const selCol = selected != null ? selected % 9 : -1;
  const selBox = selected != null ? Math.floor(selRow / 3) * 3 + Math.floor(selCol / 3) : -1;
  const selVal = selected != null ? value[selected] : null;

  return (
    <div className="sudoku-grid" role="grid">
      {Array.from({ length: 81 }, (_, idx) => {
        const row = Math.floor(idx / 9);
        const col = idx % 9;
        const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
        const isFixed = puzzle[idx] !== '0';
        const ch = value[idx] === '0' ? '' : value[idx];
        const isSelected = idx === selected;
        const sameRow = row === selRow && !isSelected;
        const sameCol = col === selCol && !isSelected;
        const sameBox = box === selBox && !isSelected && !sameRow && !sameCol;
        const sameValHint = hintMode && selVal && selVal !== '0' && ch === selVal && !isSelected;
        const isWrong = wrongSet?.has(idx);

        let cls = 'sudoku-cell';
        if (isFixed) cls += ' fixed';
        if (isSelected) cls += ' selected';
        if (sameRow) cls += ' same-row';
        if (sameCol) cls += ' same-col';
        if (sameBox) cls += ' same-box';
        if (sameValHint) cls += ' same-value';
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
