'use client'

// Sprint 040 #482 -- platform admin dormant accounts review.
//
// Lists users where lifecycle_status='dormant' (set by the dormant cron from
// #475) plus those already scheduled for manual deletion. Bulk actions:
//   - Send re-engagement email (uses #476 manual send flow)
//   - Schedule for deletion (sets pending_deletion -- does NOT auto-delete)
//   - Clear flag (back to active)
//
// design 022 §7.2 Screen 8 + §2.5 (12-month dormant policy).

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { formatDate } from '@/lib/date-format'

interface DormantUser {
  id: string
  email: string
  display_name: string | null
  tier: string
  lifecycle_status: 'active' | 'dormant' | 'pending_deletion'
  created_at: string
  last_active_at: string | null
  pending_deletion_at: string | null
  org_count: number
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-400/10 text-green-400',
  dormant: 'bg-amber-400/10 text-amber-400',
  pending_deletion: 'bg-red-400/10 text-red-400',
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

export default function DormantUsersPage() {
  const t = useTranslations('platform.dormantUsers')
  const [users, setUsers] = useState<DormantUser[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.admin.listDormantUsers()
      setUsers(res.data)
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const toggleAll = () => {
    if (selected.size === users.length) setSelected(new Set())
    else setSelected(new Set(users.map((u) => u.id)))
  }

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sendReengagement = async () => {
    const targets = users.filter((u) => selected.has(u.id))
    if (targets.length === 0) return
    setBusy(true)
    let success = 0
    for (const u of targets) {
      try {
        await api.admin.sendLifecycleTemplate({
          template_name: 'inactivity_warning',
          recipient_email: u.email,
          locale: 'en',
          vars: { display_name: u.display_name || u.email.split('@')[0] },
        })
        success++
      } catch {
        // count failures silently
      }
    }
    setBusy(false)
    toast.success(t('reengagementSent', { count: success }))
  }

  const scheduleForDeletion = async () => {
    const targets = users.filter((u) => selected.has(u.id))
    if (targets.length === 0) return
    setBusy(true)
    let success = 0
    for (const u of targets) {
      try {
        await api.admin.updateUserLifecycleStatus(u.id, 'pending_deletion')
        success++
      } catch {
        // ignore
      }
    }
    setBusy(false)
    toast.success(t('scheduledCount', { count: success }))
    setSelected(new Set())
    await fetchUsers()
  }

  const clearFlag = async () => {
    const targets = users.filter((u) => selected.has(u.id))
    if (targets.length === 0) return
    setBusy(true)
    let success = 0
    for (const u of targets) {
      try {
        await api.admin.updateUserLifecycleStatus(u.id, 'active')
        success++
      } catch {
        // ignore
      }
    }
    setBusy(false)
    toast.success(t('clearedCount', { count: success }))
    setSelected(new Set())
    await fetchUsers()
  }

  const now = new Date().toISOString()

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/platform/users" className="text-xs text-zinc-400 hover:text-zinc-200">
          ← All users
        </Link>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-zinc-500">{t('description')}</p>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2">
          <span className="text-sm text-amber-300">
            {t('selected', { count: selected.size })}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={sendReengagement}
              disabled={busy}
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded transition-colors disabled:opacity-50"
            >
              {t('sendReengagement')}
            </button>
            <button
              type="button"
              onClick={scheduleForDeletion}
              disabled={busy}
              className="text-xs bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded transition-colors disabled:opacity-50"
            >
              {t('scheduleDeletion')}
            </button>
            <button
              type="button"
              onClick={clearFlag}
              disabled={busy}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
            >
              {t('clearFlag')}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-3 py-2.5 w-8">
                <input
                  type="checkbox"
                  checked={users.length > 0 && selected.size === users.length}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4">
                {t('col.email')}
              </th>
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4">
                {t('col.tier')}
              </th>
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4">
                {t('col.lastActive')}
              </th>
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4">
                {t('col.accountAge')}
              </th>
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-right py-2.5 px-4">
                {t('col.orgs')}
              </th>
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4">
                {t('col.status')}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-zinc-500">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-zinc-500">
                  {t('noDormant')}
                </td>
              </tr>
            )}
            {!loading &&
              users.map((u) => (
                <tr
                  key={u.id}
                  className={`border-b border-zinc-800 hover:bg-zinc-800/40 ${
                    selected.has(u.id) ? 'bg-zinc-800/30' : ''
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={() => toggleOne(u.id)}
                      aria-label={`Select ${u.email}`}
                    />
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="font-medium">{u.email}</div>
                    {u.display_name && (
                      <div className="text-xs text-zinc-500">{u.display_name}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-zinc-300">{u.tier}</td>
                  <td className="py-2.5 px-4 text-zinc-400 text-xs">
                    {u.last_active_at ? formatDate(u.last_active_at) : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-zinc-400 text-xs tabular-nums">
                    {t('ageDays', { days: daysBetween(u.created_at, now) })}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums">{u.org_count}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        STATUS_COLORS[u.lifecycle_status]
                      }`}
                      title={
                        u.lifecycle_status === 'pending_deletion'
                          ? t('scheduledForDeletion')
                          : undefined
                      }
                    >
                      {u.lifecycle_status}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
