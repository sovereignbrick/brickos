'use client'

import { useEffect } from 'react'
import { SITE_CONFIG } from '@/lib/config'

/**
 * Client-side referral handler.
 * When ?ref=XXXX is present on any page:
 * 1. Tracks the click via the API
 * 2. Sets sh_ref cookie (first-touch only — doesn't overwrite existing)
 * 3. Cleans up the URL (removes ?ref= param) — user stays on the website
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
      // Use .sovereignhealth.io domain in production, omit for localhost
      const isLocalhost = window.location.hostname === 'localhost'
      const domainAttr = isLocalhost ? '' : '; domain=.sovereignhealth.io'
      const secureAttr = isLocalhost ? '' : '; secure'
      document.cookie = `sh_ref=${encodeURIComponent(ref)}; max-age=2592000; path=/${domainAttr}; samesite=lax${secureAttr}`
    }

    // Track the click via API
    fetch(`${SITE_CONFIG.apiUrl}/api/affiliate/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ affiliate_code: ref }),
    }).catch(() => {}) // fire-and-forget

    // Clean up URL — remove ref param, keep other params if any
    params.delete('ref')
    const cleanSearch = params.toString()
    const cleanUrl = `${window.location.pathname}${cleanSearch ? `?${cleanSearch}` : ''}`
    window.history.replaceState({}, '', cleanUrl)
  }, [])

  return null
}
