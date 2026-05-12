import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../store';
import { useOnline } from '../useOnline';

export default function Home() {
  const user = useAuth((s) => s.user);
  const [leaders, setLeaders] = useState([]);
  const online = useOnline();

  useEffect(() => {
    api.leaderboard().then((d) => setLeaders(d.slice(0, 5))).catch(() => {});
  }, []);

  return (
    <div className="space-y-10">
      <section className="text-center py-10 sm:py-14 space-y-5">
        <div className="inline-block text-6xl animate-wiggle">🧩</div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">играй.лето</h1>
        <p className="text-paper-600 max-w-md mx-auto text-sm sm:text-base px-4">
          Летний чемпионат по судоку. Решай ежедневные головоломки, набирай очки, соревнуйся с друзьями.
        </p>
        {online.length > 0 && (
          <p className="text-xs text-paper-500">
            🟢 Сейчас онлайн: {online.map((o) => o.username).join(', ')}
          </p>
        )}
        <div className="flex justify-center gap-3 pt-3 flex-wrap">
          {!user ? (
            <Link to="/login" className="btn text-base px-6 py-3">Войти</Link>
          ) : (
            <Link to="/sudoku" className="btn text-base px-6 py-3">Играть в судоку →</Link>
          )}
          {user && (
            <Link to="/games" className="btn-ghost text-base px-6 py-3">Мини-игры 🎮</Link>
          )}
        </div>
      </section>

      {leaders.length > 0 && (
        <section className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">🏆 Топ судоку</h2>
            <Link to="/leaderboard" className="text-sm text-paper-600 hover:text-black">Все →</Link>
          </div>
          <div className="space-y-1">
            {leaders.map((u, i) => (
              <Link
                key={u.id}
                to={`/users/${u.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-paper-100 transition"
              >
                <span className="w-6 text-center font-bold">{i + 1}</span>
                <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {u.username?.[0]?.toUpperCase()}
                </span>
                <span className="flex-1 font-medium truncate">{u.username}</span>
                <span className="font-semibold tabular-nums">{u.total_points}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
