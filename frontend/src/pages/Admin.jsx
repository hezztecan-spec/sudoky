import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState({
    title: '',
    difficulty: 'medium',
    kind: 'daily',
    puzzle: '',
    solution: '',
    base_points: 100,
    min_seconds: 30,
    active_from: new Date().toISOString().slice(0, 10),
    active_to: new Date().toISOString().slice(0, 10),
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.adminStats().then(setStats).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    try {
      const res = await api.adminCreatePuzzle({
        ...form,
        base_points: Number(form.base_points),
        min_seconds: Number(form.min_seconds),
      });
      setMsg(`✓ Создано: ${res.title} (id ${res.id})`);
      setForm((f) => ({ ...f, title: '', puzzle: '', solution: '' }));
    } catch (err) {
      setMsg(`✗ ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">Админка</h1>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Игроки" value={stats.users} />
          <Stat label="Судоку" value={stats.puzzles} />
          <Stat label="Попытки" value={stats.attempts} />
          <Stat label="Решено" value={stats.solved} />
        </div>
      )}

      <section className="card p-5 space-y-4">
        <h2 className="text-lg font-semibold">Добавить судоку</h2>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Название">
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Сложность">
              <select className="input" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
                <option value="expert">expert</option>
              </select>
            </Field>
            <Field label="Тип">
              <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
                <option value="bonus">bonus</option>
              </select>
            </Field>
            <Field label="Базовые очки">
              <input className="input" type="number" value={form.base_points} onChange={(e) => setForm({ ...form, base_points: e.target.value })} />
            </Field>
            <Field label="Мин. секунд (анти-чит)">
              <input className="input" type="number" value={form.min_seconds} onChange={(e) => setForm({ ...form, min_seconds: e.target.value })} />
            </Field>
            <Field label="Активно с">
              <input className="input" type="date" value={form.active_from} onChange={(e) => setForm({ ...form, active_from: e.target.value })} />
            </Field>
            <Field label="Активно до">
              <input className="input" type="date" value={form.active_to} onChange={(e) => setForm({ ...form, active_to: e.target.value })} />
            </Field>
          </div>
          <Field label="Puzzle (81 символ, 0 = пусто)">
            <input className="input font-mono text-xs" value={form.puzzle} onChange={(e) => setForm({ ...form, puzzle: e.target.value })} />
          </Field>
          <Field label="Solution (81 символ)">
            <input className="input font-mono text-xs" value={form.solution} onChange={(e) => setForm({ ...form, solution: e.target.value })} />
          </Field>
          <button className="btn px-6" disabled={loading}>
            {loading ? 'Создаю…' : 'Создать'}
          </button>
        </form>
      </section>

      {msg && <p className="text-center text-sm text-paper-700">{msg}</p>}
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

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
