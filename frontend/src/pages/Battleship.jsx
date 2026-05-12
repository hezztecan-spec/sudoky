import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../store';
import { useOnline } from '../useOnline';

export default function Battleship() {
  const user = useAuth((s) => s.user);
  const online = useOnline();
  const nav = useNavigate();
  const [sending, setSending] = useState(null);

  const challenge = async (opponentId) => {
    setSending(opponentId);
    try {
      const { sessionId } = await api.challenge(opponentId, 'battleship');
      nav(`/game/${sessionId}`);
    } catch (e) {
      alert(e.message);
    }
    setSending(null);
  };

  const others = online.filter((o) => o.id !== user?.id);

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <p className="text-5xl">🚢</p>
        <h1 className="text-2xl font-bold">Морской бой</h1>
        <p className="text-paper-600 text-sm">Выбери соперника. Расставь корабли. Потопи флот врага.</p>
      </div>

      <div className="card divide-y divide-paper-200">
        {others.length === 0 && (
          <p className="p-6 text-center text-paper-500 text-sm">Никого нет онлайн. Позови друга!</p>
        )}
        {others.map((o) => (
          <div key={o.id} className="flex items-center gap-3 p-3">
            <span className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold shrink-0">
              {o.username?.[0]?.toUpperCase()}
            </span>
            <span className="flex-1 font-medium">{o.username}</span>
            <button
              className="btn py-1.5 px-3 text-sm"
              disabled={sending === o.id}
              onClick={() => challenge(o.id)}
            >
              {sending === o.id ? '…' : 'Вызвать'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
