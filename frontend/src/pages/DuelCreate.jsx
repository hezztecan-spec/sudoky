import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const DIFFICULTIES = ['очень лёгкий', 'лёгкий', 'средний', 'сложный', 'очень сложный'];

export default function DuelCreate() {
  const nav = useNavigate();
  const [diff, setDiff] = useState('средний');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const create = async () => {
    setError('');
    setCreating(true);
    try {
      const d = await api.createDuel(diff);
      nav(`/duel/${d.id}`);
    } catch (e) {
      setError(e.message);
      setCreating(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <p className="text-5xl">⚔️</p>
        <h1 className="text-2xl font-bold">Дуэль 1 на 1</h1>
        <p className="text-paper-600 text-sm">
          Создай дуэль, поделись ссылкой с другом. Кто первый решит — победил.
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Сложность</label>
          <select className="input mt-1" value={diff} onChange={(e) => setDiff(e.target.value)}>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="btn w-full" onClick={create} disabled={creating}>
          {creating ? 'Создаю…' : 'Создать дуэль'}
        </button>
      </div>
    </div>
  );
}
