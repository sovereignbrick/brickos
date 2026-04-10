'use client'

// Sprint 040 #476 -- in-app subscription grace banner.
//
// Renders a one-line warning bar at the top of every authenticated page when
// the current user's license is in `downgrade_grace`. Disappears the moment
// the grace state clears (next /api/v1/license fetch). Dismissible per
// session via sessionStorage so a user can hide it on the current tab; it
// returns the next time the tab opens.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { AlertTriangle, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { LicenseInfo } from '@/lib/types'

const DISMISS_KEY = 'shi.graceBanner.dismissed'

function daysRemaining(graceEndsAt: string): number {
  const ends = new Date(graceEndsAt).getTime()
  const now = Date.now()
  const diffMs = ends - now
  if (diffMs <= 0) return 0
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export function GraceBanner() {
  const { user, loading } = useAuth()
  const t = useTranslations('graceBanner')
  const [license, setLicense] = useState<LicenseInfo | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (loading || !user) return
    let cancelled = false
    api.license
      .get()
      .then((res) => {
        if (!cancelled) setLicense(res.data)
      })
      .catch(() => {
        // best-effort: a 401/500 here just suppresses the banner
      })
    return () => {
      cancelled = true
    }
  }, [loading, user])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')
  }, [])

  if (!user || !license || !license.is_grace_period || dismissed) {
    return null
  }

  const graceEnds = license.downgrade_info?.grace_period_ends
  if (!graceEnds) return null

  const days = daysRemaining(graceEnds)

  let message: string
  if (days === 0) {
    message = t('messageToday')
  } else if (days === 1) {
    message = t('messageOneDay')
  } else {
    message = t('messageDays', { days })
  }

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <div
      role="alert"
      className="bg-amber-900/80 text-amber-100 text-xs sm:text-sm py-2 px-4 flex items-center justify-center gap-3 border-b border-amber-500/30"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="font-medium">{t('title')}.</span>
      <span className="hidden sm:inline">{message}</span>
      <Link
        href="/billing"
        className="underline underline-offset-2 hover:text-white transition-colors font-medium"
      >
        {t('cta')}
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t('dismiss')}
        className="ml-2 text-amber-200/70 hover:text-amber-100 transition-colors"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}
