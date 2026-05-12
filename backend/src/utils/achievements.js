const db = require('../db');

// Расширенный каталог ачивок
const CATALOG = [
  // Судоку
  { code: 'first_solve', title: 'Первый шаг', description: 'Реши первое судоку', icon: '🎯' },
  { code: 'speed_5min', title: 'Молния', description: 'Реши судоку быстрее 5 минут', icon: '⚡' },
  { code: 'speed_2min', title: 'Сверхзвук', description: 'Реши судоку быстрее 2 минут', icon: '🚀' },
  { code: 'solve_10', title: 'Десятка', description: 'Реши 10 судоку', icon: '🔟' },
  { code: 'solve_50', title: 'Полусотня', description: 'Реши 50 судоку', icon: '🏅' },
  { code: 'solve_100', title: 'Сотня', description: 'Реши 100 судоку', icon: '💯' },
  { code: 'expert_win', title: 'Укротитель', description: 'Реши экстремальное или невозможное', icon: '🧠' },
  { code: 'no_hints', title: 'Без подсказок', description: 'Реши судоку без подсказок и undo', icon: '🎖' },
  { code: 'no_mistakes', title: 'Безупречно', description: 'Реши судоку без единой ошибки', icon: '💎' },
  { code: 'all_difficulties', title: 'Универсал', description: 'Реши все 7 сложностей', icon: '🌈' },

  // Streak
  { code: 'streak_3', title: '3 дня подряд', description: 'Серия 3 дня', icon: '🔥' },
  { code: 'streak_7', title: 'Неделя', description: 'Серия 7 дней', icon: '🔥' },
  { code: 'streak_30', title: 'Месяц!', description: 'Серия 30 дней', icon: '🌟' },

  // Мультиплеер
  { code: 'first_duel_win', title: 'Дуэлянт', description: 'Выиграй первую дуэль/партию', icon: '⚔️' },
  { code: 'win_5_mp', title: 'Боец', description: 'Выиграй 5 мультиплеерных партий', icon: '🥊' },
  { code: 'win_20_mp', title: 'Чемпион', description: 'Выиграй 20 мультиплеерных партий', icon: '🏆' },
  { code: 'battleship_win', title: 'Адмирал', description: 'Выиграй в морской бой', icon: '🚢' },
  { code: 'ttt_win_streak_3', title: 'Хет-трик', description: '3 победы подряд в крестики-нолики', icon: '❌' },

  // Мини-игры
  { code: 'reaction_200', title: 'Рефлексы', description: 'Среднее время реакции < 200мс', icon: '⚡' },
  { code: 'memory_perfect', title: 'Фотопамять', description: 'Пройди память за 16 ходов (минимум)', icon: '🧠' },
  { code: 'wordle_1', title: 'Телепат', description: 'Угадай слово с первой попытки', icon: '🔮' },

  // Социальное
  { code: 'first_chat', title: 'Общительный', description: 'Напиши первое сообщение в чат', icon: '💬' },
  { code: 'night_owl', title: 'Сова', description: 'Реши судоку после полуночи', icon: '🦉' },
  { code: 'early_bird', title: 'Жаворонок', description: 'Реши судоку до 7 утра', icon: '🐦' },

  // Пасхалки
  { code: 'easter_42', title: '42', description: 'Ответ на главный вопрос', icon: '🌌' },
  { code: 'easter_1337', title: 'L33T', description: 'Набери ровно 1337 очков', icon: '👾' },
  { code: 'easter_speed_69', title: 'Nice', description: 'Реши судоку ровно за 69 секунд', icon: '😏' },
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

async function checkAfterSolve(userId, { durationSeconds, difficulty, totalSolved }) {
  const granted = [];
  const push = async (code) => {
    const g = await grant(userId, code);
    if (g) granted.push(code);
  };

  if (totalSolved === 1) await push('first_solve');
  if (durationSeconds && durationSeconds < 300) await push('speed_5min');
  if (durationSeconds && durationSeconds < 120) await push('speed_2min');
  if (totalSolved >= 10) await push('solve_10');
  if (totalSolved >= 50) await push('solve_50');
  if (totalSolved >= 100) await push('solve_100');
  if (['экстремальный', 'невозможный', 'expert'].includes(difficulty)) await push('expert_win');

  // Время суток
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5) await push('night_owl');
  if (hour >= 5 && hour < 7) await push('early_bird');

  // Пасхалка 69 секунд
  if (durationSeconds === 69) await push('easter_speed_69');

  // Проверяем streak
  const { rows: userRows } = await db.query('SELECT streak, total_points FROM users WHERE id=$1', [userId]);
  if (userRows[0]) {
    const streak = userRows[0].streak || 0;
    if (streak >= 3) await push('streak_3');
    if (streak >= 7) await push('streak_7');
    if (streak >= 30) await push('streak_30');
    // Пасхалка 1337
    if (userRows[0].total_points === 1337) await push('easter_1337');
  }

  return granted;
}

async function checkMultiplayerWin(userId, gameType) {
  const granted = [];
  const push = async (code) => {
    const g = await grant(userId, code);
    if (g) granted.push(code);
  };

  await push('first_duel_win');
  if (gameType === 'battleship') await push('battleship_win');

  // Считаем общие победы
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS wins FROM game_sessions WHERE winner_id=$1`,
    [userId]
  );
  const wins = rows[0]?.wins || 0;
  if (wins >= 5) await push('win_5_mp');
  if (wins >= 20) await push('win_20_mp');

  return granted;
}

module.exports = { CATALOG, ensureCatalog, grant, checkAfterSolve, checkMultiplayerWin };
