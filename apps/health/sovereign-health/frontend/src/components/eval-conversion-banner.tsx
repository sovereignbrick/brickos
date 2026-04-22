'use client'

// Sprint 049 #049-06 (Design 029 v0.3): persistent "sign up to save your
// data" banner rendered on eval.sovereignhealth.io while the visitor is
// anonymous. Sticky to bottom, dismissible per-session.
//
// The Sign up / Log in links CROSS-PLANE to app.sovereignhealth.io --
// accounts don't get created on eval.*, they get created on app.*. The
// `from=demo-<profile>` query captures the current profile as the
// signup source for the user row (single attribute per product privacy
// policy -- no session/page tracking).

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useDemoProfile } from '@/lib/demo-profile-context'

const DISMISSED_KEY = 'demoSurface.conversionBanner.dismissed'

export function EvalConversionBanner() {
  const { isDemo } = useAuth()
  const { profile } = useDemoProfile()
  const t = useTranslations('demoSurface.banner')
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setDismissed(sessionStorage.getItem(DISMISSED_KEY) === '1')
  }, [])

  if (!isDemo) return null
  if (dismissed) return null

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  // Cross-plane link: eval.sovereignhealth.io -> app.sovereignhealth.io.
  // Hardcoded target (not via swapPlaneHost; eval is single-plane).
  const signUpHref = `https://app.sovereignhealth.io/signup?from=demo-${profile || 'optimized'}`
  const loginHref = `https://app.sovereignhealth.io/login`

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-amber-600/95 text-black text-xs font-medium px-4 py-2 flex items-center justify-center gap-3 shadow-[0_-1px_3px_rgba(0,0,0,0.2)]">
      <span className="flex items-center gap-2">
        <span aria-hidden>👁</span>
        <span className="font-semibold">{t('title')}</span>
        <span className="hidden sm:inline">— {t('subtitle')}</span>
      </span>
      <a
        href={signUpHref}
        className="underline font-semibold hover:text-white whitespace-nowrap"
      >
        {t('signUp')} ↗
      </a>
      <a
        href={loginHref}
        className="underline hover:text-white whitespace-nowrap"
      >
        {t('login')} ↗
      </a>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="ml-2 opacity-70 hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  )
}
