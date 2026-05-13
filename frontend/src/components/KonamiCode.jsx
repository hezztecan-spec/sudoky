import { useEffect, useState, useRef } from 'react';
import Confetti from './Confetti';

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];

export default function KonamiCode() {
  const [triggered, setTriggered] = useState(false);
  const seq = useRef([]);

  useEffect(() => {
    const onKey = (e) => {
      seq.current.push(e.key);
      if (seq.current.length > KONAMI.length) seq.current.shift();
      if (seq.current.join(',') === KONAMI.join(',')) {
        setTriggered(true);
        seq.current = [];
        setTimeout(() => setTriggered(false), 5000);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!triggered) return null;

  return (
    <>
      <Confetti show={true} />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="bg-black text-white px-8 py-6 rounded-2xl text-center animate-pop shadow-2xl pointer-events-auto">
          <p className="text-4xl mb-2">🕹️</p>
          <p className="text-xl font-bold">KONAMI CODE!</p>
          <p className="text-sm text-paper-400 mt-1">↑↑↓↓←→←→BA</p>
          <p className="text-xs text-paper-500 mt-2">Ты нашёл секрет. Респект.</p>
        </div>
      </div>
    </>
  );
}
