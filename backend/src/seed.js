require('dotenv').config();
const db = require('./db');
const { ensureCatalog } = require('./utils/achievements');

const PUZZLES = [
  {
    title: 'Разминка',
    difficulty: 'easy',
    kind: 'daily',
    base_points: 80,
    min_seconds: 20,
    puzzle:   '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
    solution: '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
  },
  {
    title: 'Средний заплыв',
    difficulty: 'medium',
    kind: 'daily',
    base_points: 120,
    min_seconds: 40,
    puzzle:   '003020600900305001001806400008102900700000008006708200002609500800203009005010300',
    solution: '483921657967345821251876493548132976729564138136798245372689514814253769695417382',
  },
  {
    title: 'Недельный вызов',
    difficulty: 'hard',
    kind: 'weekly',
    base_points: 200,
    min_seconds: 60,
    puzzle:   '000260701680070090190004500820100040004602900050003028009300074040050036703018000',
    solution: '435269781682571493197834562826195347374682915951743628519326874248957136763418259',
  },
  {
    title: 'Эксперт',
    difficulty: 'expert',
    kind: 'bonus',
    base_points: 300,
    min_seconds: 90,
    puzzle:   '020608000580009700000040000370000500600000004008000013000020000009800036000306090',
    solution: '123678945584239761967145328372461589691583274458792613836924157219857436745316892',
  },
];

async function upsertPuzzles() {
  const today = new Date();
  const day = today.toISOString().slice(0, 10);
  const weekEnd = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);

  for (const p of PUZZLES) {
    const activeFrom = day;
    const activeTo = p.kind === 'weekly' ? weekEnd : day;
    const exists = await db.query(`SELECT id FROM puzzles WHERE puzzle=$1 LIMIT 1`, [p.puzzle]);
    if (exists.rows[0]) {
      await db.query(
        `UPDATE puzzles SET active_from=$1, active_to=$2 WHERE id=$3`,
        [activeFrom, activeTo, exists.rows[0].id]
      );
      continue;
    }
    await db.query(
      `INSERT INTO puzzles (title, difficulty, kind, puzzle, solution, base_points, min_seconds, active_from, active_to)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [p.title, p.difficulty, p.kind, p.puzzle, p.solution, p.base_points, p.min_seconds, activeFrom, activeTo]
    );
  }
  console.log('[seed] puzzles seeded');
}

async function promoteAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase();
  if (!email) return;
  const r = await db.query('UPDATE users SET is_admin=TRUE WHERE email=$1 RETURNING id', [email]);
  if (r.rowCount) console.log(`[seed] promoted admin: ${email}`);
  else console.log(`[seed] admin ${email} пока не зарегистрирован, войдёт через Google — затем пересидь.`);
}

async function run() {
  await ensureCatalog();
  await upsertPuzzles();
  await promoteAdmin();
  await db.pool.end();
  console.log('[seed] done');
}

run().catch(async (err) => {
  console.error('[seed] failed', err);
  try { await db.pool.end(); } catch {}
  process.exit(1);
});
