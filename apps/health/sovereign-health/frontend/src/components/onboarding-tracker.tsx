'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

/**
 * Global onboarding step tracker — mounts in root layout.
 * Records page visits to localStorage so the OnboardingChecklist
 * on the dashboard can reflect completion even though it only
 * renders on /dashboard.
 */
export function OnboardingTracker() {
  const { user, isDemo } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!user || isDemo) return

    const manualKey = `sh_onboarding_manual_${user.id}`

    // Already dismissed — no need to track
    try {
      if (localStorage.getItem(`sh_onboarding_dismissed_${user.id}`) === 'true') return
    } catch { return }

    const manualMappings: Record<string, string> = {
      '/sovereign-health/trends': 'trends',
      '/sovereign-health/doctor-chat': 'doctor',
    }

    // Check zone/marker detail pages
    const isMarkerPage =
      pathname.startsWith('/sovereign-health/markers/') ||
      pathname.startsWith('/sovereign-health/zones/')
    let matchedKey = manualMappings[pathname] || (isMarkerPage ? 'marker' : null)

    // /settings tab tracking
    if (pathname === '/settings') {
      const tab = searchParams.get('tab')
      if (tab === 'devices') matchedKey = 'device'
      if (tab === 'profile' || !tab) matchedKey = 'profile'
    }

    if (matchedKey) {
      try {
        const raw = localStorage.getItem(manualKey)
        const manual: Record<string, boolean> = raw ? JSON.parse(raw) : {}
        if (!manual[matchedKey]) {
          manual[matchedKey] = true
          localStorage.setItem(manualKey, JSON.stringify(manual))
        }
      } catch {}
    }
  }, [user, isDemo, pathname, searchParams])

  return null
}
