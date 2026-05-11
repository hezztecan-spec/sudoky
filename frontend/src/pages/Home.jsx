import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../store';

export default function Home() {
  const user = useAuth((s) => s.user);
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    if (!user) return;
    api.leaderboard().then((d) => setLeaders(d.slice(0, 5))).catch(() => {});
  }, [user]);

  return (
    <div className="space-y-10">
      <section className="text-center py-10 sm:py-16 space-y-5">
        <div className="inline-block text-6xl animate-wiggle">🧩</div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
          Летний чемпионат <br className="sm:hidden" /> по судоку
        </h1>
        <p className="text-ink-400 max-w-md mx-auto text-sm sm:text-base px-4">
          Одно судоку в день. Решил быстрее — получил больше очков.
          Никакой магии, только циферки.
        </p>
        <div className="flex justify-center gap-3 pt-3 flex-wrap">
          {!user ? (
            <Link to="/login" className="btn text-base px-6 py-3">Войти через Google</Link>
          ) : (
            <Link to="/puzzles" className="btn text-base px-6 py-3">Поехали →</Link>
          )}
        </div>
      </section>

      {user && leaders.length > 0 && (
        <section className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">🔥 Топ-5</h2>
            <Link to="/leaderboard" className="text-sm text-ink-400 hover:text-white">Все →</Link>
          </div>
          <div className="space-y-1">
            {leaders.map((u, i) => (
              <Link
                key={u.id}
                to={`/users/${u.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition"
              >
                <span className="w-6 text-center font-bold">{i + 1}</span>
                <Avatar user={u} size={8} />
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

function Avatar({ user, size = 8 }) {
  const dim = `${size * 4}px`;
  if (user.picture) {
    return <img src={user.picture} alt="" className="rounded-full shrink-0" style={{ width: dim, height: dim }} />;
  }
  return (
    <span
      className="rounded-full flex items-center justify-center text-xs font-bold bg-white text-black shrink-0"
      style={{ width: dim, height: dim }}
    >
      {user.username?.[0]?.toUpperCase()}
    </span>
  );
}
