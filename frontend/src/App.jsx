import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import InstallPrompt from './components/InstallPrompt';
import ChallengePopup from './components/ChallengePopup';
import Home from './pages/Home';
import Login from './pages/Login';
import PuzzleList from './pages/PuzzleList';
import PuzzlePlay from './pages/PuzzlePlay';
import Leaderboard from './pages/Leaderboard';
import Players from './pages/Players';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import Chat from './pages/Chat';
import Admin from './pages/Admin';
import Games from './pages/Games';
import TicTacToe from './pages/TicTacToe';
import GameRoom from './pages/GameRoom';
import Reaction from './pages/Reaction';
import Memory from './pages/Memory';
import Feed from './pages/Feed';
import Wordle from './pages/Wordle';
import Battleship from './pages/Battleship';
import Game2048 from './pages/Game2048';
import Minesweeper from './pages/Minesweeper';
import Shop from './pages/Shop';
import { useAuth } from './store';
import { useTheme } from './useTheme';
import { usePush } from './usePush';

function Protected({ children, admin }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-center text-paper-500">Загрузка…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && !user.is_admin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const bootstrap = useAuth((s) => s.bootstrap);
  const initTheme = useTheme((s) => s.init);
  useEffect(() => { bootstrap(); initTheme(); }, [bootstrap, initTheme]);
  usePush();

  return (
    <div className="min-h-full">
      <Navbar />
      <InstallPrompt />
      <ChallengePopup />
      <main className="max-w-6xl mx-auto px-3 sm:px-4 pb-28 pt-6 safe-bottom page-transition">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

          {/* Судоку — основная игра */}
          <Route path="/sudoku" element={<Protected><PuzzleList /></Protected>} />
          <Route path="/puzzles" element={<Navigate to="/sudoku" replace />} />
          <Route path="/puzzles/:id" element={<Protected><PuzzlePlay /></Protected>} />
          <Route path="/sudoku/:id" element={<Protected><PuzzlePlay /></Protected>} />

          {/* Мини-игры */}
          <Route path="/games" element={<Protected><Games /></Protected>} />
          <Route path="/tictactoe" element={<Protected><TicTacToe /></Protected>} />
          <Route path="/battleship" element={<Protected><Battleship /></Protected>} />
          <Route path="/game/:id" element={<Protected><GameRoom /></Protected>} />
          <Route path="/reaction" element={<Protected><Reaction /></Protected>} />
          <Route path="/memory" element={<Protected><Memory /></Protected>} />
          <Route path="/wordle" element={<Protected><Wordle /></Protected>} />
          <Route path="/2048" element={<Protected><Game2048 /></Protected>} />
          <Route path="/minesweeper" element={<Protected><Minesweeper /></Protected>} />
          <Route path="/shop" element={<Protected><Shop /></Protected>} />

          {/* Общее */}
          <Route path="/leaderboard" element={<Protected><Leaderboard /></Protected>} />
          <Route path="/players" element={<Protected><Players /></Protected>} />
          <Route path="/chat" element={<Protected><Chat /></Protected>} />
          <Route path="/feed" element={<Protected><Feed /></Protected>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/users/:id" element={<Protected><PublicProfile /></Protected>} />
          <Route path="/admin" element={<Protected admin><Admin /></Protected>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
