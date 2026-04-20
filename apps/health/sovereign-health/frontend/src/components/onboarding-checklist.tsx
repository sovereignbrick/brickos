'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

interface OnboardingStep {
  key: string
  icon: string
  completed: boolean
  href: string
  number: number
}

function getStorageKey(userId: string) {
  return `sh_onboarding_dismissed_${userId}`
}

function getManualKey(userId: string) {
  return `sh_onboarding_manual_${userId}`
}

export function OnboardingChecklist() {
  const { user, isDemo } = useAuth()
  const t = useTranslations('onboarding')
  const [dismissed, setDismissed] = useState(true)
  const [steps, setSteps] = useState<OnboardingStep[]>([])
  const [loading, setLoading] = useState(true)

  const checkProgress = useCallback(async () => {
    if (!user) return

    // Check if user dismissed the checklist
    try {
      if (localStorage.getItem(getStorageKey(user.id)) === 'true') {
        setDismissed(true)
        setLoading(false)
        return
      }
    } catch {}

    // Load manually completed steps
    let manual: Record<string, boolean> = {}
    try {
      const raw = localStorage.getItem(getManualKey(user.id))
      if (raw) manual = JSON.parse(raw)
    } catch {}

    setDismissed(false)

    try {
      // Fetch data to determine step completion
      const [settingsRes, zonesRes] = await Promise.all([
        api.settings.get().catch(() => null),
        api.zones.list().catch(() => null),
      ])

      const profile = settingsRes?.data?.profile
      const zones = zonesRes?.data || []
      const hasMeasurements = zones.some((z: { markers_with_data: number }) => z.markers_with_data > 0)

      // Profile: has gender or height or weight set
      const hasProfile = !!(
        profile?.gender ||
        profile?.height_cm ||
        profile?.default_weight_kg
      )

      const newSteps: OnboardingStep[] = [
        {
          key: 'profile',
          icon: '👤',
          completed: hasProfile || manual['profile'] || false,
          href: '/settings?tab=profile',
          number: 1,
        },
        {
          key: 'device',
          icon: '🔬',
          completed: manual['device'] || false,
          href: '/settings?tab=devices',
          number: 2,
        },
        {
          key: 'measurement',
          icon: '📊',
          completed: hasMeasurements,
          href: '/sovereign-health/measurements/new',
          number: 3,
        },
        {
          key: 'marker',
          icon: '🧬',
          completed: manual['marker'] || false,
          href: '/sovereign-health/zones/energy_metabolic',
          number: 4,
        },
        {
          key: 'trends',
          icon: '📈',
          completed: manual['trends'] || false,
          href: '/sovereign-health/trends',
          number: 5,
        },
        {
          key: 'doctor',
          icon: '💬',
          completed: manual['doctor'] || false,
          href: '/sovereign-health/doctor-chat',
          number: 6,
        },
      ]

      setSteps(newSteps)
    } catch {
      setSteps([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    checkProgress()
  }, [checkProgress])

  // Re-check progress every time the dashboard mounts, gains focus, or becomes visible
  // (manual steps are tracked globally by OnboardingTracker in root layout)
  useEffect(() => {
    const onFocus = () => checkProgress()
    const onVisible = () => { if (document.visibilityState === 'visible') checkProgress() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [checkProgress])

  if (isDemo || !user || dismissed || loading || steps.length === 0) return null

  const completedCount = steps.filter(s => s.completed).length
  const allDone = completedCount === steps.length

  // Auto-dismiss if all steps completed
  if (allDone) {
    try {
      localStorage.setItem(getStorageKey(user.id), 'true')
    } catch {}
    return null
  }

  const progressPct = Math.round((completedCount / steps.length) * 100)

  const handleDismiss = () => {
    try {
      localStorage.setItem(getStorageKey(user.id), 'true')
    } catch {}
    setDismissed(true)
  }

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">{t('title')}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('progress', { completed: completedCount, total: steps.length })}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          {t('dismiss')}
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {steps.map(step => (
          <Link
            key={step.key}
            href={step.href}
            className={`flex items-start gap-3 rounded-xl border px-3 py-3 transition-colors ${
              step.completed
                ? 'border-border bg-muted/30 text-muted-foreground'
                : 'border-border hover:border-blue-500/50 hover:bg-blue-500/5'
            }`}
          >
            <span className="text-base mt-0.5">{step.completed ? '✓' : step.icon}</span>
            <div className="flex-1 min-w-0">
              <span className={`text-xs font-medium block ${step.completed ? 'line-through' : ''}`}>
                {step.number}. {t(`steps.${step.key}`)}
              </span>
              <span className="text-[11px] text-muted-foreground leading-tight block mt-0.5">
                {t(`steps.${step.key}Desc`)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
