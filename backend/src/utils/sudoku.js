// Утилиты для валидации судоку на сервере.
// Судоку хранится как строка из 81 символа: '.' или '0' — пусто, '1'..'9' — цифра.

function normalize(str) {
  if (typeof str !== 'string') return null;
  const s = str.replace(/\s+/g, '').replace(/\./g, '0');
  if (s.length !== 81) return null;
  if (!/^[0-9]{81}$/.test(s)) return null;
  return s;
}

function isValidSolution(sol) {
  const s = normalize(sol);
  if (!s) return false;
  if (s.includes('0')) return false;

  const rows = Array.from({ length: 9 }, () => new Set());
  const cols = Array.from({ length: 9 }, () => new Set());
  const boxes = Array.from({ length: 9 }, () => new Set());

  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9);
    const c = i % 9;
    const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
    const ch = s[i];
    if (rows[r].has(ch) || cols[c].has(ch) || boxes[b].has(ch)) return false;
    rows[r].add(ch);
    cols[c].add(ch);
    boxes[b].add(ch);
  }
  return true;
}

// Проверяет что решение согласовано с пазлом: все заранее заданные цифры совпадают.
function matchesPuzzle(puzzle, solution) {
  const p = normalize(puzzle);
  const s = normalize(solution);
  if (!p || !s) return false;
  for (let i = 0; i < 81; i++) {
    if (p[i] !== '0' && p[i] !== s[i]) return false;
  }
  return true;
}

// Эталонная проверка решения пользователя
function checkUserSolution({ puzzle, correctSolution, userSolution }) {
  if (!isValidSolution(correctSolution)) return { ok: false, reason: 'bad_reference' };
  if (!matchesPuzzle(puzzle, correctSolution)) return { ok: false, reason: 'bad_reference' };

  const normalized = normalize(userSolution);
  if (!normalized) return { ok: false, reason: 'invalid_format' };
  if (!matchesPuzzle(puzzle, normalized)) return { ok: false, reason: 'puzzle_mismatch' };
  if (!isValidSolution(normalized)) return { ok: false, reason: 'invalid_solution' };
  if (normalized !== normalize(correctSolution)) return { ok: false, reason: 'wrong_answer' };
  return { ok: true };
}

module.exports = {
  normalize,
  isValidSolution,
  matchesPuzzle,
  checkUserSolution,
};
