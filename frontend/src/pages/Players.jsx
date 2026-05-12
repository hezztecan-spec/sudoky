import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useOnline } from '../useOnline';

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const online = useOnline();
  const onlineIds = new Set(online.map((o) => o.id));

  useEffect(() => {
    // Используем leaderboard без фильтра — показывает всех кто хоть раз играл
    api.leaderboard().then((data) => {
      setPlayers(data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center text-paper-500 pt-10">Загрузка…</p>;

  // Сортируем: онлайн сверху
  const sorted = [...players].sort((a, b) => {
    const aOn = onlineIds.has(a.id) ? 1 : 0;
    const bOn = onlineIds.has(b.id) ? 1 : 0;
    return bOn - aOn;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Игроки</h1>
        <span className="chip">🟢 {online.length} онлайн</span>
      </div>

      <div className="card divide-y divide-paper-200 overflow-hidden">
        {sorted.length === 0 && <p className="p-6 text-center text-paper-500 text-sm">Пока никого нет</p>}
        {sorted.map((u) => (
          <Link
            key={u.id}
            to={`/users/${u.id}`}
            className="flex items-center gap-3 p-3 sm:p-4 hover:bg-paper-100 transition"
          >
            <div className="relative shrink-0">
              <span className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold">
                {u.username?.[0]?.toUpperCase()}
              </span>
              {onlineIds.has(u.id) && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{u.username}</p>
              <p className="text-xs text-paper-600">{u.rank} · {u.total_points} pts</p>
            </div>
            {onlineIds.has(u.id) && (
              <span className="text-xs text-emerald-600 font-medium shrink-0">онлайн</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
