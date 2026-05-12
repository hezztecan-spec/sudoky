// Звуки через Web Audio API + регулировка громкости.

let ctx = null;
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

// Громкость 0–100, хранится в localStorage
export function getVolume() {
  const v = parseInt(localStorage.getItem('sfx_volume') || '70', 10);
  return Math.max(0, Math.min(100, v));
}

export function setVolume(v) {
  localStorage.setItem('sfx_volume', String(Math.max(0, Math.min(100, v))));
  window.dispatchEvent(new Event('volumechange'));
}

export function isMuted() {
  return getVolume() === 0;
}

export function setMuted(v) {
  if (v) setVolume(0);
  else if (getVolume() === 0) setVolume(70);
}

export function getMuted() { return isMuted(); }

function vol() {
  return getVolume() / 100;
}

function beep(freq, duration = 0.12, type = 'sine', baseVol = 0.3) {
  if (vol() === 0) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const v = baseVol * vol();
    gain.gain.setValueAtTime(v, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  } catch { /* ignore */ }
}

function vibrate(pattern) {
  if (vol() === 0) return;
  if (navigator.vibrate) try { navigator.vibrate(pattern); } catch { /* ignore */ }
}

export const sfx = {
  tap() {
    beep(700, 0.06, 'sine', 0.25);
    vibrate(10);
  },
  correct() {
    beep(880, 0.12, 'sine', 0.35);
    setTimeout(() => beep(1175, 0.14, 'sine', 0.35), 80);
    vibrate(15);
  },
  wrong() {
    beep(200, 0.2, 'sawtooth', 0.3);
    vibrate([25, 50, 25]);
  },
  win() {
    // Мелодия победы: до-ми-соль-до (мажорный аккорд вверх)
    const melody = [523, 659, 784, 1047, 1319];
    melody.forEach((freq, i) => {
      setTimeout(() => beep(freq, 0.25, 'triangle', 0.4), i * 140);
    });
    // Финальный аккорд
    setTimeout(() => {
      beep(523, 0.5, 'sine', 0.2);
      beep(659, 0.5, 'sine', 0.2);
      beep(784, 0.5, 'sine', 0.2);
      beep(1047, 0.5, 'sine', 0.2);
    }, melody.length * 140 + 50);
    vibrate([30, 40, 30, 40, 100]);
  },
  click() {
    beep(500, 0.04, 'sine', 0.2);
  },
  challenge() {
    // Звук вызова: два тона вверх
    beep(440, 0.15, 'triangle', 0.35);
    setTimeout(() => beep(660, 0.15, 'triangle', 0.35), 150);
    setTimeout(() => beep(880, 0.2, 'triangle', 0.4), 300);
    vibrate([40, 60, 40]);
  },
  decline() {
    beep(330, 0.2, 'sawtooth', 0.2);
    setTimeout(() => beep(220, 0.3, 'sawtooth', 0.2), 150);
  },

  // Фоновая спокойная мелодия (лупится пока играет)
  _bgInterval: null,
  _bgPlaying: false,

  bgStart() {
    if (this._bgPlaying) return;
    this._bgPlaying = true;
    const melody = [
      // Спокойная пентатоника: C D E G A (октава 4)
      { f: 262, d: 0.6 }, { f: 294, d: 0.6 }, { f: 330, d: 0.8 },
      { f: 392, d: 0.6 }, { f: 440, d: 0.8 }, { f: 392, d: 0.6 },
      { f: 330, d: 0.8 }, { f: 294, d: 0.6 }, { f: 262, d: 1.0 },
      { f: 0, d: 0.8 }, // пауза
      { f: 330, d: 0.6 }, { f: 392, d: 0.6 }, { f: 440, d: 0.8 },
      { f: 523, d: 0.6 }, { f: 440, d: 0.8 }, { f: 392, d: 0.6 },
      { f: 330, d: 0.8 }, { f: 262, d: 1.0 },
      { f: 0, d: 1.2 }, // пауза
    ];
    let i = 0;
    const play = () => {
      if (!this._bgPlaying) return;
      const note = melody[i % melody.length];
      if (note.f > 0) {
        beep(note.f, note.d * 0.9, 'sine', 0.08);
      }
      i++;
      this._bgInterval = setTimeout(play, note.d * 700);
    };
    play();
  },

  bgStop() {
    this._bgPlaying = false;
    if (this._bgInterval) { clearTimeout(this._bgInterval); this._bgInterval = null; }
  },

  // Морской бой
  splash() {
    // Плеск воды — шум
    if (vol() === 0) return;
    try {
      const c = getCtx();
      const bufferSize = c.sampleRate * 0.15;
      const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const source = c.createBufferSource();
      source.buffer = buffer;
      const gain = c.createGain();
      gain.gain.value = 0.15 * vol();
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      source.connect(filter).connect(gain).connect(c.destination);
      source.start();
    } catch {}
  },

  explosion() {
    // Взрыв — низкий шум + тон
    if (vol() === 0) return;
    beep(80, 0.3, 'sawtooth', 0.35);
    setTimeout(() => beep(60, 0.4, 'square', 0.2), 50);
    try {
      const c = getCtx();
      const bufferSize = c.sampleRate * 0.3;
      const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }
      const source = c.createBufferSource();
      source.buffer = buffer;
      const gain = c.createGain();
      gain.gain.value = 0.25 * vol();
      source.connect(gain).connect(c.destination);
      source.start();
    } catch {}
    vibrate([50, 30, 80]);
  },

  shipSunk() {
    // Корабль потоплен
    beep(150, 0.2, 'sawtooth', 0.3);
    setTimeout(() => beep(100, 0.4, 'sawtooth', 0.25), 150);
    setTimeout(() => beep(70, 0.5, 'sawtooth', 0.2), 350);
    vibrate([60, 40, 60, 40, 100]);
  },
};
