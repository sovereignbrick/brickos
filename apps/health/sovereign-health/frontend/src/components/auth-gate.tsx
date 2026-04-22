'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

// Paths that can be visited without authentication. Everything else is
// gated: unauthenticated visitors are sent to /login with a return URL.
// Sprint 047 RC fix -- previously auth-context quietly treated every
// unauthed user as a "demo" user, so pages rendered (with degraded
// data) on staging/prod subdomains that are supposed to require login.
const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/signup',
  '/register',
  '/reset-password',
  '/forgot-password',
  '/verify-email',
  '/offline',
  '/privacy',
  '/terms',
  '/legal',
]

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true
  return PUBLIC_PATH_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export function AuthGate() {
  const pathname = usePathname()
  const { user, loading, isDemoOnly, isEvalHost } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (user) return
    // Public demo hosts: unauthed is fine (the whole site is demo mode).
    // Sprint 049 #049-04: `isEvalHost` added for eval.sovereignhealth.io.
    if (isDemoOnly || isEvalHost) return
    const path = pathname ?? '/'
    if (isPublicPath(path)) return
    // Not authed, not on a demo host, not on a public path -> /login.
    const returnUrl = encodeURIComponent(path)
    router.replace(`/login?return=${returnUrl}`)
  }, [loading, user, isDemoOnly, isEvalHost, pathname, router])

  return null
}
