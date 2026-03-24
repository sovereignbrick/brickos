'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useAuth } from './auth-context'
import { api } from './api'

interface PushContextValue {
  isSupported: boolean
  permission: NotificationPermission
  isSubscribed: boolean
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

const PushContext = createContext<PushContextValue>({
  isSupported: false,
  permission: 'default',
  isSubscribed: false,
  subscribe: async () => {},
  unsubscribe: async () => {},
})

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [isSupported] = useState(() =>
    typeof window !== 'undefined' && 'Notification' in window && 'PushManager' in window
  )
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)

  // Check current state
  useEffect(() => {
    if (!isSupported) return
    setPermission(Notification.permission)

    navigator.serviceWorker?.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setIsSubscribed(!!sub)
    })
  }, [isSupported])

  const subscribe = useCallback(async () => {
    if (!isSupported || !user) return

    const perm = await Notification.requestPermission()
    setPermission(perm)
    if (perm !== 'granted') return

    try {
      // Get VAPID key from server
      const { data } = await api.push.vapidKey()
      if (!data.vapid_public_key) return

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.vapid_public_key).buffer as ArrayBuffer,
      })

      const json = sub.toJSON()
      await api.push.subscribe({
        endpoint: sub.endpoint,
        keys: {
          p256dh: json.keys?.p256dh ?? '',
          auth: json.keys?.auth ?? '',
        },
      })

      setIsSubscribed(true)
    } catch {
      // Subscription failed
    }
  }, [isSupported, user])

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return

    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await api.push.unsubscribe({ endpoint: sub.endpoint })
        await sub.unsubscribe()
      }
      setIsSubscribed(false)
    } catch {
      // Unsubscription failed
    }
  }, [isSupported])

  return (
    <PushContext value={{
      isSupported,
      permission,
      isSubscribed,
      subscribe,
      unsubscribe,
    }}>
      {children}
    </PushContext>
  )
}

export const usePush = () => useContext(PushContext)
