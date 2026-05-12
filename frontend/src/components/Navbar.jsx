import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store';
import { useOnline } from '../useOnline';

const linkClass = ({ isActive }) =>
  `px-3 py-1.5 rounded-lg text-sm transition whitespace-nowrap ${
    isActive ? 'bg-black text-white' : 'text-paper-700 hover:text-black hover:bg-paper-200'
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const online = useOnline();

  return (
    <header className="sticky top-0 z-30 border-b border-paper-300 bg-white/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-2">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl">🧩</span>
          <span className="font-bold tracking-tight">sudoku.лето</span>
        </Link>

        <div className="hidden sm:flex items-center gap-1.5 ml-3 text-xs text-paper-600">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>{online.length} онлайн</span>
        </div>

        <nav className="ml-auto flex items-center gap-1 overflow-x-auto no-scrollbar">
          <NavLink to="/puzzles" className={linkClass}>Играть</NavLink>
          <NavLink to="/duel" className={linkClass}>⚔️ Дуэль</NavLink>
          <NavLink to="/leaderboard" className={linkClass}>Топ</NavLink>
          <NavLink to="/chat" className={linkClass}>Чат</NavLink>
          {user && <NavLink to="/profile" className={linkClass}>Я</NavLink>}
          {user?.is_admin && <NavLink to="/admin" className={linkClass}>Админ</NavLink>}
          {!user ? (
            <NavLink to="/login" className="btn text-sm py-1.5 px-3 ml-1">Войти</NavLink>
          ) : (
            <button
              className="btn-ghost text-sm py-1.5 px-3 ml-1"
              onClick={() => { logout(); nav('/'); }}
            >
              Выйти
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
