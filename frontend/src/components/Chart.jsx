// Простой SVG-график линии. Без библиотек.

export function LineChart({ data, xKey = 'day', yKey = 'avg_time', label = 'Ср. время, с' }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-paper-500 text-center py-8">Пока нет данных</p>;
  }
  const W = 320;
  const H = 120;
  const pad = 24;

  const values = data.map((d) => Number(d[yKey]) || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = (W - pad * 2) / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = H - pad - ((Number(d[yKey]) - min) / range) * (H - pad * 2);
    return { x, y, d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#d4d4d4" strokeWidth="1" />
        <path d={pathD} fill="none" stroke="#0a0a0a" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#0a0a0a" />
        ))}
        <text x={pad} y={12} fontSize="10" fill="#737373">{label}</text>
        <text x={pad} y={H - 4} fontSize="9" fill="#a3a3a3">{String(data[0][xKey]).slice(5, 10)}</text>
        <text x={W - pad - 30} y={H - 4} fontSize="9" fill="#a3a3a3">{String(data[data.length - 1][xKey]).slice(5, 10)}</text>
      </svg>
    </div>
  );
}

export function BarChart({ data, xKey = 'difficulty', yKey = 'count' }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-paper-500 text-center py-8">Пока нет данных</p>;
  }
  const max = Math.max(...data.map((d) => Number(d[yKey]) || 0), 1);

  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d[xKey]}>
          <div className="flex justify-between text-xs mb-1">
            <span className="truncate">{d[xKey]}</span>
            <span className="font-semibold">{d[yKey]}</span>
          </div>
          <div className="h-2 bg-paper-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-black transition-all"
              style={{ width: `${(Number(d[yKey]) / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
