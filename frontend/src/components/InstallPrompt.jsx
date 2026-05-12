import { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa_dismissed') === '1');

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 card p-3 flex items-center gap-3 shadow-lg animate-pop max-w-md mx-auto">
      <span className="text-2xl">📱</span>
      <div className="flex-1 min-w-0 text-sm">
        <p className="font-semibold">Установить приложение?</p>
        <p className="text-xs text-paper-600">Открывается как обычная иконка на телефоне.</p>
      </div>
      <button
        className="btn-ghost py-1.5 px-3 text-xs"
        onClick={() => { localStorage.setItem('pwa_dismissed', '1'); setDismissed(true); }}
      >
        Потом
      </button>
      <button
        className="btn py-1.5 px-3 text-xs"
        onClick={async () => {
          deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
      >
        Установить
      </button>
    </div>
  );
}
