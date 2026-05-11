import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store';

const linkClass = ({ isActive }) =>
  `px-3 py-1.5 rounded-lg text-sm transition whitespace-nowrap ${
    isActive ? 'bg-white text-black' : 'text-ink-300 hover:text-white hover:bg-white/5'
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-900/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-2">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl">🧩</span>
          <span className="font-bold tracking-tight">sudoku.lето</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 overflow-x-auto no-scrollbar">
          <NavLink to="/puzzles" className={linkClass}>Играть</NavLink>
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
