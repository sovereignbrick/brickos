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
      '/trends': 'trends',
      '/doctor-chat': 'doctor',
    }

    // Check zone/marker detail pages
    const isMarkerPage = pathname.startsWith('/markers/') || pathname.startsWith('/zones/')
    let matchedKey = manualMappings[pathname] || (isMarkerPage ? 'marker' : null)

    // /settings only counts as 'device' if tab=devices
    if (pathname === '/settings' && searchParams.get('tab') === 'devices') {
      matchedKey = 'device'
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
