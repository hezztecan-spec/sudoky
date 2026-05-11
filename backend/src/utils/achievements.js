const db = require('../db');

// Каталог всех ачивок
const CATALOG = [
  { code: 'first_solve', title: 'Первый шаг', description: 'Реши первое судоку', icon: '🎯' },
  { code: 'speed_5min', title: 'Молния', description: 'Реши судоку быстрее 5 минут', icon: '⚡' },
  { code: 'solve_10', title: 'Десятка', description: 'Реши 10 судоку', icon: '🔟' },
  { code: 'solve_50', title: 'Полусотня', description: 'Реши 50 судоку', icon: '🏅' },
  { code: 'expert_win', title: 'Укротитель эксперта', description: 'Реши судоку уровня expert', icon: '🧠' },
  { code: 'daily_streak_7', title: 'Неделя подряд', description: 'Заходи 7 дней подряд и решай ежедневное', icon: '🔥' },
  { code: 'podium', title: 'Пьедестал', description: 'Попади в топ-3 сезона', icon: '🏆' },
];

async function ensureCatalog() {
  for (const a of CATALOG) {
    await db.query(
      `INSERT INTO achievements (code, title, description, icon)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (code) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, icon=EXCLUDED.icon`,
      [a.code, a.title, a.description, a.icon]
    );
  }
}

async function grant(userId, code) {
  const ach = await db.query('SELECT id FROM achievements WHERE code=$1', [code]);
  if (!ach.rows[0]) return null;
  const res = await db.query(
    `INSERT INTO user_achievements (user_id, achievement_id)
     VALUES ($1,$2)
     ON CONFLICT DO NOTHING RETURNING *`,
    [userId, ach.rows[0].id]
  );
  return res.rows[0] || null;
}

// Проверка после успешного решения
async function checkAfterSolve(userId, { durationSeconds, difficulty, totalSolved }) {
  const granted = [];
  const push = async (code) => {
    const g = await grant(userId, code);
    if (g) granted.push(code);
  };

  if (totalSolved === 1) await push('first_solve');
  if (durationSeconds && durationSeconds < 300) await push('speed_5min');
  if (totalSolved >= 10) await push('solve_10');
  if (totalSolved >= 50) await push('solve_50');
  if (difficulty === 'expert') await push('expert_win');

  return granted;
}

module.exports = { CATALOG, ensureCatalog, grant, checkAfterSolve };
