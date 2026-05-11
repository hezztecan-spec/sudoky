import { create } from 'zustand';
import { api } from './api';

export const useAuth = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token') || '',
  loading: true,

  async bootstrap() {
    if (!get().token) {
      set({ loading: false });
      return;
    }
    try {
      const user = await api.me();
      set({ user, loading: false });
    } catch {
      localStorage.removeItem('token');
      set({ token: '', user: null, loading: false });
    }
  },

  async loginWithGoogle(credential) {
    const { token, user } = await api.loginGoogle(credential);
    localStorage.setItem('token', token);
    set({ token, user });
  },

  logout() {
    localStorage.removeItem('token');
    set({ token: '', user: null });
  },
}));
