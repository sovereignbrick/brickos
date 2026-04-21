'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { useTranslations } from 'next-intl'
import { Eye, X } from 'lucide-react'
import {
  clearImpersonationSession,
  getImpersonationSession,
  type ImpersonationSession,
} from '@/lib/impersonation'

export function ImpersonationBanner() {
  const t = useTranslations('impersonation')
  const router = useRouter()
  const [session, setSession] = useState<ImpersonationSession | null>(null)

  useEffect(() => {
    setSession(getImpersonationSession())
    // Re-read whenever the cookie changes (e.g. other tabs).
    const id = window.setInterval(() => {
      setSession(getImpersonationSession())
    }, 2000)
    return () => window.clearInterval(id)
  }, [])

  if (!session) return null

  async function handleExit() {
    // Best-effort: end the session backend-side. Local cookie cleared
    // regardless so the banner disappears even if the network call
    // fails (the backend's 30-min sliding timeout catches the orphan).
    try {
      const token = Cookies.get('auth_token')
      await fetch('/practitioner/impersonate/exit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ session_id: session!.session_id }),
      })
    } catch {
      // swallow
    }
    clearImpersonationSession()
    setSession(null)
    router.push('/sovereign-health/practitioner')
  }

  return (
    // Sprint 048 RC: `sticky top-0 z-[60]` keeps the banner visible on
    // pages that use `h-screen` / `overflow-hidden` containers (Doctor
    // Chat's ChatLayout is the canonical example). Without sticky, the
    // banner sat above the page's own viewport-sized wrapper and got
    // clipped on navigation. z-60 beats Navbar's sticky z-50.
    <div className="sticky top-0 z-[60] bg-amber-600/95 text-black text-xs font-medium px-4 py-1.5 flex items-center justify-center gap-3">
      <Eye className="h-3.5 w-3.5" aria-hidden />
      <span>
        {t('viewingAs', { name: session.patient.name || session.patient.email })}
        {' · '}
        <span className="font-semibold">{t('readOnly')}</span>
      </span>
      <button
        type="button"
        onClick={handleExit}
        className="flex items-center gap-1 underline font-semibold hover:text-white"
        aria-label={t('exit')}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
        {t('exit')}
      </button>
    </div>
  )
}
