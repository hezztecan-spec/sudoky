import { useEffect, useRef } from 'react';
import { wsUrlWithToken } from './api';

// Глобальный singleton чтобы не плодить соединения
let globalWs = null;
const listeners = new Set();

function ensureConnection() {
  if (globalWs && (globalWs.readyState === 0 || globalWs.readyState === 1)) return globalWs;
  try {
    globalWs = new WebSocket(wsUrlWithToken());
    window.__sudokuWs = globalWs;
    globalWs.onmessage = (e) => {
      let data;
      try { data = JSON.parse(e.data); } catch { return; }
      // Принудительное обновление от админа
      if (data.type === 'force_reload') {
        window.location.reload();
        return;
      }
      for (const fn of listeners) fn(data);
    };
    globalWs.onclose = () => {
      globalWs = null;
      setTimeout(ensureConnection, 1500);
    };
    globalWs.onerror = () => {
      try { globalWs && globalWs.close(); } catch { /* ignore */ }
    };
  } catch {
    setTimeout(ensureConnection, 2000);
  }
  return globalWs;
}

export function useWs(onMessage) {
  const handler = useRef(onMessage);
  handler.current = onMessage;

  useEffect(() => {
    ensureConnection();
    const fn = (data) => handler.current && handler.current(data);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
}
