import { useState, useEffect, useRef } from 'react';

export default function Timer({ startedAt, stopped }) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (stopped) { clearInterval(ref.current); return; }
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    ref.current = setInterval(tick, 1000);
    return () => clearInterval(ref.current);
  }, [startedAt, stopped]);

  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');

  return <div className="font-mono text-xl tabular-nums tracking-wider">{m}:{s}</div>;
}
