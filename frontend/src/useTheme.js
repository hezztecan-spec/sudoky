import { create } from 'zustand';

export const useTheme = create((set) => ({
  dark: localStorage.getItem('theme') === 'dark',
  toggle() {
    set((s) => {
      const next = !s.dark;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', next);
      return { dark: next };
    });
  },
  init() {
    const dark = localStorage.getItem('theme') === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    set({ dark });
  },
}));
