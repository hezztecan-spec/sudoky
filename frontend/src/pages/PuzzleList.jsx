import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function PuzzleList() {
  const [puzzles, setPuzzles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listPuzzles().then(setPuzzles).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center text-ink-400 pt-10">Загрузка…</p>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Судоку</h1>
      {puzzles.length === 0 && <p className="text-ink-400 text-sm">Пока ничего нет. Админ, ау!</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {puzzles.map((p) => (
          <Link
            key={p.id}
            to={`/puzzles/${p.id}`}
            className="card p-4 space-y-2 hover:bg-ink-700/60 transition block"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{p.title}</h3>
              <span className="chip-solid">{p.base_points}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="chip">{p.difficulty}</span>
              <span className="chip">{p.kind}</span>
            </div>
            <p className="text-xs text-ink-500">
              {p.active_from?.slice(0, 10)} — {p.active_to?.slice(0, 10)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
