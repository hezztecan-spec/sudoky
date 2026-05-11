import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../store';

export default function Profile() {
  const user = useAuth((s) => s.user);
  const [achievements, setAchievements] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.achievements().then(setAchievements).catch(() => {});
    api.dailyTasks().then(setTasks).catch(() => {});
    api.history().then(setHistory).catch(() => {});
  }, []);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="card p-5 flex items-center gap-4 flex-wrap">
        {user.picture ? (
          <img src={user.picture} alt="" className="w-16 h-16 rounded-full" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center text-2xl font-bold">
            {user.username?.[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-[180px]">
          <h1 className="text-xl font-bold">{user.username}</h1>
          <p className="text-sm text-ink-400 truncate">{user.phone}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="chip-solid">{user.rank}</span>
            <span className="chip">{user.total_points} pts</span>
            <span className="chip">{user.total_solved} решено</span>
            {user.best_time && <span className="chip">⚡ {user.best_time}с</span>}
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">📅 Задания дня</h2>
        {tasks.length === 0 && <p className="text-ink-400 text-sm">Пока нет заданий</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((t) => {
            const pct = Math.min(100, (t.progress / t.target) * 100);
            return (
              <div key={t.id} className={`card p-4 space-y-2 ${t.is_completed ? 'ring-1 ring-white/40' : ''}`}>
                <p className="font-medium text-sm">{t.title}</p>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-white transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-ink-400">
                  {t.progress}/{t.target} · +{t.reward_points} pts
                  {t.is_completed && <span className="ml-2">✓</span>}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">🏅 Ачивки</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {achievements.map((a) => (
            <div key={a.id} className={`card p-3 text-center space-y-1 ${a.earned ? '' : 'opacity-40'}`}>
              <p className="text-2xl">{a.icon}</p>
              <p className="text-sm font-medium">{a.title}</p>
              <p className="text-xs text-ink-400">{a.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">📜 История</h2>
        {history.length === 0 && <p className="text-ink-400 text-sm">Ещё не играли. Давай первое!</p>}
        <div className="card divide-y divide-white/5">
          {history.map((h) => (
            <div key={h.id} className="flex items-center gap-3 p-3">
              <span className="text-lg">{h.is_solved ? '✓' : '·'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm">{h.title}</p>
                <p className="text-xs text-ink-400">
                  {h.difficulty} · {h.duration_seconds ? `${Math.floor(h.duration_seconds / 60)}:${String(h.duration_seconds % 60).padStart(2, '0')}` : '—'}
                </p>
              </div>
              <span className="font-semibold tabular-nums text-sm">{h.points_awarded || 0}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
