// Ротация судоку: каждые 2 часа генерируем новый набор (7 сложностей).
// Если для текущего слота уже есть — не генерируем повторно.

const db = require('../db');
const { generate, DIFFICULTY_CLUES } = require('./generator');

// Слот = 2-часовой интервал. Возвращает начало и конец текущего слота.
function currentSlot() {
  const now = new Date();
  const h = now.getUTCHours();
  const slotStart = new Date(now);
  slotStart.setUTCHours(Math.floor(h / 2) * 2, 0, 0, 0);
  const slotEnd = new Date(slotStart.getTime() + 2 * 60 * 60 * 1000);
  return { from: slotStart, to: slotEnd };
}

async function ensureCurrentPuzzles() {
  const { from, to } = currentSlot();
  const fromStr = from.toISOString();
  const toStr = to.toISOString();

  // Проверяем есть ли уже пазлы для этого слота
  const existing = await db.query(
    `SELECT COUNT(*)::int AS c FROM puzzles WHERE active_from = $1 AND active_to = $2`,
    [fromStr, toStr]
  );
  if (existing.rows[0].c >= 7) return; // уже есть

  const difficulties = Object.keys(DIFFICULTY_CLUES);
  for (const diff of difficulties) {
    // Проверяем конкретную сложность
    const ex = await db.query(
      `SELECT id FROM puzzles WHERE active_from=$1 AND active_to=$2 AND difficulty=$3 LIMIT 1`,
      [fromStr, toStr, diff]
    );
    if (ex.rows[0]) continue;

    const p = generate(diff);
    await db.query(
      `INSERT INTO puzzles (title, difficulty, kind, puzzle, solution, base_points, min_seconds, active_from, active_to)
       VALUES ($1,$2,'daily',$3,$4,$5,$6,$7,$8)`,
      [
        `${diff}`,
        diff,
        p.puzzle,
        p.solution,
        p.base_points,
        p.min_seconds,
        fromStr,
        toStr,
      ]
    );
  }
  console.log(`[rotation] generated puzzles for slot ${fromStr} — ${toStr}`);
}

module.exports = { ensureCurrentPuzzles, currentSlot };
