'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Cookies from 'js-cookie'
import { api } from '@/lib/api'

/**
 * Tracks referral codes from ?ref= URL params on any page.
 * Sets first-touch cookie (30-day) and fires click tracking.
 * Mounted in root layout so it works on all routes.
 */
export function ReferralTracker() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const ref = searchParams.get('ref')?.trim().toLowerCase()
    if (!ref || ref.length === 0) return

    // Set cookie (first-touch only)
    const existing = Cookies.get('sh_ref')
    if (!existing) {
      Cookies.set('sh_ref', ref, { expires: 30, sameSite: 'lax', path: '/' })
    }

    // Track the click (fire and forget)
    api.affiliate.click(ref)
  }, [searchParams])

  return null
}
