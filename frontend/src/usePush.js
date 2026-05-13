import { useEffect } from 'react';
import { api } from './api';
import { useAuth } from './store';

export function usePush() {
  const user = useAuth((s) => s.user);

  useEffect(() => {
    if (!user) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Подписываемся автоматически если разрешение уже дано
    if (Notification.permission === 'granted') {
      subscribe();
    }
  }, [user]);
}

export async function requestPushPermission() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('Push-уведомления не поддерживаются в этом браузере');
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  await subscribe();
  return true;
}

async function subscribe() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const { key } = await api.getVapidKey();
    if (!key) return;

    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      // Уже подписан — отправляем на сервер (на случай если сменился юзер)
      await api.pushSubscribe(existing.toJSON());
      return;
    }

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });

    await api.pushSubscribe(subscription.toJSON());
  } catch (e) {
    console.warn('Push subscribe failed:', e);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
