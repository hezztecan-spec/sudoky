import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useWs } from '../useWs';

const GAME_TABS = [
  { key: 'tictactoe', label: '❌ Крестики' },
  { key: 'battleship', label: '🚢 Морской бой' },
  { key: 'reaction', label: '⚡ Реакция' },
  { key: 'memory', label: '🃏 Память' },
  { key: 'wordle', label: '📝 Слова' },
];

export default function Leaderboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'sudoku'; // sudoku | games
  const gameTab = searchParams.get('game') || 'tictactoe';

  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      if (mode === 'sudoku') {
        const data = await api.leaderboard();
        setLeaders(data);
      } else {
        const data = await api.gameLeaderboard(gameTab);
        setLeaders(data);
      }
    } catch { setLeaders([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [mode, gameTab]);

  useWs((msg) => {
    if (msg.type === 'leaderboard_update' && mode === 'sudoku') load();
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Рейтинг</h1>

      {/* Переключатель Судоку / Мини-игры */}
      <div className="flex gap-2">
        <button
          onClick={() => setSearchParams({ mode: 'sudoku' })}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${mode === 'sudoku' ? 'bg-black text-white' : 'bg-paper-200 hover:bg-paper-300'}`}
        >
          🧩 Судоку
        </button>
        <button
          onClick={() => setSearchParams({ mode: 'games', game: gameTab })}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${mode === 'games' ? 'bg-black text-white' : 'bg-paper-200 hover:bg-paper-300'}`}
        >
          🎮 Мини-игры
        </button>
      </div>

      {/* Табы мини-игр */}
      {mode === 'games' && (
        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
          {GAME_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setSearchParams({ mode: 'games', game: t.key })}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition ${
                gameTab === t.key ? 'bg-black text-white' : 'bg-paper-200 text-paper-700 hover:bg-paper-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="text-center text-paper-500 pt-6">Загрузка…</p>}

      {!loading && (
        <div className="card divide-y divide-paper-200 overflow-hidden">
          {leaders.length === 0 && <p className="p-6 text-center text-paper-500 text-sm">Пока пусто</p>}
          {leaders.map((u, i) => (
            <Link
              key={u.id}
              to={`/users/${u.id}`}
              className="flex items-center gap-3 p-3 sm:p-4 hover:bg-paper-100 dark:hover:bg-paper-800 transition"
            >
              <span className="w-7 text-center font-bold text-sm">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </span>
              <span className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold shrink-0 dark:bg-white dark:text-black">
                {u.username?.[0]?.toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{u.username}</p>
                {mode === 'sudoku' && <p className="text-xs text-paper-600">{u.rank} · {u.total_solved} решено</p>}
                {mode === 'games' && <p className="text-xs text-paper-600">{u.games_played || 0} игр</p>}
              </div>
              <div className="text-right">
                <p className="font-bold tabular-nums">{u.total_points}</p>
                <p className="text-xs text-paper-500">pts</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
