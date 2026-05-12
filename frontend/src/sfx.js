// Простые звуки через Web Audio API. Без файлов — синтезируем короткие тона.
// Плюс мягкая вибрация на мобиле.

let ctx = null;
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function isMuted() {
  return localStorage.getItem('muted') === '1';
}

export function setMuted(v) {
  localStorage.setItem('muted', v ? '1' : '0');
  window.dispatchEvent(new Event('mutechange'));
}

export function getMuted() { return isMuted(); }

function beep(freq, duration = 0.08, type = 'sine', volume = 0.1) {
  if (isMuted()) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  } catch { /* ignore */ }
}

function vibrate(pattern) {
  if (isMuted()) return;
  if (navigator.vibrate) try { navigator.vibrate(pattern); } catch { /* ignore */ }
}

export const sfx = {
  tap:     () => { beep(660, 0.04, 'sine', 0.06); vibrate(8); },
  correct: () => { beep(880, 0.08, 'sine', 0.1); setTimeout(() => beep(1175, 0.1, 'sine', 0.1), 60); vibrate(12); },
  wrong:   () => { beep(180, 0.15, 'sawtooth', 0.08); vibrate([20, 40, 20]); },
  win:     () => {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) => setTimeout(() => beep(n, 0.18, 'triangle', 0.12), i * 120));
    vibrate([30, 40, 30, 40, 80]);
  },
  click:   () => { beep(420, 0.03, 'sine', 0.05); },
};
