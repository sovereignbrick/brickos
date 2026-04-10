'use client'

// Sprint 040 #477 -- platform admin Orgs list view.
//
// Builds on the existing organizations endpoint (now extended with active
// brickos.org_licenses summary fields). Adds filters, sortable columns, and
// bulk actions (CSV export + send renewal reminder via the manual-send flow
// from #476).
//
// design 022 §7.2 Screen 1.

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { formatDate } from '@/lib/date-format'

interface OrgRow {
  id: string
  name: string
  slug: string
  org_type: string
  billing_email: string | null
  is_active: boolean
  member_count: number
  branding: Record<string, unknown>
  created_at: string
  tier_slug: string | null
  max_members: number | null
  max_owners: number | null
  max_practitioners: number | null
  expires_at: string | null
  revoked_at: string | null
  stripe_invoice_id: string | null
  lifecycle_status: 'active' | 'grace' | 'expired' | 'revoked' | 'no_license'
}

const ORG_TYPES = ['platform', 'clinic', 'enterprise', 'personal', 'demo']
const STATUS_OPTIONS = ['active', 'grace', 'expired', 'revoked', 'no_license'] as const
const EXPIRES_OPTIONS = [7, 30, 90] as const
const PER_PAGE = 50

const TYPE_COLORS: Record<string, string> = {
  platform: 'bg-orange-400/10 text-orange-400',
  clinic: 'bg-blue-400/10 text-blue-400',
  enterprise: 'bg-purple-400/10 text-purple-400',
  personal: 'bg-zinc-700 text-zinc-400',
  demo: 'bg-amber-400/10 text-amber-400',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-400/10 text-green-400',
  grace: 'bg-amber-400/10 text-amber-400',
  expired: 'bg-red-400/10 text-red-400',
  revoked: 'bg-zinc-700 text-zinc-400',
  no_license: 'bg-zinc-800 text-zinc-500',
}

type SortKey = 'name' | 'org_type' | 'tier_slug' | 'member_count' | 'expires_at' | 'lifecycle_status'
type SortDir = 'asc' | 'desc'

function csvEscape(value: unknown): string {
  if (value == null) return ''
  const s = String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function formatMembers(row: OrgRow): string {
  const max = row.max_members
  if (max == null || max < 0) return `${row.member_count}`
  return `${row.member_count} / ${max}`
}

export default function OrgsPage() {
  const t = useTranslations('platform.orgs')
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expiresWithin, setExpiresWithin] = useState<number | ''>('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [bulkBusy, setBulkBusy] = useState(false)

  const fetchOrgs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.admin.organizations(
        page,
        PER_PAGE,
        search || undefined,
        typeFilter || undefined,
        statusFilter || undefined,
        expiresWithin || undefined,
      )
      setOrgs(res.data as OrgRow[])
      setTotal(res.meta.total)
    } catch {
      setOrgs([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, search, typeFilter, statusFilter, expiresWithin])

  useEffect(() => {
    fetchOrgs()
  }, [fetchOrgs])

  // Reset selection when filters change.
  useEffect(() => {
    setSelected(new Set())
  }, [page, search, typeFilter, statusFilter, expiresWithin])

  const sortedOrgs = useMemo(() => {
    const copy = [...orgs]
    copy.sort((a, b) => {
      const av = (a[sortKey] ?? '') as string | number
      const bv = (b[sortKey] ?? '') as string | number
      if (av === bv) return 0
      const cmp = av < bv ? -1 : 1
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [orgs, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const toggleAll = () => {
    if (selected.size === sortedOrgs.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(sortedOrgs.map((o) => o.id)))
    }
  }

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const exportCsv = () => {
    const targets = sortedOrgs.filter((o) => selected.has(o.id))
    if (targets.length === 0) return
    const headers = [
      'name',
      'slug',
      'org_type',
      'billing_email',
      'tier_slug',
      'member_count',
      'max_members',
      'expires_at',
      'lifecycle_status',
      'stripe_invoice_id',
      'created_at',
    ]
    const rows = targets.map((o) =>
      headers.map((h) => csvEscape((o as unknown as Record<string, unknown>)[h])).join(','),
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orgs-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const sendRenewalReminders = async () => {
    const targets = sortedOrgs.filter((o) => selected.has(o.id) && o.billing_email)
    if (targets.length === 0) {
      toast.error('Selected orgs have no billing email')
      return
    }
    setBulkBusy(true)
    let success = 0
    let failed = 0
    for (const org of targets) {
      try {
        await api.admin.sendLifecycleTemplate({
          template_name: 'license_expiring_soon',
          recipient_email: org.billing_email!,
          locale: 'en',
          vars: {
            display_name: org.name,
            org_name: org.name,
            expires_at: org.expires_at ? org.expires_at.slice(0, 10) : '',
          },
        })
        success++
      } catch {
        failed++
      }
    }
    setBulkBusy(false)
    if (success > 0) toast.success(t('renewalSent', { count: success }))
    if (failed > 0) toast.error(`${failed} sends failed`)
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder={t('search')}
          className="flex-1 min-w-[240px] bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value)
            setPage(1)
          }}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">{t('filterAllTypes')}</option>
          {ORG_TYPES.map((tt) => (
            <option key={tt} value={tt}>
              {tt}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">{t('filterAllStatus')}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </select>
        <select
          value={expiresWithin}
          onChange={(e) => {
            setExpiresWithin(e.target.value === '' ? '' : Number(e.target.value))
            setPage(1)
          }}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">{t('filterExpiresAny')}</option>
          {EXPIRES_OPTIONS.map((days) => (
            <option key={days} value={days}>
              {t('filterExpiresWithin', { days })}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2">
          <span className="text-sm text-orange-300">
            {t('selected', { count: selected.size })}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-3 py-1.5 rounded transition-colors"
            >
              {t('exportCsv')}
            </button>
            <button
              type="button"
              onClick={sendRenewalReminders}
              disabled={bulkBusy}
              className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded transition-colors disabled:opacity-50"
            >
              {bulkBusy ? '...' : t('sendRenewal')}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-3 py-2.5 w-8">
                <input
                  type="checkbox"
                  checked={sortedOrgs.length > 0 && selected.size === sortedOrgs.length}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              {(
                [
                  ['name', t('col.name')],
                  ['org_type', t('col.type')],
                  ['tier_slug', t('col.tier')],
                  ['member_count', t('col.members')],
                  ['expires_at', t('col.expires')],
                  ['lifecycle_status', t('col.status')],
                ] as Array<[SortKey, string]>
              ).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4 cursor-pointer select-none hover:text-zinc-200"
                >
                  {label}
                  {sortKey === key && (
                    <span className="ml-1 text-zinc-500">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-center py-2.5 px-4">
                {t('col.stripe')}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-zinc-500">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && sortedOrgs.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-zinc-500">
                  {t('noOrgs')}
                </td>
              </tr>
            )}
            {!loading &&
              sortedOrgs.map((org) => (
                <tr
                  key={org.id}
                  className={`border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors ${
                    selected.has(org.id) ? 'bg-zinc-800/30' : ''
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(org.id)}
                      onChange={() => toggleOne(org.id)}
                      aria-label={`Select ${org.name}`}
                    />
                  </td>
                  <td className="py-2.5 px-4">
                    <Link
                      href={`/platform/orgs/${org.id}`}
                      className="font-medium hover:text-orange-400 transition-colors"
                    >
                      {org.name}
                    </Link>
                    <p className="text-xs text-zinc-500">{org.slug}</p>
                    {org.billing_email && (
                      <p className="text-[10px] text-zinc-600">{org.billing_email}</p>
                    )}
                  </td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        TYPE_COLORS[org.org_type] || 'bg-zinc-700 text-zinc-400'
                      }`}
                    >
                      {org.org_type}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-zinc-300">
                    {org.tier_slug ?? <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="py-2.5 px-4 tabular-nums text-zinc-300">{formatMembers(org)}</td>
                  <td className="py-2.5 px-4 text-zinc-400 text-xs">
                    {org.expires_at ? formatDate(org.expires_at) : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        STATUS_COLORS[org.lifecycle_status] || 'bg-zinc-700 text-zinc-400'
                      }`}
                    >
                      {t(`status.${org.lifecycle_status}`)}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {org.stripe_invoice_id ? (
                      <span className="text-[10px] text-blue-400">●</span>
                    ) : (
                      <span className="text-zinc-700">—</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-3 items-center">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded-lg bg-zinc-800 text-sm disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="text-sm text-zinc-400">
            {t('page', { page, total: totalPages })}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded-lg bg-zinc-800 text-sm disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
