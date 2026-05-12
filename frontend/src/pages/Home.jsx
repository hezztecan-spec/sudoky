import { Link } from 'react-router-dom';
import { useAuth } from '../store';
import { useOnline } from '../useOnline';

const GAMES = [
  { id: 'sudoku', name: 'Судоку', emoji: '🧩', desc: '7 сложностей, ежедневные', path: '/puzzles' },
  { id: 'tictactoe', name: 'Крестики-нолики', emoji: '❌', desc: 'Классика с другом', path: '/tictactoe' },
  { id: 'reaction', name: 'Реакция', emoji: '⚡', desc: 'Проверь скорость', path: '/reaction' },
  { id: 'memory', name: 'Память', emoji: '🃏', desc: 'Найди пары карточек', path: '/memory' },
  { id: 'wordle', name: 'Слова', emoji: '📝', desc: 'Угадай слово за 6 попыток', path: '/wordle', soon: true },
  { id: 'battleship', name: 'Морской бой', emoji: '🚢', desc: 'Потопи флот друга', path: '/battleship', soon: true },
];

export default function Home() {
  const user = useAuth((s) => s.user);
  const online = useOnline();

  return (
    <div className="space-y-8">
      <section className="text-center py-8 sm:py-12 space-y-4">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">играй.лето</h1>
        <p className="text-paper-600 max-w-md mx-auto text-sm sm:text-base px-4">
          Мини-игры для компании. Выбери игру, вызови друга, побеждай.
        </p>
        {online.length > 0 && (
          <p className="text-xs text-paper-500">
            🟢 Онлайн: {online.map((o) => o.username).join(', ')}
          </p>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((g) => (
          g.soon ? (
            <div key={g.id} className="card p-5 opacity-50 cursor-not-allowed space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{g.emoji}</span>
                <div>
                  <h3 className="font-bold">{g.name}</h3>
                  <p className="text-xs text-paper-500">{g.desc}</p>
                </div>
              </div>
              <span className="chip text-xs">скоро</span>
            </div>
          ) : (
            <Link
              key={g.id}
              to={user ? g.path : '/login'}
              className="card p-5 hover:shadow-md hover:bg-paper-50 transition space-y-2 block"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{g.emoji}</span>
                <div>
                  <h3 className="font-bold">{g.name}</h3>
                  <p className="text-xs text-paper-600">{g.desc}</p>
                </div>
              </div>
            </Link>
          )
        ))}
      </div>

      {!user && (
        <div className="text-center">
          <Link to="/login" className="btn px-6 py-3">Войти чтобы играть</Link>
        </div>
      )}
    </div>
  );
}
