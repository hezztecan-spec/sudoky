import { create } from 'zustand';
import { useEffect } from 'react';
import { useWs } from './useWs';
import { api } from './api';

export const useOnlineStore = create((set) => ({
  list: [],
  setList: (list) => set({ list }),
}));

let loaded = false;

export function useOnline() {
  const list = useOnlineStore((s) => s.list);
  const setList = useOnlineStore((s) => s.setList);

  useEffect(() => {
    if (loaded) return;
    loaded = true;
    api.onlineUsers().then(setList).catch(() => {});
  }, [setList]);

  useWs((msg) => {
    if (msg.type === 'online_list') setList(msg.online);
  });

  return list;
}
