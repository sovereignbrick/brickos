'use client'

// Sprint 046 #571 -- read the current org's licensed apps.
//
// Calls the existing `GET /org-settings/apps` endpoint and reduces the
// response to a Set<appKey>. Licensing is set by BrickOS platform admin
// via brickos-licensing (see Design 026) -- this hook is read-only.
//
// Falls back to an empty Set when unauthenticated or the org has no
// entitlements, so the caller can safely treat every app as "available
// but not licensed" and grey-render the sidebar accordingly.

import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'

interface OrgAppEntry {
  key: string
  enabled: boolean
}

export function useOrgEntitlements(): {
  licensed: Set<string>
  loading: boolean
} {
  const [licensed, setLicensed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = Cookies.get('auth_token')
    if (!token) {
      setLoading(false)
      return
    }
    let cancelled = false
    fetch('/org-settings/apps', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.json() : { data: [] }))
      .then(j => {
        if (cancelled) return
        const entries: OrgAppEntry[] = j.data || []
        const next = new Set<string>()
        for (const entry of entries) {
          if (entry.enabled) next.add(entry.key)
        }
        setLicensed(next)
      })
      .catch(() => {
        /* swallow -- caller defaults to "not licensed" */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { licensed, loading }
}
