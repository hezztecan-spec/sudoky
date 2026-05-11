import { useEffect, useState } from 'react';

// Чёрно-белое конфетти: только оттенки белого
const SHADES = ['#ffffff', '#e5e5e5', '#a3a3a3', '#d4d4d4', '#737373'];

export default function Confetti({ show }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (!show) { setPieces([]); return; }
    const arr = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      color: SHADES[Math.floor(Math.random() * SHADES.length)],
      rotation: Math.random() * 360,
    }));
    setPieces(arr);
    const t = setTimeout(() => setPieces([]), 3200);
    return () => clearTimeout(t);
  }, [show]);

  if (!pieces.length) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece animate-confetti"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            background: p.color,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}
