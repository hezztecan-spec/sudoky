import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../store';

export default function Login() {
  const user = useAuth((s) => s.user);
  const verify = useAuth((s) => s.verify);
  const nav = useNavigate();

  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef(null);

  useEffect(() => {
    if (user) nav('/puzzles', { replace: true });
  }, [user, nav]);

  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const submitPhone = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.sendCode(phone);
      setStep('code');
      setCooldown(60);
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verify(phone, code);
      nav('/puzzles');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (cooldown) return;
    setError('');
    try {
      await api.sendCode(phone);
      setCooldown(60);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-sm mx-auto pt-12 sm:pt-20 text-center space-y-6">
      <div className="space-y-3">
        <div className="text-5xl inline-block animate-wiggle">🧩</div>
        <h1 className="text-2xl font-bold">Ну что, решаем?</h1>
        <p className="text-paper-600 text-sm px-4">Код для входа придёт в WhatsApp.</p>
      </div>

      <div className="card p-6 space-y-4 text-left">
        {step === 'phone' && (
          <form onSubmit={submitPhone} className="space-y-4">
            <div>
              <label className="label">Номер телефона</label>
              <input
                className="input mt-1"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+7 999 123-45-67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoFocus
              />
              <p className="text-xs text-paper-500 mt-1">В международном формате.</p>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button className="btn w-full" disabled={loading}>
              {loading ? 'Отправляю…' : 'Получить код'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={submitCode} className="space-y-4">
            <div>
              <label className="label">Код из WhatsApp</label>
              <input
                ref={codeRef}
                className="input mt-1 text-center text-2xl tracking-[0.5em] font-mono"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
              <p className="text-xs text-paper-500 mt-1">Отправлено на {phone}</p>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button className="btn w-full" disabled={loading || code.length !== 6}>
              {loading ? 'Проверяю…' : 'Войти'}
            </button>
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                className="text-paper-600 hover:text-black"
                onClick={() => { setStep('phone'); setCode(''); setError(''); }}
              >
                ← Другой номер
              </button>
              <button
                type="button"
                className="text-paper-600 hover:text-black disabled:opacity-40"
                disabled={!!cooldown}
                onClick={resend}
              >
                {cooldown ? `Новый код через ${cooldown}с` : 'Прислать ещё'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
