'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { RefreshCw } from 'lucide-react'

const BAKED_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || 'dev'
const POLL_INTERVAL_MS = 60_000
const AUTO_RELOAD_KEY = 'brickos.refresh.autoreloaded'

// Sprint 047 #586 + #588 + Sprint 051 #0594-follow: detect when the user
// is running an outdated client bundle and silently reload once per
// session. If the reload doesn't resolve the mismatch (rare -- usually
// indicates a real incident: stale CDN cache, misconfigured SW, etc.)
// fall back to the interactive "Reload now" banner.
//
// Two independent signals flag staleness:
//
// 1. Build-ID poll (#586). Every 60s, fetch /app-build-id and compare
//    against NEXT_PUBLIC_BUILD_ID baked into this loaded bundle.
//    Mismatch means a new frontend rolled out while this tab kept the
//    old bundle in memory / SW cache. We don't poll /health because
//    frontend + backend deploy in separate cycles and produce false
//    positives.
//
// 2. Service worker controllerchange (#588). hadController captured at
//    mount distinguishes a first-ever SW install (normal, no stale)
//    from a true upgrade (stale).
//
// Sprint 051 behavior change: instead of showing a banner and waiting
// for the user to click "Reload now", we auto-reload once per session
// (sessionStorage flag prevents a reload loop if the reload doesn't
// clear the mismatch). Silent is better than nagging when the reload
// just works.
export function RefreshBanner() {
  const [stale, setStale] = useState(false)
  const t = useTranslations('refresh')

  useEffect(() => {
    if (BAKED_BUILD_ID === 'dev') return

    let cancelled = false

    const handleStale = () => {
      if (cancelled) return
      // Session-scoped guard: if we already auto-reloaded once and the
      // mismatch persists, something is wrong with caching -- show the
      // interactive banner so the user can try Ctrl+Shift+R or reach
      // out to support.
      const alreadyReloaded = sessionStorage.getItem(AUTO_RELOAD_KEY) === '1'
      if (alreadyReloaded) {
        setStale(true)
        return
      }
      sessionStorage.setItem(AUTO_RELOAD_KEY, '1')
      window.location.reload()
    }

    const check = async () => {
      try {
        const res = await fetch('/app-build-id', { cache: 'no-store' })
        if (!res.ok) return
        const body = await res.json()
        const serverBuild = typeof body?.build === 'string' ? body.build : null
        if (!serverBuild || serverBuild === 'dev') return
        if (serverBuild !== BAKED_BUILD_ID) {
          handleStale()
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
      if (!hadController) return
      const alreadyReloaded = sessionStorage.getItem(AUTO_RELOAD_KEY) === '1'
      if (alreadyReloaded) {
        setStale(true)
        return
      }
      sessionStorage.setItem(AUTO_RELOAD_KEY, '1')
      window.location.reload()
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
