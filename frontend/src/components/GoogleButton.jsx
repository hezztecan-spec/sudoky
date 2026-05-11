import { useEffect, useRef } from 'react';
import { GOOGLE_CLIENT_ID } from '../api';
import { useAuth } from '../store';

export default function GoogleButton() {
  const ref = useRef(null);
  const loginWithGoogle = useAuth((s) => s.loginWithGoogle);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const init = () => {
      if (!window.google?.accounts?.id || !ref.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (resp) => {
          try {
            await loginWithGoogle(resp.credential);
          } catch (e) {
            alert('Не удалось войти: ' + e.message);
          }
        },
      });
      window.google.accounts.id.renderButton(ref.current, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        logo_alignment: 'left',
        width: 260,
      });
    };

    if (window.google?.accounts?.id) init();
    else {
      const t = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(t);
          init();
        }
      }, 150);
      return () => clearInterval(t);
    }
  }, [loginWithGoogle]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="text-sm text-red-400 text-center max-w-xs">
        VITE_GOOGLE_CLIENT_ID не задан. Укажи его в .env и пересобери фронт.
      </div>
    );
  }

  return <div ref={ref} className="flex justify-center" />;
}
