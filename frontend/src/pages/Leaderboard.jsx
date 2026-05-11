import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useWs } from '../useWs';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.leaderboard().then(setLeaders).catch(() => {}).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  useWs((msg) => {
    if (msg.type === 'leaderboard_update') load();
  });

  if (loading) return <p className="text-center text-ink-400 pt-10">Загрузка…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Топ игроков</h1>
      <div className="card divide-y divide-white/5">
        {leaders.length === 0 && <p className="p-6 text-center text-ink-400 text-sm">Пока пусто. Будь первым!</p>}
        {leaders.map((u, i) => (
          <Link
            key={u.id}
            to={`/users/${u.id}`}
            className="flex items-center gap-3 p-3 sm:p-4 hover:bg-white/5 transition"
          >
            <span className="w-7 text-center font-bold text-sm sm:text-base">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
            </span>
            <Avatar user={u} />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{u.username}</p>
              <p className="text-xs text-ink-400">{u.rank} · {u.total_solved} решено</p>
            </div>
            <div className="text-right">
              <p className="font-bold tabular-nums">{u.total_points}</p>
              <p className="text-xs text-ink-500">pts</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Avatar({ user }) {
  if (user.picture) {
    return <img src={user.picture} alt="" className="w-9 h-9 rounded-full shrink-0" />;
  }
  return (
    <span className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center text-sm font-bold shrink-0">
      {user.username?.[0]?.toUpperCase()}
    </span>
  );
}
