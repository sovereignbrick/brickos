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
// 1. Build-ID poll (#586). Every 60s, fetch /app-build-id and compare
//    its `build` (the short git SHA the CURRENT frontend container was
//    built with) against NEXT_PUBLIC_BUILD_ID baked into this loaded
//    bundle. Mismatch means a new frontend rolled out while this tab
//    kept the old bundle in memory/SW cache.
//
//    Note: we intentionally don't poll the backend's /health here. That
//    check compares client frontend to backend, which diverges any time
//    frontend and backend deploy in separate cycles and produces
//    false-positive "new version" banners that no reload can clear.
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
        const res = await fetch('/app-build-id', { cache: 'no-store' })
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
    // Sprint 051 #0588: the controllerchange event fires on first-ever SW
    // install in a fresh session (page had no controller -> SW activates
    // -> becomes controller). That is NOT a "newer version" scenario; it
    // is normal first-visit SW registration. Capture whether a controller
    // existed BEFORE the listener attached; only flag stale on true
    // swaps.
    const hadController = !!navigator.serviceWorker.controller
    const onControllerChange = () => {
      if (hadController) setStale(true)
    }
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
