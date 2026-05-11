import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';

export default function PublicProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.userById(id).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-center text-ink-400 pt-10">Загрузка…</p>;
  if (!data) return <p className="text-center text-red-400 pt-10">Пользователь не найден</p>;

  const { user, stats, achievements } = data;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="card p-5 flex items-center gap-4 flex-wrap">
        {user.picture ? (
          <img src={user.picture} alt="" className="w-16 h-16 rounded-full" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center text-2xl font-bold">
            {user.username?.[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold">{user.username}</h1>
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="chip-solid">{user.rank}</span>
            <span className="chip">{user.total_points} pts</span>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Попытки" value={stats.attempts} />
          <Stat label="Решено" value={stats.solved} />
          <Stat label="Среднее" value={stats.avg_time ? `${Math.round(stats.avg_time)}с` : '—'} />
          <Stat label="Лучшее" value={stats.best_time ? `${stats.best_time}с` : '—'} />
        </div>
      )}

      {achievements?.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">🏅 Ачивки</h2>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
            {achievements.map((a) => (
              <div key={a.code} className="card p-3 text-center space-y-1">
                <p className="text-xl">{a.icon}</p>
                <p className="text-sm font-medium">{a.title}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card p-4 text-center">
      <p className="label">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
