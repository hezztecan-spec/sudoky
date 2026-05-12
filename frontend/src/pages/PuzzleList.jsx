import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function PuzzleList() {
  const [puzzles, setPuzzles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextRotation, setNextRotation] = useState('');

  useEffect(() => {
    let interval;
    api.listPuzzles().then((data) => {
      setPuzzles(data);
      if (data.length > 0 && data[0].active_to) {
        const to = new Date(data[0].active_to);
        const update = () => {
          const diff = Math.max(0, Math.floor((to.getTime() - Date.now()) / 1000));
          const h = Math.floor(diff / 3600);
          const m = Math.floor((diff % 3600) / 60);
          const s = diff % 60;
          setNextRotation(`${h}ч ${String(m).padStart(2, '0')}м ${String(s).padStart(2, '0')}с`);
        };
        update();
        interval = setInterval(update, 1000);
      }
    }).catch(() => {}).finally(() => setLoading(false));
    return () => clearInterval(interval);
  }, []);

  if (loading) return <p className="text-center text-paper-500 pt-10">Загрузка…</p>;

  // Разделяем: незавершённые сверху
  const inProgress = puzzles.filter((p) => p.in_progress && !p.solved);
  const available = puzzles.filter((p) => !p.in_progress && !p.solved);
  const solved = puzzles.filter((p) => p.solved);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">🧩 Судоку</h1>
        {nextRotation && <span className="chip text-xs">🔄 Новые через {nextRotation}</span>}
      </div>
      <p className="text-paper-600 text-sm">7 уровней сложности. Новые поля каждые 2 часа.</p>

      {puzzles.length === 0 && <p className="text-paper-600 text-sm">Генерируем… обнови через пару секунд.</p>}

      {/* Незавершённые — кнопка Продолжить */}
      {inProgress.length > 0 && (
        <section className="space-y-2">
          <p className="text-sm font-semibold text-paper-700">▶ Продолжить</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inProgress.map((p) => (
              <Link
                key={p.id}
                to={`/puzzles/${p.id}`}
                className="card p-4 space-y-2 border-2 border-emerald-400 hover:shadow-md transition block"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{p.difficulty}</h3>
                  <span className="chip text-xs text-emerald-600 border-emerald-300">▶ в процессе</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="chip-solid">{p.base_points}</span>
                  <span className="chip">⏱ мин. {p.min_seconds}с</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Доступные */}
      {available.length > 0 && (
        <section className="space-y-2">
          {inProgress.length > 0 && <p className="text-sm font-semibold text-paper-700">Новые</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((p) => (
              <Link
                key={p.id}
                to={`/puzzles/${p.id}`}
                className="card p-4 space-y-2 hover:bg-paper-50 hover:shadow-md transition block"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{p.difficulty}</h3>
                  <span className="chip-solid">{p.base_points}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="chip">⏱ мин. {p.min_seconds}с</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Пройденные */}
      {solved.length > 0 && (
        <section className="space-y-2">
          <p className="text-sm font-semibold text-paper-700">✓ Пройдено</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {solved.map((p) => (
              <div key={p.id} className="card p-4 space-y-2 opacity-50">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold line-through">{p.difficulty}</h3>
                  <span className="chip">✓</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
