'use client'

// Sprint 045 #564 -- client-side plane gate. Runs on mount + on every
// navigation and redirects when the current path belongs to the opposite
// plane. See src/lib/plane.ts for the rules.

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { getPlane, planeRedirectTarget } from '@/lib/plane'

export function PlaneGate() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const host = window.location.hostname
    const plane = getPlane(host)
    if (plane === 'unknown') return

    const target = planeRedirectTarget(plane, pathname ?? '/', host, window.location.protocol)
    if (target) {
      const url = `${target}${window.location.search}${window.location.hash}`
      window.location.replace(url)
    }
  }, [pathname])

  return null
}
