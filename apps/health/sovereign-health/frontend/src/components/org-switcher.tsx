'use client'

// Sprint 040 #484 -- multi-org switcher.
//
// Lives inside the user profile dropdown alongside the theme toggle (per
// design 022 §7.3 locked decision Q5). Lists every org_members row for the
// current user, plus a virtual "Personal (Individual)" option that points
// at the user's individual org. Selecting an option:
//   1. Sets the `org_context` cookie (HTTP-only would be ideal but we need
//      it readable by the frontend on next page load; SameSite=Lax is fine)
//   2. Reloads the page to refresh tier-aware UI
//
// URL ?org=<id> overrides the cookie for shareable links: a useEffect on
// mount inspects the search params and writes through to the cookie before
// reload.
//
// Hidden entirely if the user has zero org memberships.

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Cookies from 'js-cookie'
import { api } from '@/lib/api'

interface OrgRow {
  id: string
  name: string
  slug: string
  org_type: string
  role: string
}

const COOKIE_KEY = 'org_context'

export function OrgSwitcher() {
  const t = useTranslations('orgSwitcher')
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [current, setCurrent] = useState<string>('')

  useEffect(() => {
    api
      .myOrgs()
      .then((res) => setOrgs(res.data))
      .catch(() => setOrgs([]))
  }, [])

  // Read cookie on mount; honour ?org=... URL override.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const fromUrl = params.get('org')
    if (fromUrl) {
      Cookies.set(COOKIE_KEY, fromUrl, { sameSite: 'lax', expires: 30 })
      setCurrent(fromUrl)
      return
    }
    const fromCookie = Cookies.get(COOKIE_KEY) || ''
    setCurrent(fromCookie)
  }, [])

  if (orgs.length === 0) return null

  // Build option list: every membership + a virtual "personal" entry
  // that maps to the user's personal/individual org if it exists in the
  // membership list. Otherwise show the literal "Personal" label as the
  // unset option (id="").
  const personalOrg = orgs.find((o) => o.org_type === 'personal')

  const handleChange = (value: string) => {
    setCurrent(value)
    if (value) {
      Cookies.set(COOKIE_KEY, value, { sameSite: 'lax', expires: 30 })
    } else {
      Cookies.remove(COOKIE_KEY)
    }
    // Reload to refresh tier-aware UI throughout the app
    window.location.reload()
  }

  return (
    <div className="px-3 py-2 border-t border-zinc-800 space-y-1">
      <label className="text-[10px] text-zinc-500 uppercase tracking-wider">
        {t('label')}
      </label>
      <select
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
      >
        <option value={personalOrg?.id ?? ''}>{t('personal')}</option>
        {orgs
          .filter((o) => o.org_type !== 'personal')
          .map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.role})
            </option>
          ))}
      </select>
    </div>
  )
}
