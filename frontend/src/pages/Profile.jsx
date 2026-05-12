import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../store';
import { getMuted, setMuted } from '../sfx';
import { useTheme } from '../useTheme';
import { LineChart, BarChart } from '../components/Chart';

export default function Profile() {
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const [achievements, setAchievements] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [byDiff, setByDiff] = useState([]);
  const [muted, setMutedState] = useState(getMuted());
  const { dark, toggle: toggleTheme } = useTheme();

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameMsg, setNameMsg] = useState('');

  useEffect(() => {
    api.achievements().then(setAchievements).catch(() => {});
    api.dailyTasks().then(setTasks).catch(() => {});
    api.history().then(setHistory).catch(() => {});
    api.myTimeline().then(setTimeline).catch(() => {});
    api.myByDifficulty().then(setByDiff).catch(() => {});
  }, []);

  const saveName = async () => {
    setNameMsg('');
    try {
      const r = await api.updateUsername(newName.trim());
      setUser({ ...user, username: r.username });
      setEditingName(false);
    } catch (e) {
      setNameMsg(e.message);
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  if (!user) return null;

  const lvl = user.level;

  return (
    <div className="space-y-6">
      {/* Header + XP */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center text-2xl font-bold">
            {user.username?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-[180px]">
            {editingName ? (
              <div className="space-y-2">
                <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={20} />
                <div className="flex gap-2">
                  <button className="btn py-1.5 px-3 text-sm" onClick={saveName}>Сохранить</button>
                  <button className="btn-ghost py-1.5 px-3 text-sm" onClick={() => { setEditingName(false); setNameMsg(''); }}>
                    Отмена
                  </button>
                </div>
                {nameMsg && <p className="text-red-600 text-xs">{nameMsg}</p>}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold">{user.username}</h1>
                  <button
                    className="text-xs text-paper-600 hover:text-black underline"
                    onClick={() => { setEditingName(true); setNewName(user.username); }}
                  >
                    изменить
                  </button>
                </div>
                <p className="text-sm text-paper-600 truncate">{user.phone}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="chip-solid">{user.rank}</span>
                  <span className="chip">{user.total_points} pts</span>
                  <span className="chip">{user.total_solved} решено</span>
                  {user.best_time && <span className="chip">⚡ {user.best_time}с</span>}
                </div>
              </>
            )}
          </div>
        </div>

        {/* XP bar */}
        {lvl && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold">Уровень {lvl.level}</span>
              <span className="text-paper-600">{lvl.inLevel} / {lvl.needed} XP</span>
            </div>
            <div className="h-2 rounded-full bg-paper-200 overflow-hidden">
              <div className="h-full bg-black transition-all" style={{ width: `${lvl.percent}%` }} />
            </div>
          </div>
        )}

        {/* Settings row */}
        <div className="flex flex-col gap-3 pt-2 border-t border-paper-200 dark:border-white/10">
          {user.streak > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm">🔥 Серия дней</span>
              <span className="font-bold">{user.streak}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm">🔊 Звуки и вибрация</span>
            <button
              type="button"
              className={`shrink-0 w-12 h-7 rounded-full transition relative ${!muted ? 'bg-black dark:bg-white' : 'bg-paper-300 dark:bg-paper-700'}`}
              onClick={toggleMute}
            >
              <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white dark:bg-black shadow transition-all ${!muted ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">🌙 Тёмная тема</span>
            <button
              type="button"
              className={`shrink-0 w-12 h-7 rounded-full transition relative ${dark ? 'bg-black dark:bg-white' : 'bg-paper-300 dark:bg-paper-700'}`}
              onClick={toggleTheme}
            >
              <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white dark:bg-black shadow transition-all ${dark ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Graphs */}
      {timeline.length > 0 && (
        <section className="card p-4 space-y-2">
          <h2 className="text-sm font-semibold">📈 Среднее время (14 дней)</h2>
          <LineChart data={timeline} xKey="day" yKey="avg_time" label="сек" />
        </section>
      )}

      {byDiff.length > 0 && (
        <section className="card p-4 space-y-2">
          <h2 className="text-sm font-semibold">📊 По сложностям</h2>
          <BarChart data={byDiff} xKey="difficulty" yKey="count" />
        </section>
      )}

      {/* Daily tasks */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">📅 Задания дня</h2>
        {tasks.length === 0 && <p className="text-paper-600 text-sm">Нет заданий</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((t) => {
            const pct = Math.min(100, (t.progress / t.target) * 100);
            return (
              <div key={t.id} className={`card p-4 space-y-2 ${t.is_completed ? 'ring-2 ring-black' : ''}`}>
                <p className="font-medium text-sm">{t.title}</p>
                <div className="h-1.5 rounded-full bg-paper-200 overflow-hidden">
                  <div className="h-full bg-black transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-paper-600">
                  {t.progress}/{t.target} · +{t.reward_points} pts {t.is_completed && '✓'}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Achievements */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">🏅 Ачивки</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {achievements.map((a) => (
            <div key={a.id} className={`card p-3 text-center space-y-1 ${a.earned ? '' : 'opacity-40'}`}>
              <p className="text-2xl">{a.icon}</p>
              <p className="text-sm font-medium">{a.title}</p>
              <p className="text-xs text-paper-600">{a.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* History */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">📜 История</h2>
        {history.length === 0 && <p className="text-paper-600 text-sm">Пусто</p>}
        <div className="card divide-y divide-paper-200">
          {history.map((h) => (
            <div key={h.id} className="flex items-center gap-3 p-3">
              <span className="text-lg">{h.is_solved ? '✓' : '·'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm">{h.title}</p>
                <p className="text-xs text-paper-600">
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
