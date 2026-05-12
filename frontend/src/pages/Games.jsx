import { Link } from 'react-router-dom';

const GAMES = [
  { id: 'tictactoe', name: 'Крестики-нолики', emoji: '❌', desc: 'Классика с другом', path: '/tictactoe' },
  { id: 'reaction', name: 'Реакция', emoji: '⚡', desc: 'Проверь скорость', path: '/reaction' },
  { id: 'memory', name: 'Память', emoji: '🃏', desc: 'Найди пары карточек', path: '/memory' },
  { id: 'wordle', name: 'Слова', emoji: '📝', desc: 'Угадай слово за 6 попыток', path: '/wordle' },
  { id: 'battleship', name: 'Морской бой', emoji: '🚢', desc: 'Потопи флот друга', path: '/battleship' },
];

export default function Games() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">🎮 Мини-игры</h1>
        <p className="text-paper-600 text-sm">Отдохни от судоку. Вызови друга или играй один.</p>
      </div>

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
              to={g.path}
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
    </div>
  );
}
