'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { RefreshCw } from 'lucide-react'

const BAKED_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || 'dev'
const POLL_INTERVAL_MS = 60_000

// Sprint 047 #586 + #588: detect when the user is running an outdated
// client bundle and surface a refresh prompt. Two independent signals
// trigger the banner:
//
// 1. Build-ID poll (#586). Every 60s, fetch /health and compare its
//    `build` (the short git SHA baked into the backend image at docker
//    build time) against NEXT_PUBLIC_BUILD_ID baked into this bundle.
//    Mismatch means the backend rolled forward while this tab kept a
//    stale JS chunk. Ignores the "dev" fallback so local builds without
//    the build-arg never flap.
//
// 2. Service worker controllerchange (#588). When a new SW activates and
//    takes control of the page, the event fires. That's the cleanest
//    signal that the SW cache just turned over and any code still
//    executing in this tab is from the previous deploy.
//
// The banner is non-blocking -- we never force-reload, we let the user
// click so we don't interrupt an in-flight form or chat. One-shot: once
// shown, it stays until they reload.
export function RefreshBanner() {
  const [stale, setStale] = useState(false)
  const t = useTranslations('refresh')

  useEffect(() => {
    if (BAKED_BUILD_ID === 'dev') return

    let cancelled = false

    const check = async () => {
      try {
        const res = await fetch('/health', { cache: 'no-store' })
        if (!res.ok) return
        const body = await res.json()
        const serverBuild = typeof body?.build === 'string' ? body.build : null
        if (!serverBuild || serverBuild === 'dev') return
        if (serverBuild !== BAKED_BUILD_ID && !cancelled) {
          setStale(true)
        }
      } catch {
        // Network blip -- try again next tick.
      }
    }

    check()
    const id = window.setInterval(check, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return
    const onControllerChange = () => setStale(true)
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  if (!stale) return null

  return (
    <div className="bg-blue-900/80 text-blue-100 text-xs text-center py-1.5 px-4 flex items-center justify-center gap-3">
      <RefreshCw className="h-3.5 w-3.5" />
      <span>{t('message')}</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="underline font-semibold hover:text-white"
      >
        {t('action')}
      </button>
    </div>
  )
}
