import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Admin() {
  const [tab, setTab] = useState('stats'); // stats | users | puzzle
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    title: '', difficulty: 'medium', kind: 'daily', puzzle: '', solution: '',
    base_points: 100, min_seconds: 30,
    active_from: new Date().toISOString().slice(0, 10),
    active_to: new Date().toISOString().slice(0, 10),
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.adminStats().then(setStats).catch(() => {});
  }, []);

  const loadUsers = () => api.adminUsers().then(setUsers).catch(() => {});

  useEffect(() => { if (tab === 'users') loadUsers(); }, [tab]);

  const submitPuzzle = async (e) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    try {
      const res = await api.adminCreatePuzzle({ ...form, base_points: Number(form.base_points), min_seconds: Number(form.min_seconds) });
      setMsg(`✓ Создано: ${res.title} (id ${res.id})`);
      setForm((f) => ({ ...f, title: '', puzzle: '', solution: '' }));
    } catch (err) { setMsg(`✗ ${err.message}`); }
    setLoading(false);
  };

  const updateUser = async (id, field, value) => {
    try {
      await api.adminUpdateUser(id, { [field]: value });
      loadUsers();
    } catch (e) { alert(e.message); }
  };

  const deleteUser = async (id, username) => {
    if (!confirm(`Удалить ${username}? Это необратимо.`)) return;
    await api.adminDeleteUser(id);
    loadUsers();
  };

  const resetPoints = async (id) => {
    if (!confirm('Сбросить все очки?')) return;
    await api.adminResetPoints(id);
    loadUsers();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">Админка</h1>

      {/* Tabs */}
      <div className="flex gap-1">
        {['stats', 'users', 'puzzle'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-black text-white' : 'bg-paper-200 hover:bg-paper-300'}`}>
            {t === 'stats' ? '📊 Статистика' : t === 'users' ? '👥 Пользователи' : '🧩 Добавить судоку'}
          </button>
        ))}
      </div>

      {/* Stats */}
      {tab === 'stats' && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Игроки" value={stats.users} />
          <Stat label="Судоку" value={stats.puzzles} />
          <Stat label="Попытки" value={stats.attempts} />
          <Stat label="Решено" value={stats.solved} />
        </div>
      )}

      {/* Users management */}
      {tab === 'users' && (
        <div className="card divide-y divide-paper-200 overflow-hidden">
          {users.map((u) => (
            <div key={u.id} className="p-3 sm:p-4 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {u.username?.[0]?.toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{u.username} {u.is_admin && <span className="text-xs text-paper-500">(админ)</span>}</p>
                  <p className="text-xs text-paper-500">{u.phone} · {u.total_points} pts · streak {u.streak || 0}</p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  <button className="text-xs px-2 py-1 rounded bg-paper-200 hover:bg-paper-300" onClick={() => {
                    const name = prompt('Новый ник:', u.username);
                    if (name) updateUser(u.id, 'username', name);
                  }}>✏️ Ник</button>
                  <button className="text-xs px-2 py-1 rounded bg-paper-200 hover:bg-paper-300" onClick={() => {
                    const pts = prompt('Очки:', u.total_points);
                    if (pts !== null) updateUser(u.id, 'total_points', parseInt(pts, 10));
                  }}>💰 Очки</button>
                  <button className="text-xs px-2 py-1 rounded bg-paper-200 hover:bg-paper-300" onClick={() => updateUser(u.id, 'is_admin', !u.is_admin)}>
                    {u.is_admin ? '👤 Убрать админ' : '🛡 Сделать админ'}
                  </button>
                  <button className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200" onClick={() => resetPoints(u.id)}>↻ Сброс</button>
                  <button className="text-xs px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200" onClick={() => deleteUser(u.id, u.username)}>🗑</button>
                </div>
              </div>
              <p className="text-xs text-paper-400">
                Зарегистрирован: {new Date(u.created_at).toLocaleDateString('ru')}
                {u.last_active_date && ` · Последний визит: ${new Date(u.last_active_date).toLocaleDateString('ru')}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add puzzle */}
      {tab === 'puzzle' && (
        <section className="card p-5 space-y-4">
          <h2 className="text-lg font-semibold">Добавить судоку</h2>
          <form onSubmit={submitPuzzle} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Название"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="Сложность">
                <select className="input" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                  <option value="easy">easy</option><option value="medium">medium</option>
                  <option value="hard">hard</option><option value="expert">expert</option>
                </select>
              </Field>
              <Field label="Тип">
                <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                  <option value="daily">daily</option><option value="weekly">weekly</option><option value="bonus">bonus</option>
                </select>
              </Field>
              <Field label="Очки"><input className="input" type="number" value={form.base_points} onChange={(e) => setForm({ ...form, base_points: e.target.value })} /></Field>
              <Field label="Мин. сек"><input className="input" type="number" value={form.min_seconds} onChange={(e) => setForm({ ...form, min_seconds: e.target.value })} /></Field>
              <Field label="С"><input className="input" type="date" value={form.active_from} onChange={(e) => setForm({ ...form, active_from: e.target.value })} /></Field>
              <Field label="До"><input className="input" type="date" value={form.active_to} onChange={(e) => setForm({ ...form, active_to: e.target.value })} /></Field>
            </div>
            <Field label="Puzzle (81)"><input className="input font-mono text-xs" value={form.puzzle} onChange={(e) => setForm({ ...form, puzzle: e.target.value })} /></Field>
            <Field label="Solution (81)"><input className="input font-mono text-xs" value={form.solution} onChange={(e) => setForm({ ...form, solution: e.target.value })} /></Field>
            <button className="btn px-6" disabled={loading}>{loading ? '…' : 'Создать'}</button>
          </form>
        </section>
      )}

      {msg && <p className="text-center text-sm text-paper-700">{msg}</p>}
    </div>
  );
}

function Stat({ label, value }) {
  return <div className="card p-4 text-center"><p className="label">{label}</p><p className="text-xl font-bold">{value}</p></div>;
}
function Field({ label, children }) {
  return <label className="block space-y-1"><span className="label">{label}</span>{children}</label>;
}
