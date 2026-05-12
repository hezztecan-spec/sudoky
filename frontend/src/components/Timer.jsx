import { useState, useEffect, useRef } from 'react';

export default function Timer({ startedAt, stopped, pausedSeconds = 0, paused = false }) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (stopped || paused) {
      clearInterval(ref.current);
      return;
    }
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000) - pausedSeconds));
    tick();
    ref.current = setInterval(tick, 1000);
    return () => clearInterval(ref.current);
  }, [startedAt, stopped, paused, pausedSeconds]);

  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');

  return <div className="font-mono text-xl tabular-nums tracking-wider text-paper-900">{m}:{s}</div>;
}
