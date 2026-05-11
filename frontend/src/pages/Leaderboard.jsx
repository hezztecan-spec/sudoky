import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useWs } from '../useWs';
import { useOnline } from '../useOnline';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const online = useOnline();
  const onlineIds = new Set(online.map((o) => o.id));

  const load = () => api.leaderboard().then(setLeaders).catch(() => {}).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  useWs((msg) => {
    if (msg.type === 'leaderboard_update') load();
  });

  if (loading) return <p className="text-center text-paper-500 pt-10">Загрузка…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Топ игроков</h1>
        <span className="chip">🟢 {online.length} онлайн</span>
      </div>
      <div className="card divide-y divide-paper-200 overflow-hidden">
        {leaders.length === 0 && <p className="p-6 text-center text-paper-600 text-sm">Пока пусто. Будь первым!</p>}
        {leaders.map((u, i) => (
          <Link
            key={u.id}
            to={`/users/${u.id}`}
            className="flex items-center gap-3 p-3 sm:p-4 hover:bg-paper-100 transition"
          >
            <span className="w-7 text-center font-bold text-sm sm:text-base">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
            </span>
            <div className="relative shrink-0">
              <span className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold">
                {u.username?.[0]?.toUpperCase()}
              </span>
              {onlineIds.has(u.id) && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{u.username}</p>
              <p className="text-xs text-paper-600">{u.rank} · {u.total_solved} решено</p>
            </div>
            <div className="text-right">
              <p className="font-bold tabular-nums">{u.total_points}</p>
              <p className="text-xs text-paper-500">pts</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
