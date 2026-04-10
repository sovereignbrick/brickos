'use client'

// Sprint 040 #478 -- platform admin Org detail page (Overview + Members tabs).
//
// Sibling tabs (License, Branding, Invoices, Audit) are wired up by #479,
// #480, #481 and the audit tab in #483. Each lives as a separate file in
// the same dynamic route directory.
//
// design 022 §7.2 Screen 2.

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { formatDate } from '@/lib/date-format'

interface OrgDetail {
  id: string
  name: string
  slug: string
  org_type: string
  billing_email: string | null
  is_active: boolean
  created_at: string
  branding: Record<string, unknown>
  license: {
    tier_slug: string | null
    features: string[]
    max_owners: number | null
    max_practitioners: number | null
    max_members: number | null
    expires_at: string | null
    revoked_at: string | null
    issued_at: string | null
    jti: string | null
    stripe_invoice_id: string | null
    lifecycle_status: 'active' | 'grace' | 'expired' | 'revoked' | 'no_license'
  }
  seats: { owners: number; practitioners: number; members: number; total: number }
}

interface OrgMember {
  id: string
  user_id: string
  email: string
  display_name: string | null
  role: string
  joined_at: string
  last_active_at: string | null
}

const ROLES = ['org_owner', 'practitioner', 'member'] as const
type Role = (typeof ROLES)[number]

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-400/10 text-green-400',
  grace: 'bg-amber-400/10 text-amber-400',
  expired: 'bg-red-400/10 text-red-400',
  revoked: 'bg-zinc-700 text-zinc-400',
  no_license: 'bg-zinc-800 text-zinc-500',
}

/**
 * Read role display labels from `org.branding.role_labels`. Falls back to the
 * canonical role name. design 022 §7.2: per-org overrides like
 * { "practitioner": "Doctor", "member": "Patient" }.
 */
function getRoleLabel(branding: Record<string, unknown>, role: string): string {
  const labels = branding?.role_labels as Record<string, string> | undefined
  return labels?.[role] ?? role
}

function SeatBar({ label, current, max }: { label: string; current: number; max: number | null }) {
  const limit = max ?? 0
  const unlimited = limit < 0
  const pct = unlimited ? 0 : limit > 0 ? Math.min(100, (current / limit) * 100) : 0
  const over = !unlimited && limit > 0 && current >= limit
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className={`tabular-nums ${over ? 'text-red-400' : 'text-zinc-300'}`}>
          {current} / {unlimited ? '∞' : limit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full transition-all ${over ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-green-500'}`}
          style={{ width: unlimited ? '100%' : `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function OrgDetailPage() {
  const params = useParams<{ id: string }>()
  const orgId = params.id
  const t = useTranslations('platform.orgDetail')
  const [tab, setTab] = useState<'overview' | 'members'>('overview')
  const [org, setOrg] = useState<OrgDetail | null>(null)
  const [members, setMembers] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState<Role | ''>('')
  const [showAdd, setShowAdd] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState<Role>('member')
  const [adding, setAdding] = useState(false)

  const fetchOrg = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.admin.getOrganization(orgId)
      setOrg(res.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load org')
    } finally {
      setLoading(false)
    }
  }, [orgId])

  const fetchMembers = useCallback(async () => {
    try {
      const res = await api.admin.orgMembers(orgId)
      setMembers(res.data)
    } catch {
      setMembers([])
    }
  }, [orgId])

  useEffect(() => {
    fetchOrg()
    fetchMembers()
  }, [fetchOrg, fetchMembers])

  const handleAddMember = async () => {
    if (!addEmail || !addEmail.includes('@')) return
    setAdding(true)
    try {
      await api.admin.addOrgMember(orgId, { email: addEmail, role: addRole })
      toast.success(t('membersTab.memberAdded'))
      setAddEmail('')
      setShowAdd(false)
      await Promise.all([fetchOrg(), fetchMembers()])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add member')
    } finally {
      setAdding(false)
    }
  }

  const handleChangeRole = async (memberId: string, role: Role) => {
    try {
      await api.admin.updateMemberRole(orgId, memberId, role)
      toast.success(t('membersTab.roleUpdated'))
      await Promise.all([fetchOrg(), fetchMembers()])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm(t('membersTab.removeConfirm'))) return
    try {
      await api.admin.removeOrgMember(orgId, memberId)
      toast.success(t('membersTab.memberRemoved'))
      await Promise.all([fetchOrg(), fetchMembers()])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove')
    }
  }

  if (loading || !org) {
    return (
      <div className="space-y-6">
        <Link href="/platform/orgs" className="text-xs text-zinc-400 hover:text-zinc-200">
          {t('backToList')}
        </Link>
        <div className="text-zinc-500">Loading...</div>
      </div>
    )
  }

  const filteredMembers = roleFilter ? members.filter((m) => m.role === roleFilter) : members

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Link href="/platform/orgs" className="text-xs text-zinc-400 hover:text-zinc-200 inline-block">
          {t('backToList')}
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{org.name}</h1>
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              STATUS_COLORS[org.license.lifecycle_status]
            }`}
          >
            {org.license.lifecycle_status}
          </span>
        </div>
        <p className="text-sm text-zinc-500 font-mono">{org.slug}</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800 flex items-center gap-1">
        {(
          [
            ['overview', t('tabs.overview')],
            ['members', t('tabs.members')],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-orange-500 text-zinc-50'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {label}
          </button>
        ))}
        {/* Tabs reserved for #479/#480/#481 -- placeholders so the URL exists */}
        {(['license', 'branding', 'invoices', 'audit'] as const).map((key) => (
          <span
            key={key}
            className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-zinc-700 cursor-not-allowed"
            title="Coming in a follow-up issue"
          >
            {t(`tabs.${key}`)}
          </span>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-zinc-800 p-5 space-y-3">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t('metadata')}
            </h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">{t('name')}</dt>
                <dd className="font-medium">{org.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">{t('slug')}</dt>
                <dd className="font-mono text-xs">{org.slug}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">{t('type')}</dt>
                <dd>{org.org_type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">{t('billingEmail')}</dt>
                <dd className="text-zinc-300">{org.billing_email ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">{t('createdAt')}</dt>
                <dd className="text-zinc-300">{formatDate(org.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">{t('stripeCustomer')}</dt>
                <dd className="text-zinc-300">
                  {org.license.stripe_invoice_id ? (
                    <span className="text-blue-400 font-mono text-xs">
                      {org.license.stripe_invoice_id}
                    </span>
                  ) : (
                    <span className="text-zinc-600">{t('noStripe')}</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-zinc-800 p-5 space-y-3">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t('currentLicense')}
            </h2>
            {org.license.tier_slug ? (
              <>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">{t('tier')}</dt>
                    <dd className="font-semibold">{org.license.tier_slug}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">{t('issuedAt')}</dt>
                    <dd className="text-zinc-300">
                      {org.license.issued_at ? formatDate(org.license.issued_at) : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">{t('expiresAt')}</dt>
                    <dd className="text-zinc-300">
                      {org.license.expires_at ? formatDate(org.license.expires_at) : '—'}
                    </dd>
                  </div>
                </dl>
                <div className="space-y-2 pt-2 border-t border-zinc-800/50">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">{t('seats')}</p>
                  <SeatBar
                    label={getRoleLabel(org.branding, 'org_owner')}
                    current={org.seats.owners}
                    max={org.license.max_owners}
                  />
                  <SeatBar
                    label={getRoleLabel(org.branding, 'practitioner')}
                    current={org.seats.practitioners}
                    max={org.license.max_practitioners}
                  />
                  <SeatBar
                    label={getRoleLabel(org.branding, 'member')}
                    current={org.seats.members}
                    max={org.license.max_members}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-500">{t('noActiveLicense')}</p>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800 p-5 space-y-2 lg:col-span-2">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t('quickActions')}
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled
                title="Coming in #479"
                className="text-xs bg-zinc-800 text-zinc-500 px-3 py-1.5 rounded cursor-not-allowed"
              >
                {t('actionGenerate')}
              </button>
              <button
                type="button"
                disabled
                title="Coming in #481"
                className="text-xs bg-zinc-800 text-zinc-500 px-3 py-1.5 rounded cursor-not-allowed"
              >
                {t('actionInvoices')}
              </button>
              <button
                type="button"
                disabled
                title="Coming in #480"
                className="text-xs bg-zinc-800 text-zinc-500 px-3 py-1.5 rounded cursor-not-allowed"
              >
                {t('actionBranding')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members tab */}
      {tab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as Role | '')}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">{t('membersTab.filterAllRoles')}</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {getRoleLabel(org.branding, r)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowAdd((s) => !s)}
              className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded transition-colors"
            >
              {t('membersTab.addMember')}
            </button>
          </div>

          {showAdd && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[240px] space-y-1">
                <label className="text-xs text-zinc-500">{t('membersTab.addEmail')}</label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">{t('roleCol')}</label>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as Role)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {getRoleLabel(org.branding, r)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleAddMember}
                disabled={adding || !addEmail}
                className="text-xs bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-3 py-2 rounded transition-colors"
              >
                {adding ? '...' : t('membersTab.add')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false)
                  setAddEmail('')
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-2"
              >
                {t('membersTab.addCancel')}
              </button>
            </div>
          )}

          <div className="rounded-2xl border border-zinc-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4">
                    {t('membersTab.memberCol')}
                  </th>
                  <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4">
                    {t('membersTab.roleCol')}
                  </th>
                  <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4">
                    {t('membersTab.joinedCol')}
                  </th>
                  <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4">
                    {t('membersTab.lastActiveCol')}
                  </th>
                  <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-right py-2.5 px-4">
                    {t('membersTab.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500">
                      {t('membersTab.noMembers')}
                    </td>
                  </tr>
                )}
                {filteredMembers.map((m) => (
                  <tr key={m.id} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                    <td className="py-2.5 px-4">
                      <div className="font-medium">{m.display_name || m.email}</div>
                      {m.display_name && (
                        <div className="text-xs text-zinc-500">{m.email}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <select
                        value={m.role}
                        onChange={(e) => handleChangeRole(m.id, e.target.value as Role)}
                        className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {getRoleLabel(org.branding, r)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-zinc-400">
                      {formatDate(m.joined_at)}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-zinc-400">
                      {m.last_active_at ? formatDate(m.last_active_at) : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
