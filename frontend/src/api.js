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
  resetPuzzle: (id) => request(`/puzzles/${id}/reset`, { method: 'POST' }),
  checkCell: (id, index, value) => request(`/puzzles/${id}/check`, { method: 'POST', body: { index, value } }),
  hintCell: (id, value, index) => request(`/puzzles/${id}/hint`, { method: 'POST', body: { value, index } }),
  submitPuzzle: (id, solution, hint) => request(`/puzzles/${id}/submit`, { method: 'POST', body: { solution, hint } }),

  onlineUsers: () => request('/online', { auth: false }),

  leaderboard: () => request('/leaderboard', { auth: false }),
  achievements: () => request('/achievements'),
  dailyTasks: () => request('/daily-tasks'),
  chatHistory: () => request('/chat', { auth: false }),
  sendChat: (message) => request('/chat', { method: 'POST', body: { message } }),

  adminCreatePuzzle: (body) => request('/admin/puzzles', { method: 'POST', body }),
  adminStats: () => request('/admin/stats'),

  // stats
  myTimeline: () => request('/stats/me/timeline'),
  myByDifficulty: () => request('/stats/me/by-difficulty'),
  compareOnPuzzle: (puzzleId) => request(`/stats/compare/${puzzleId}`),

  // games
  challenge: (opponentId, gameType) => request('/games/challenge', { method: 'POST', body: { opponentId, gameType } }),
  acceptChallenge: (id) => request(`/games/challenge/${id}/accept`, { method: 'POST' }),
  declineChallenge: (id) => request(`/games/challenge/${id}/decline`, { method: 'POST' }),
  getSession: (id) => request(`/games/session/${id}`),
  makeMove: (id, move) => request(`/games/session/${id}/move`, { method: 'POST', body: { move } }),
  gameLeaderboard: (gameType) => request(`/games/leaderboard/${gameType}`, { auth: false }),

  // wordle
  wordleInfo: () => request('/wordle/info'),
  wordleGuess: (guess) => request('/wordle/guess', { method: 'POST', body: { guess } }),

  // friends
  friends: () => request('/friends'),
  addFriend: (username) => request('/friends/add', { method: 'POST', body: { username } }),
  removeFriend: (friendId) => request('/friends/remove', { method: 'POST', body: { friendId } }),

  // feed
  feed: () => request('/feed'),

  // minigames results
  submitReaction: (avgMs) => request('/minigames/reaction/submit', { method: 'POST', body: { avgMs } }),
  submitMemory: (moves, seconds, pairs) => request('/minigames/memory/submit', { method: 'POST', body: { moves, seconds, pairs } }),
  submitWordle: (attempts, won) => request('/minigames/wordle/submit', { method: 'POST', body: { attempts, won } }),

  // shop
  shopItems: () => request('/shop/items', { auth: false }),
  shopMy: () => request('/shop/my'),
  shopBuy: (code) => request('/shop/buy', { method: 'POST', body: { code } }),
  shopEquip: (code) => request('/shop/equip', { method: 'POST', body: { code } }),

  // game chat
  gameChat: (sessionId, message) => request(`/games/session/${sessionId}/chat`, { method: 'POST', body: { message } }),

  // admin users
  adminUsers: () => request('/admin/users'),
  adminGetUser: (id) => request(`/admin/users/${id}`),
  adminUpdateUser: (id, body) => request(`/admin/users/${id}`, { method: 'PATCH', body }),
  adminDeleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  adminResetPoints: (id) => request(`/admin/users/${id}/reset-points`, { method: 'POST' }),
  adminForceReload: () => request('/admin/force-reload', { method: 'POST' }),
};

export function wsUrlWithToken() {
  const t = getToken();
  return t ? `${WS_URL}?token=${encodeURIComponent(t)}` : WS_URL;
}
