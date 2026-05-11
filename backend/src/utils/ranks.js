// Ранги на основе суммарных очков
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

// Очки: чем сложнее и быстрее — тем больше.
function calcPoints({ basePoints, difficulty, durationSeconds, minSeconds }) {
  const diffMult = { easy: 1, medium: 1.4, hard: 1.8, expert: 2.4 }[difficulty] || 1;
  // Бонус за скорость: быстрее относительно 10 минут → больше очков
  const referenceTime = 600;
  const speed = Math.max(0.3, Math.min(2, referenceTime / Math.max(durationSeconds, minSeconds)));
  const total = Math.round(basePoints * diffMult * speed);
  return total;
}

module.exports = { RANKS, rankForPoints, calcPoints };
