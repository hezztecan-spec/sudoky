// Генератор судоку. Создаёт случайное решение и убирает клетки по сложности.

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function solve(board) {
  const empty = board.indexOf(0);
  if (empty === -1) return true;
  const row = Math.floor(empty / 9);
  const col = empty % 9;
  const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (const n of nums) {
    if (isValid(board, empty, row, col, box, n)) {
      board[empty] = n;
      if (solve(board)) return true;
      board[empty] = 0;
    }
  }
  return false;
}

function isValid(board, idx, row, col, box, n) {
  for (let i = 0; i < 9; i++) {
    if (board[row * 9 + i] === n) return false;
    if (board[i * 9 + col] === n) return false;
  }
  const br = Math.floor(box / 3) * 3;
  const bc = (box % 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (board[r * 9 + c] === n) return false;
    }
  }
  return true;
}

function countSolutions(board, limit = 2) {
  const empty = board.indexOf(0);
  if (empty === -1) return 1;
  const row = Math.floor(empty / 9);
  const col = empty % 9;
  const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
  let count = 0;
  for (let n = 1; n <= 9; n++) {
    if (isValid(board, empty, row, col, box, n)) {
      board[empty] = n;
      count += countSolutions(board, limit - count);
      board[empty] = 0;
      if (count >= limit) return count;
    }
  }
  return count;
}

// Сложности: сколько клеток убираем
const DIFFICULTY_CLUES = {
  'очень лёгкий': { remove: 30, min_seconds: 15, base_points: 50 },
  'лёгкий':       { remove: 38, min_seconds: 20, base_points: 80 },
  'средний':      { remove: 44, min_seconds: 30, base_points: 120 },
  'сложный':      { remove: 50, min_seconds: 45, base_points: 180 },
  'очень сложный':{ remove: 54, min_seconds: 60, base_points: 250 },
  'экстремальный':{ remove: 58, min_seconds: 90, base_points: 350 },
  'невозможный':  { remove: 62, min_seconds: 120, base_points: 500 },
};

function generate(difficulty = 'средний') {
  const config = DIFFICULTY_CLUES[difficulty] || DIFFICULTY_CLUES['средний'];

  // Генерируем полное решение
  const solution = new Array(81).fill(0);
  solve(solution);

  // Убираем клетки
  const puzzle = [...solution];
  const indices = shuffle(Array.from({ length: 81 }, (_, i) => i));
  let removed = 0;

  for (const idx of indices) {
    if (removed >= config.remove) break;
    const backup = puzzle[idx];
    puzzle[idx] = 0;
    // Проверяем единственность решения (для сложных — можем пропустить для скорости)
    if (config.remove <= 54) {
      const test = [...puzzle];
      if (countSolutions(test, 2) !== 1) {
        puzzle[idx] = backup;
        continue;
      }
    }
    removed++;
  }

  return {
    puzzle: puzzle.map((n) => String(n)).join(''),
    solution: solution.map((n) => String(n)).join(''),
    difficulty,
    base_points: config.base_points,
    min_seconds: config.min_seconds,
  };
}

module.exports = { generate, DIFFICULTY_CLUES };
