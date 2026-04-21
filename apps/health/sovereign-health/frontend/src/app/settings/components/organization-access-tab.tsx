'use client'

import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { useTranslations } from 'next-intl'
import { toast } from '@/lib/toast'

interface OrganizationAccessEntry {
  org_id: string
  org_name: string
  org_slug: string
  member_role: string
  joined_at: string | null
  granted_at: string | null
  revoked_at: string | null
  is_granted: boolean
}

interface Props {
  /** Fires after the initial fetch. Parent uses this to hide the tab
   *  when the user is not a member of any non-default org. */
  onLoaded?: (entries: OrganizationAccessEntry[]) => void
}

export function OrganizationAccessTab({ onLoaded }: Props) {
  const t = useTranslations('organizationAccess')
  const [entries, setEntries] = useState<OrganizationAccessEntry[] | null>(null)
  const [saving, setSaving] = useState<string | null>(null) // org_id while toggling

  const fetchEntries = async () => {
    try {
      const token = Cookies.get('auth_token')
      const res = await fetch('/user/organization-access', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const json = await res.json()
      const list = (json.data ?? []) as OrganizationAccessEntry[]
      setEntries(list)
      onLoaded?.(list)
    } catch (err) {
      setEntries([])
      onLoaded?.([])
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [])

  async function toggle(org: OrganizationAccessEntry) {
    setSaving(org.org_id)
    try {
      const token = Cookies.get('auth_token')
      const endpoint = org.is_granted ? 'revoke' : 'grant'
      const res = await fetch(`/user/organization-access/${org.org_id}/${endpoint}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`${res.status}`)
      await fetchEntries()
      toast.success(org.is_granted ? t('revokedToast', { orgName: org.org_name }) : t('grantedToast', { orgName: org.org_name }))
    } catch {
      toast.error(t('saveFailed'))
    } finally {
      setSaving(null)
    }
  }

  if (entries === null) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="h-4 bg-muted rounded w-64 animate-pulse" />
        <div className="h-16 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (entries.length === 0) {
    // Rendered only defensively -- the parent should filter out this
    // tab entirely when the list is empty.
    return (
      <div className="text-sm text-muted-foreground max-w-2xl">
        {t('noOrgsFallback')}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="text-sm text-muted-foreground mt-2">{t('intro')}</p>
      </div>

      <div className="space-y-3">
        {entries.map(org => {
          const busy = saving === org.org_id
          return (
            <div
              key={org.org_id}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
            >
              <div>
                <p className="font-medium">{org.org_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('role', { role: org.member_role })}
                  {org.joined_at && (
                    <> · {t('joinedOn', { date: new Date(org.joined_at).toLocaleDateString() })}</>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {org.is_granted && org.granted_at
                    ? t('grantedOn', { date: new Date(org.granted_at).toLocaleDateString() })
                    : org.revoked_at
                      ? t('revokedOn', { date: new Date(org.revoked_at).toLocaleDateString() })
                      : t('neverGranted')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggle(org)}
                disabled={busy}
                aria-pressed={org.is_granted}
                className={[
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  org.is_granted ? 'bg-green-500' : 'bg-muted',
                  busy ? 'opacity-50 cursor-wait' : 'cursor-pointer',
                ].join(' ')}
                title={org.is_granted ? t('toggleOn') : t('toggleOff')}
              >
                <span
                  className={[
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    org.is_granted ? 'translate-x-6' : 'translate-x-1',
                  ].join(' ')}
                />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
