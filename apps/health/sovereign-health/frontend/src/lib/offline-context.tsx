'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface OfflineContextValue {
  isOffline: boolean
}

const OfflineContext = createContext<OfflineContextValue>({ isOffline: false })

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    setIsOffline(!navigator.onLine)

    const goOffline = () => setIsOffline(true)
    const goOnline = () => setIsOffline(false)

    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)

    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  return (
    <OfflineContext value={{ isOffline }}>
      {children}
    </OfflineContext>
  )
}

export const useOffline = () => useContext(OfflineContext)
