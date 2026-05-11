const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/ws';

function getToken() {
  return localStorage.getItem('token') || '';
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  sendCode: (phone) => request('/auth/send-code', { method: 'POST', body: { phone }, auth: false }),
  verifyCode: (phone, code) => request('/auth/verify-code', { method: 'POST', body: { phone, code }, auth: false }),
  updateUsername: (username) => request('/auth/update-username', { method: 'POST', body: { username } }),
  whatsappStatus: () => request('/auth/whatsapp-status', { auth: false }),

  me: () => request('/me'),
  userById: (id) => request(`/users/${id}`, { auth: false }),
  history: () => request('/history'),

  listPuzzles: () => request('/puzzles', { auth: false }),
  todayPuzzle: () => request('/puzzles/today', { auth: false }),
  weeklyPuzzle: () => request('/puzzles/weekly', { auth: false }),
  getPuzzle: (id) => request(`/puzzles/${id}`, { auth: false }),
  startPuzzle: (id) => request(`/puzzles/${id}/start`, { method: 'POST' }),
  submitPuzzle: (id, solution) => request(`/puzzles/${id}/submit`, { method: 'POST', body: { solution } }),

  leaderboard: () => request('/leaderboard', { auth: false }),
  achievements: () => request('/achievements'),
  dailyTasks: () => request('/daily-tasks'),
  chatHistory: () => request('/chat', { auth: false }),
  sendChat: (message) => request('/chat', { method: 'POST', body: { message } }),

  adminCreatePuzzle: (body) => request('/admin/puzzles', { method: 'POST', body }),
  adminStats: () => request('/admin/stats'),
};

export function wsUrlWithToken() {
  const t = getToken();
  return t ? `${WS_URL}?token=${encodeURIComponent(t)}` : WS_URL;
}
