import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleButton from '../components/GoogleButton';
import { useAuth } from '../store';

export default function Login() {
  const user = useAuth((s) => s.user);
  const nav = useNavigate();

  useEffect(() => {
    if (user) nav('/puzzles', { replace: true });
  }, [user, nav]);

  return (
    <div className="max-w-sm mx-auto pt-16 sm:pt-20 text-center space-y-8">
      <div className="space-y-3">
        <div className="text-5xl animate-wiggle inline-block">🧩</div>
        <h1 className="text-2xl font-bold">Ну что, решаем?</h1>
        <p className="text-ink-400 text-sm px-4">
          Вход только через Google. Никаких паролей, никакой боли.
        </p>
      </div>

      <div className="card p-6 space-y-4">
        <GoogleButton />
        <p className="text-xs text-ink-500 text-center">
          Продолжая, ты соглашаешься вести себя как хороший человек 🫶
        </p>
      </div>
    </div>
  );
}
