'use client'

import { useEffect } from 'react'
import { SITE_CONFIG } from '@/lib/config'

/**
 * Client-side referral redirect handler.
 * When ?ref=XXXX is present on any page:
 * 1. Sets sh_ref cookie (first-touch only  - doesn't overwrite existing)
 * 2. Redirects to app registration page
 */
export function ReferralRedirect() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')?.trim().toLowerCase()

    if (!ref || ref.length === 0) return

    // Set cookie (first-touch only)
    const existingRef = document.cookie
      .split('; ')
      .find(row => row.startsWith('sh_ref='))
    if (!existingRef) {
      document.cookie = `sh_ref=${encodeURIComponent(ref)}; max-age=2592000; path=/; domain=.sovereignhealth.io; samesite=lax; secure`
    }

    // Redirect to app registration
    window.location.href = `${SITE_CONFIG.appUrl}/signup?ref=${encodeURIComponent(ref)}`
  }, [])

  return null
}
