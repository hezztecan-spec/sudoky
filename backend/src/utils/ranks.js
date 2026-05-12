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

function calcPoints({ basePoints, difficulty, durationSeconds, minSeconds }) {
  // Бонус за скорость: быстрее 10 минут → больше очков
  const referenceTime = 600;
  const speed = Math.max(0.3, Math.min(2, referenceTime / Math.max(durationSeconds, minSeconds)));
  const total = Math.round(basePoints * speed);
  return Math.max(1, total);
}

module.exports = { RANKS, rankForPoints, calcPoints };
