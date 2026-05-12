import { NavLink } from 'react-router-dom';
import { useAuth } from '../store';

const item = ({ isActive }) =>
  `flex flex-col items-center gap-0.5 text-[10px] transition ${isActive ? 'text-black dark:text-white font-semibold' : 'text-paper-500'}`;

export default function MobileNav() {
  const user = useAuth((s) => s.user);
  if (!user) return null;

  return (
    <nav className="mobile-nav">
      <NavLink to="/sudoku" className={item}>
        <span className="text-lg">🧩</span>
        <span>Судоку</span>
      </NavLink>
      <NavLink to="/games" className={item}>
        <span className="text-lg">🎮</span>
        <span>Игры</span>
      </NavLink>
      <NavLink to="/leaderboard" className={item}>
        <span className="text-lg">🏆</span>
        <span>Топ</span>
      </NavLink>
      <NavLink to="/chat" className={item}>
        <span className="text-lg">💬</span>
        <span>Чат</span>
      </NavLink>
      <NavLink to="/profile" className={item}>
        <span className="text-lg">👤</span>
        <span>Я</span>
      </NavLink>
    </nav>
  );
}
