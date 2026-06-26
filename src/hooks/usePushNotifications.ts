import { useState, useEffect, useCallback } from 'react'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setLoading(false)
      return
    }

    const checkSubscription = async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const subscription = await reg.pushManager.getSubscription()
        setIsSubscribed(!!subscription)
        setPermission(Notification.permission)
      } catch {
        // push not supported
      } finally {
        setLoading(false)
      }
    }

    checkSubscription()
  }, [])

  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) {
      console.warn('VITE_VAPID_PUBLIC_KEY não configurada')
      return false
    }

    try {
      const permissionResult = await Notification.requestPermission()
      setPermission(permissionResult)

      if (permissionResult !== 'granted') return false

      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const subscriptionJson = subscription.toJSON()
      const endpoint = subscriptionJson.endpoint || ''
      const keys = subscriptionJson.keys as { p256dh?: string; auth?: string } | undefined

      const { supabase } = await import('../lib/supabase')
      await supabase.rpc('save_push_subscription', {
        p_endpoint: endpoint,
        p_p256dh: keys?.p256dh || '',
        p_auth: keys?.auth || '',
      })

      setIsSubscribed(true)
      return true
    } catch (err) {
      console.error('Erro ao inscrever push:', err)
      return false
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()
      if (subscription) {
        const endpoint = subscription.endpoint
        await subscription.unsubscribe()
        const { supabase } = await import('../lib/supabase')
        await supabase.rpc('delete_push_subscription', { p_endpoint: endpoint })
        setIsSubscribed(false)
      }
    } catch (err) {
      console.error('Erro ao cancelar inscrição push:', err)
    }
  }, [])

  return { isSubscribed, permission, loading, subscribe, unsubscribe }
}
