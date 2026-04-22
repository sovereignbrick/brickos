'use client'

import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { useTranslations } from 'next-intl'
import { toast } from '@/lib/toast'

interface OrgMember {
  id: string
  user_id: string
  email: string
  display_name: string | null
  role: string
  joined_at: string
  last_active_at: string | null
  consent_state: 'granted' | 'revoked' | 'pending'
  consent_granted_at: string | null
  consent_revoked_at: string | null
}

const ROLE_OPTIONS = ['org_owner', 'practitioner', 'org_member'] as const
type RoleOption = (typeof ROLE_OPTIONS)[number]

export default function OrgMembersPage() {
  const t = useTranslations('orgMembers')
  const [members, setMembers] = useState<OrgMember[] | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<RoleOption>('org_member')
  // Sprint 049 #049-22 (Sprint 048 #048-34): bulk consent reminder.
  const [bulkBusy, setBulkBusy] = useState(false)

  async function fetchMembers() {
    try {
      const token = Cookies.get('auth_token')
      const res = await fetch('/org-settings/members', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const json = await res.json()
      setMembers(json.data || [])
    } catch {
      setMembers([])
      toast.error(t('loadFailed'))
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  async function invite() {
    if (!inviteEmail.trim()) return
    setSaving('invite')
    try {
      const token = Cookies.get('auth_token')
      const res = await fetch('/org-settings/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message ?? `${res.status}`)
      }
      toast.success(t('inviteSuccess'))
      setInviteOpen(false)
      setInviteEmail('')
      setInviteRole('org_member')
      await fetchMembers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('inviteFailed'))
    } finally {
      setSaving(null)
    }
  }

  async function changeRole(member: OrgMember, role: RoleOption) {
    setSaving(member.user_id)
    try {
      const token = Cookies.get('auth_token')
      const res = await fetch(`/org-settings/members/${member.user_id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      toast.success(t('roleChanged', { role: t(`roles.${role}`) }))
      await fetchMembers()
    } catch {
      toast.error(t('roleChangeFailed'))
    } finally {
      setSaving(null)
    }
  }

  async function removeMember(member: OrgMember) {
    if (!confirm(t('removeConfirm', { name: member.display_name || member.email }))) return
    setSaving(member.user_id)
    try {
      const token = Cookies.get('auth_token')
      const res = await fetch(`/org-settings/members/${member.user_id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`${res.status}`)
      toast.success(t('removeSuccess'))
      await fetchMembers()
    } catch {
      toast.error(t('removeFailed'))
    } finally {
      setSaving(null)
    }
  }

  if (members === null) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="h-4 bg-muted rounded w-64 animate-pulse" />
        <div className="h-24 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {members.length === 1
              ? t('countOne')
              : t('countOther', { count: members.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              const pending = members.filter(m => m.role === 'org_member' && m.consent_state === 'pending').length
              if (pending === 0) {
                toast.info(t('bulkReminderNone'))
                return
              }
              if (!confirm(t('bulkReminderConfirm', { count: pending }))) return
              setBulkBusy(true)
              try {
                const token = Cookies.get('auth_token')
                const res = await fetch('/org-settings/consent-reminders', {
                  method: 'POST',
                  headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
                })
                if (!res.ok) throw new Error(`${res.status}`)
                const json = await res.json()
                toast.success(t('bulkReminderSent', { sent: json.data?.sent ?? 0, total: json.data?.total ?? 0 }))
              } catch {
                toast.error(t('bulkReminderFailed'))
              } finally {
                setBulkBusy(false)
              }
            }}
            disabled={bulkBusy || members.filter(m => m.role === 'org_member' && m.consent_state === 'pending').length === 0}
            className="text-sm border border-border px-3 py-2 rounded-lg hover:bg-accent disabled:opacity-50"
            title={t('bulkReminderTooltip')}
          >
            {bulkBusy ? t('bulkReminderBusy') : t('bulkReminderButton')}
          </button>
          <button
            type="button"
            onClick={() => setInviteOpen(o => !o)}
            className="brand-primary-bg text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
          >
            {t('inviteButton')}
          </button>
        </div>
      </div>

      {inviteOpen && (
        <div className="border border-border rounded-lg p-4 space-y-3 bg-card">
          <h2 className="text-sm font-semibold">{t('inviteTitle')}</h2>
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              type="email"
              placeholder={t('invitePlaceholder')}
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="bg-white/5 border rounded-lg px-3 py-2 text-sm"
              autoFocus
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as RoleOption)}
              className="bg-white/5 border rounded-lg px-3 py-2 text-sm"
            >
              {ROLE_OPTIONS.map(r => (
                <option key={r} value={r}>
                  {t(`roles.${r}`)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={invite}
              disabled={saving === 'invite'}
              className="brand-primary-bg text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving === 'invite' ? '…' : t('inviteSubmit')}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{t('inviteHint')}</p>
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">{t('colUser')}</th>
              <th className="px-4 py-3 font-medium">{t('colRole')}</th>
              <th className="px-4 py-3 font-medium">{t('colConsent')}</th>
              <th className="px-4 py-3 font-medium">{t('colLastActive')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.map(member => {
              const busy = saving === member.user_id
              return (
                <tr key={member.user_id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium">{member.display_name || member.email}</div>
                    {member.display_name && (
                      <div className="text-xs text-muted-foreground">{member.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={member.role}
                      onChange={e => changeRole(member, e.target.value as RoleOption)}
                      disabled={busy}
                      className="bg-white/5 border rounded px-2 py-1 text-xs"
                    >
                      {ROLE_OPTIONS.map(r => (
                        <option key={r} value={r}>
                          {t(`roles.${r}`)}
                        </option>
                      ))}
                      {/* Legacy role values already present in the DB
                          need to survive round-trip selects. */}
                      {!(ROLE_OPTIONS as readonly string[]).includes(member.role) && (
                        <option value={member.role}>{member.role}</option>
                      )}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <ConsentBadge state={member.consent_state} t={t} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {member.last_active_at
                      ? new Date(member.last_active_at).toLocaleDateString()
                      : t('never')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => removeMember(member)}
                      disabled={busy}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40"
                    >
                      {t('remove')}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ConsentBadge({
  state,
  t,
}: {
  state: OrgMember['consent_state']
  t: ReturnType<typeof useTranslations>
}) {
  const classes = {
    granted: 'bg-green-500/20 text-green-400 border-green-500/30',
    revoked: 'bg-red-500/20 text-red-400 border-red-500/30',
    pending: 'bg-muted text-muted-foreground border-border',
  }[state]
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${classes}`}>
      {t(`consent.${state}`)}
    </span>
  )
}
