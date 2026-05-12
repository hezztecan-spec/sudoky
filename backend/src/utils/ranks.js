const RANKS = [
  { threshold: 0, name: 'Новичок' },
  { threshold: 200, name: 'Ученик' },
  { threshold: 600, name: 'Любитель' },
  { threshold: 1500, name: 'Эксперт' },
  { threshold: 3000, name: 'Мастер' },
  { threshold: 6000, name: 'Гроссмейстер' },
  { threshold: 10000, name: 'Легенда' },
];

function rankForPoints(points) {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (points >= r.threshold) current = r;
  }
  return current.name;
}

// Уровень: каждый следующий стоит больше. level * 100 очков.
// Уровень 1 = 0-99, уровень 2 = 100-299, уровень 3 = 300-599, ...
// Формула: threshold(n) = 50 * n * (n - 1) = 0, 100, 300, 600, 1000, 1500...
function levelForPoints(points) {
  // Находим максимальное n такое что 50*n*(n-1) <= points
  const n = Math.floor((1 + Math.sqrt(1 + (points * 8) / 50)) / 2);
  return Math.max(1, n);
}

function levelInfo(points) {
  const level = levelForPoints(points);
  const current = 50 * level * (level - 1);
  const next = 50 * (level + 1) * level;
  const inLevel = points - current;
  const needed = next - current;
  return { level, inLevel, needed, nextAt: next, percent: Math.round((inLevel / needed) * 100) };
}

function calcPoints({ basePoints, difficulty, durationSeconds, minSeconds }) {
  // Бонус за скорость: быстрее 10 минут → больше очков
  const referenceTime = 600;
  const speed = Math.max(0.3, Math.min(2, referenceTime / Math.max(durationSeconds, minSeconds)));
  const total = Math.round(basePoints * speed);
  return Math.max(1, total);
}

module.exports = { RANKS, rankForPoints, calcPoints, levelInfo, levelForPoints };
