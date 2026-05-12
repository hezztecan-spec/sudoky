import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const ACTION_TEXT = {
  solved_sudoku: (d) => `решил судоку «${d.difficulty || ''}» за ${d.time || '?'}`,
  won_game: (d) => `победил в ${d.gameType || 'игре'}`,
  achievement: (d) => `получил ачивку ${d.icon || ''} ${d.title || ''}`,
  joined: () => 'присоединился к платформе',
};

export default function Feed() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.feed().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center text-paper-500 pt-10">Загрузка…</p>;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold">📰 Лента</h1>
      {items.length === 0 && <p className="text-paper-500 text-sm">Пока пусто. Играйте — и тут появятся события!</p>}
      <div className="space-y-2">
        {items.map((item) => {
          const details = typeof item.details === 'string' ? JSON.parse(item.details) : item.details;
          const textFn = ACTION_TEXT[item.action];
          const text = textFn ? textFn(details) : item.action;
          const time = new Date(item.created_at).toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

          return (
            <div key={item.id} className="card p-3 flex items-center gap-3">
              <Link to={`/users/${item.user_id}`} className="shrink-0">
                <span className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold">
                  {item.username?.[0]?.toUpperCase()}
                </span>
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <Link to={`/users/${item.user_id}`} className="font-bold hover:underline">{item.username}</Link>
                  {' '}{text}
                </p>
                <p className="text-xs text-paper-500">{time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
