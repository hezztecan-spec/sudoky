import { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { useAuth } from '../store';
import { useWs } from '../useWs';
import { useOnline } from '../useOnline';

export default function Chat() {
  const user = useAuth((s) => s.user);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const online = useOnline();

  useEffect(() => {
    api.chatHistory().then(setMessages).catch(() => {});
  }, []);

  useWs((msg) => {
    if (msg.type === 'chat_message') setMessages((prev) => [...prev, msg.message]);
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api.sendChat(text.trim());
      setText('');
    } catch { /* ignore */ }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-140px)] max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold">💬 Чат</h1>
        <span className="chip">🟢 {online.length} онлайн</span>
      </div>

      <div className="flex-1 overflow-y-auto card p-3 sm:p-4 space-y-3">
        {messages.length === 0 && <p className="text-center text-paper-600 text-sm">Пока тишина. Напиши что-нибудь!</p>}
        {messages.map((m) => (
          <div key={m.id} className="flex gap-3 items-start">
            <span className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              {m.username?.[0]?.toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-sm truncate">{m.username}</span>
                <span className="text-xs text-paper-500 ml-auto shrink-0">
                  {new Date(m.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-paper-800 break-words">{m.message}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          className="input flex-1"
          placeholder="Написать сообщение…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
        />
        <button className="btn px-5" disabled={sending || !text.trim()}>
          Отправить
        </button>
      </form>
    </div>
  );
}
