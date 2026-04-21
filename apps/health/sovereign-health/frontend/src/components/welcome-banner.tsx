'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { X, MessageCircle, Plus } from 'lucide-react'

/**
 * Sprint 048 #048-42: one-shot welcome banner shown on the dashboard
 * after a successful first login. Triggered by the signup page writing
 * `shi_welcome_pending=1` to localStorage after successful
 * /auth/login. Dismissing clears the flag; the banner does not
 * reappear.
 */
export function WelcomeBanner() {
  const t = useTranslations('welcome')
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      if (window.localStorage.getItem('shi_welcome_pending') === '1') {
        setShow(true)
      }
    } catch {}
  }, [])

  function dismiss() {
    try {
      window.localStorage.removeItem('shi_welcome_pending')
    } catch {}
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="mb-6 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h2 className="font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('intro')}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Link
              href="/sovereign-health/measurements/new"
              onClick={dismiss}
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/15 rounded-lg px-3 py-1.5 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('ctaAddMeasurement')}
            </Link>
            <Link
              href="/sovereign-health/doctor-chat"
              onClick={dismiss}
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/15 rounded-lg px-3 py-1.5 text-xs font-medium"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {t('ctaDoctorChat')}
            </Link>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground"
          aria-label={t('dismiss')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
