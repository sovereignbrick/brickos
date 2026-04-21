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
  // Sprint 048 #048-44: revoke-confirm state. null = modal hidden.
  const [revokeConfirm, setRevokeConfirm] = useState<OrganizationAccessEntry | null>(null)

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
    // Sprint 048 #048-44: flipping OFF goes through a confirm modal.
    // Flipping ON is instant (no confirm -- the patient is granting).
    if (org.is_granted) {
      setRevokeConfirm(org)
      return
    }
    await applyToggle(org, 'grant')
  }

  async function applyToggle(
    org: OrganizationAccessEntry,
    endpoint: 'grant' | 'revoke',
  ) {
    setSaving(org.org_id)
    try {
      const token = Cookies.get('auth_token')
      const res = await fetch(`/user/organization-access/${org.org_id}/${endpoint}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`${res.status}`)
      await fetchEntries()
      toast.success(
        endpoint === 'revoke'
          ? t('revokedToast', { orgName: org.org_name })
          : t('grantedToast', { orgName: org.org_name }),
      )
    } catch {
      toast.error(t('saveFailed'))
    } finally {
      setSaving(null)
      setRevokeConfirm(null)
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
        {/* Sprint 048 #048-43: link to the audit log so patients can
            see every time a practitioner accessed their data. */}
        <p className="text-xs text-muted-foreground mt-3">
          <a href="/sovereign-health/data-access-log" className="underline hover:text-foreground">
            {t('viewAccessLog')}
          </a>
        </p>
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

      {/* Sprint 048 #048-44: revoke confirmation modal. */}
      {revokeConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold">
              {t('revokeConfirmTitle', { orgName: revokeConfirm.org_name })}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('revokeConfirmBody', { orgName: revokeConfirm.org_name })}
            </p>
            <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
              <li>{t('revokeBulletSession')}</li>
              <li>{t('revokeBulletReversible')}</li>
            </ul>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRevokeConfirm(null)}
                disabled={saving !== null}
                className="px-4 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground"
              >
                {t('revokeCancel')}
              </button>
              <button
                type="button"
                onClick={() => applyToggle(revokeConfirm, 'revoke')}
                disabled={saving !== null}
                className="bg-red-500/90 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving !== null ? '…' : t('revokeConfirmButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
