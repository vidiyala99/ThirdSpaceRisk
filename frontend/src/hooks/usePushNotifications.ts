import { useEffect } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (!VAPID_PUBLIC_KEY) return;

    async function register() {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const registration = await navigator.serviceWorker.register('/sw.js');

        // Wait for the service worker to be ready
        await navigator.serviceWorker.ready;

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        const subJson = subscription.toJSON();
        const keys = subJson.keys as { p256dh: string; auth: string } | undefined;

        if (!keys) return;

        const token = localStorage.getItem('token');

        await fetch(`${API_BASE_URL}/api/push-subscriptions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            endpoint: subJson.endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
          }),
        });
      } catch (err) {
        // Silently fail — push notifications are non-critical
        console.warn('[PushNotifications] Registration failed:', err);
      }
    }

    register();
  }, []);
}
