'use client'

import { usePathname } from 'next/navigation'
import { APP_CONFIG } from '@/lib/config'

const CANONICAL_BASE = APP_CONFIG.appUrl

function isDemoHost(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.hostname === APP_CONFIG.demoHostname
}

export function CanonicalMeta() {
  const pathname = usePathname()
  const isDemo = isDemoHost()
  const canonicalUrl = `${CANONICAL_BASE}${pathname}`

  return (
    <>
      <link rel="canonical" href={canonicalUrl} />
      {isDemo && <meta name="robots" content="noindex, follow" />}
    </>
  )
}
