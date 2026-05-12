import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function PuzzleList() {
  const [puzzles, setPuzzles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextRotation, setNextRotation] = useState('');

  useEffect(() => {
    api.listPuzzles().then((data) => {
      setPuzzles(data);
      // Вычислим время до следующей ротации из active_to первого пазла
      if (data.length > 0 && data[0].active_to) {
        const to = new Date(data[0].active_to);
        updateCountdown(to);
        const t = setInterval(() => updateCountdown(to), 1000);
        return () => clearInterval(t);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function updateCountdown(to) {
    const diff = Math.max(0, Math.floor((to.getTime() - Date.now()) / 1000));
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    setNextRotation(`${h}ч ${String(m).padStart(2, '0')}м ${String(s).padStart(2, '0')}с`);
  }

  if (loading) return <p className="text-center text-paper-500 pt-10">Загрузка…</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Судоку</h1>
        {nextRotation && (
          <span className="chip text-xs">🔄 Новые через {nextRotation}</span>
        )}
      </div>
      <p className="text-paper-600 text-sm">7 уровней сложности. Новые поля каждые 2 часа. Пройденные недоступны.</p>
      {puzzles.length === 0 && <p className="text-paper-600 text-sm">Генерируем… обнови страницу через пару секунд.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {puzzles.map((p) => (
          p.solved ? (
            <div
              key={p.id}
              className="card p-4 space-y-2 opacity-50 cursor-not-allowed"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold line-through">{p.difficulty}</h3>
                <span className="chip">✓ пройдено</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="chip">{p.base_points} pts</span>
              </div>
            </div>
          ) : (
            <Link
              key={p.id}
              to={`/puzzles/${p.id}`}
              className="card p-4 space-y-2 hover:bg-paper-100 hover:shadow-md transition block"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{p.difficulty}</h3>
                <span className="chip-solid">{p.base_points}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="chip">⏱ мин. {p.min_seconds}с</span>
              </div>
            </Link>
          )
        ))}
      </div>
    </div>
  );
}
