'use client'

// Sprint 040 #483 -- Revocation list screen.
//
// Lists all revoked org licenses with a Restore action that clears
// org_licenses.revoked_at + removes the row from org_licenses_revoked.
// design 022 §7.2 Screen 7.

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { formatDate } from '@/lib/date-format'

interface Revocation {
  jti: string
  org_id: string
  org_name: string | null
  org_slug: string | null
  revoked_at: string
  reason: string | null
  original_exp: string
  revoked_by_email: string | null
}

export default function RevocationsPage() {
  const t = useTranslations('platform.licensingScreens.revocations')
  const [rows, setRows] = useState<Revocation[]>([])
  const [loading, setLoading] = useState(true)
  const [restoringJti, setRestoringJti] = useState<string | null>(null)

  const fetchRevocations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.admin.listRevocations()
      setRows(res.data)
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRevocations()
  }, [fetchRevocations])

  const handleRestore = async (jti: string) => {
    if (!confirm(t('restoreConfirm'))) return
    setRestoringJti(jti)
    try {
      await api.admin.restoreRevokedLicense(jti)
      toast.success(t('restored'))
      await fetchRevocations()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Restore failed')
    } finally {
      setRestoringJti(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/platform/licensing" className="text-xs text-zinc-400 hover:text-zinc-200">
          ← Tier configuration
        </Link>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-zinc-500">{t('description')}</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4">
                {t('col.org')}
              </th>
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4">
                {t('col.jti')}
              </th>
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4">
                {t('col.revokedAt')}
              </th>
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4">
                {t('col.reason')}
              </th>
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2.5 px-4">
                {t('col.revokedBy')}
              </th>
              <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-right py-2.5 px-4">
                {t('col.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-zinc-500">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-zinc-500">
                  {t('noRows')}
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r) => (
                <tr key={r.jti} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                  <td className="py-2.5 px-4">
                    {r.org_id ? (
                      <Link
                        href={`/platform/orgs/${r.org_id}`}
                        className="font-medium hover:text-orange-400 transition-colors"
                      >
                        {r.org_name ?? r.org_slug ?? r.org_id}
                      </Link>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[10px] text-zinc-500">
                    {r.jti.slice(0, 8)}...
                  </td>
                  <td className="py-2.5 px-4 text-zinc-400 text-xs">
                    {formatDate(r.revoked_at)}
                  </td>
                  <td className="py-2.5 px-4 text-xs text-zinc-300">{r.reason ?? '—'}</td>
                  <td className="py-2.5 px-4 text-xs text-zinc-400">
                    {r.revoked_by_email ?? '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleRestore(r.jti)}
                      disabled={restoringJti === r.jti}
                      className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-50"
                    >
                      {restoringJti === r.jti ? '...' : t('restore')}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
