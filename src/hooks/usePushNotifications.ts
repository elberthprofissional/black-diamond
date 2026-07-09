import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(true);
  const vapidMissing = !VAPID_PUBLIC_KEY;
  const isBlocked = permission === 'denied';

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    // iOS only supports push when installed as PWA (standalone)
    if (isIOS && !isStandalone) {
      setIsSupported(false);
      setLoading(false);
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsSupported(false);
      setLoading(false);
      return;
    }

    const checkSubscription = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
        setPermission(Notification.permission);
      } catch {
        // push not supported
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, []);

  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) {
      return false;
    }

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') return false;

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subscriptionJson = subscription.toJSON();
      const endpoint = subscriptionJson.endpoint || '';
      const keys = subscriptionJson.keys as { p256dh?: string; auth?: string } | undefined;

      await supabase.rpc('save_push_subscription', {
        p_endpoint: endpoint,
        p_p256dh: keys?.p256dh || '',
        p_auth: keys?.auth || '',
      });

      setIsSubscribed(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await supabase.rpc('delete_push_subscription', { p_endpoint: endpoint });
        setIsSubscribed(false);
      }
    } catch {
      // silent
    }
  }, []);

  return {
    isSubscribed,
    permission,
    loading,
    isSupported,
    subscribe,
    unsubscribe,
    vapidMissing,
    isBlocked,
  };
}
