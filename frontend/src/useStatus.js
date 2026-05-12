import { useEffect } from 'react';
import { wsUrlWithToken } from './api';

// Отправляет статус через WS (глобальный singleton)
let ws = null;

function getWs() {
  // Используем глобальный WS из useWs — но нам нужен send.
  // Проще: отправляем через тот же сокет.
  return ws;
}

export function setWs(socket) { ws = socket; }

export function useSetStatus(status) {
  useEffect(() => {
    // Отправляем статус при монтировании, очищаем при размонтировании
    sendStatus(status);
    return () => sendStatus(null);
  }, [status]);
}

export function sendStatus(status) {
  // Находим глобальный WS и шлём
  try {
    const sockets = document.querySelectorAll ? null : null; // dummy
    // Используем глобальный объект из useWs
    if (window.__sudokuWs && window.__sudokuWs.readyState === 1) {
      window.__sudokuWs.send(JSON.stringify({ type: 'set_status', status }));
    }
  } catch {}
}
