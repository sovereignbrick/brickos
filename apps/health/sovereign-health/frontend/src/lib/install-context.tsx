'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>
  readonly platforms: string[]
}

interface InstallContextValue {
  canInstall: boolean
  isInstalled: boolean
  promptInstall: () => Promise<void>
}

const InstallContext = createContext<InstallContextValue>({
  canInstall: false,
  isInstalled: false,
  promptInstall: async () => {},
})

export function InstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed (standalone mode)
    const mq = window.matchMedia('(display-mode: standalone)')
    setIsInstalled(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsInstalled(e.matches)
    mq.addEventListener('change', handler)

    // Capture the install prompt
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    return () => {
      mq.removeEventListener('change', handler)
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return
    const result = await deferredPrompt.prompt()
    if (result.outcome === 'accepted') {
      setIsInstalled(true)
    }
    setDeferredPrompt(null)
  }, [deferredPrompt])

  return (
    <InstallContext value={{
      canInstall: !!deferredPrompt && !isInstalled,
      isInstalled,
      promptInstall,
    }}>
      {children}
    </InstallContext>
  )
}

export const useInstall = () => useContext(InstallContext)
