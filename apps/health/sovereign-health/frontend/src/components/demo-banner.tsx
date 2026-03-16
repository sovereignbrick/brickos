'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useDemoProfile, DEMO_PROFILES, getProfileLabel } from '@/lib/demo-profile-context'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { useTranslations } from 'next-intl'

export function DemoBanner() {
  const { isDemo, isDemoOnly } = useAuth()
  const { profile } = useDemoProfile()
  const t = useTranslations('demo')
  const tCommon = useTranslations('common')
  const tNav = useTranslations('nav')
  const [dismissed, setDismissed] = useState(false)
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!isDemo || dismissed) return null

  const profileDef = DEMO_PROFILES.find(p => p.slug === profile)
  const profileLabel = getProfileLabel(profile, t)
  const profileName = profileLabel.name
  const profileColor = profileDef?.color ?? '#fb923c'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || submitting) return
    setSubmitting(true)
    try {
      await api.earlyAccess.submit(email.trim())
      setSubmitted(true)
      toast.success(t('onListMessage'))
    } catch {
      toast.error(t('errorMessage'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-background/95 border-b border-orange-500/30 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          <p className="text-xs text-muted-foreground shrink-0">
            {t('viewing', { profile: profileName })}
          </p>
          {submitted ? (
            <span className="text-xs text-emerald-400">{t('onList')}</span>
          ) : (
            <>
              <span className="text-xs text-muted-foreground shrink-0">{tCommon('earlyAccess')}</span>
              <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('placeholder')}
                  className="bg-white/5 border border-zinc-700 rounded px-2 py-0.5 text-xs w-40 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs px-2.5 py-0.5 rounded transition-colors shrink-0"
                >
                  {submitting ? '...' : tCommon('notifyMe')}
                </button>
              </form>
              {!isDemoOnly && (
                <Link href="/login" className="text-xs text-blue-400 hover:text-blue-300 underline shrink-0 ml-1">{tNav('login')}</Link>
              )}
            </>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground text-xs shrink-0"
          aria-label={t('dismissBanner')}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
