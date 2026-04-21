'use client'

import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/auth-context'

/**
 * Sprint 048 #048-21: one-time consent prompt for patients on first
 * login after an org invite. Fires when the user is a member of an
 * org that has no consent row yet (pending state). Dismissal is
 * cached in localStorage per (user, org) so the prompt doesn't
 * re-appear on every navigation.
 *
 * Placement: rendered in the root layout. It renders nothing unless:
 *   - user is authenticated
 *   - user has at least one org with consent state 'pending'
 *   - the (user, org) tuple hasn't been dismissed in this browser
 *
 * Clicking "Grant access" hits /user/organization-access/{id}/grant;
 * clicking "Not now" sets the localStorage dismissal flag. Revoking
 * or re-granting later is always available in
 * /settings/organization-access.
 */

interface PendingOrg {
  org_id: string
  org_name: string
  is_granted: boolean
  granted_at: string | null
  revoked_at: string | null
}

function dismissKey(userId: string, orgId: string): string {
  return `consent-prompt-dismissed:${userId}:${orgId}`
}

export function ConsentOnboardingPrompt() {
  const t = useTranslations('consentPrompt')
  const { user, loading } = useAuth()
  const [pending, setPending] = useState<PendingOrg | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (loading || !user) return
    const token = Cookies.get('auth_token')
    fetch('/user/organization-access', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(j => {
        const orgs = (j?.data ?? []) as Array<PendingOrg & { is_granted: boolean }>
        // "pending" = never granted (granted_at null) AND never revoked.
        // A user who previously revoked must re-grant via Settings
        // explicitly; we don't nag them again.
        const first = orgs.find(
          o => !o.is_granted && !o.granted_at && !o.revoked_at &&
            !window.localStorage.getItem(dismissKey(user.id, o.org_id)),
        )
        setPending(first ?? null)
      })
      .catch(() => {})
  }, [user, loading])

  if (!pending || !user) return null

  async function grant() {
    if (!pending) return
    setSaving(true)
    try {
      const token = Cookies.get('auth_token')
      await fetch(`/user/organization-access/${pending.org_id}/grant`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      setPending(null)
    } catch {
      // swallow; banner reappears on next mount
    } finally {
      setSaving(false)
    }
  }

  function dismiss() {
    if (!pending || !user) return
    window.localStorage.setItem(dismissKey(user.id, pending.org_id), '1')
    setPending(null)
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          {t('title', { orgName: pending.org_name })}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('body', { orgName: pending.org_name })}
        </p>
        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
          <li>{t('bulletReadOnly')}</li>
          <li>{t('bulletNoChat')}</li>
          <li>{t('bulletRevokable')}</li>
        </ul>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={dismiss}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground"
          >
            {t('deny')}
          </button>
          <button
            type="button"
            onClick={grant}
            disabled={saving}
            className="brand-primary-bg text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? '…' : t('grant')}
          </button>
        </div>
      </div>
    </div>
  )
}
