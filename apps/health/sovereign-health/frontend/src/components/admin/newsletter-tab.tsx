'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/lib/toast'
import { api } from '@/lib/api'

interface Subscriber {
  id: string
  email: string
  source: string
  subscribed: boolean
  confirmed: boolean
  confirmed_at: string | null
  unsubscribed_at: string | null
  mailgun_synced: boolean
  created_at: string
}

interface SubscriberMeta {
  total: number
  subscribed: number
  unsubscribed: number
  pending: number
  page: number
  per_page: number
}

export function NewsletterTab() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [meta, setMeta] = useState<SubscriberMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [syncing, setSyncing] = useState(false)
  const [exporting, setExporting] = useState(false)

  const fetchSubscribers = useCallback(async (p: number) => {
    try {
      const res = await api.admin.newsletterSubscribers(p)
      setSubscribers(res.data.subscribers)
      setMeta(res.data.meta)
    } catch {
      toast.error('Failed to load subscribers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSubscribers(page) }, [page, fetchSubscribers])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await api.admin.newsletterSync()
      toast.success(res.data.message)
      fetchSubscribers(page)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await api.admin.newsletterExport()
      const blob = new Blob([res], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'newsletter-subscribers.csv'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exported')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <p className="text-white/40 text-sm">Loading...</p>

  const totalPages = meta ? Math.ceil(meta.total / meta.per_page) : 1

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="border border-white/10 rounded-lg p-4">
          <p className="text-xs text-white/40">Total</p>
          <p className="text-2xl font-bold mt-1">{meta?.total ?? 0}</p>
        </div>
        <div className="border border-white/10 rounded-lg p-4">
          <p className="text-xs text-white/40">Confirmed</p>
          <p className="text-2xl font-bold mt-1 text-green-400">{meta?.subscribed ?? 0}</p>
        </div>
        <div className="border border-white/10 rounded-lg p-4">
          <p className="text-xs text-white/40">Pending</p>
          <p className="text-2xl font-bold mt-1 text-yellow-400">{meta?.pending ?? 0}</p>
        </div>
        <div className="border border-white/10 rounded-lg p-4">
          <p className="text-xs text-white/40">Unsubscribed</p>
          <p className="text-2xl font-bold mt-1 text-red-400">{meta?.unsubscribed ?? 0}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="text-sm bg-white/5 border border-white/10 rounded-lg px-4 py-2 hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="text-sm bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg px-4 py-2 hover:bg-blue-600/30 transition-colors disabled:opacity-50"
        >
          {syncing ? 'Syncing...' : 'Sync to Mailgun'}
        </button>
      </div>

      {/* Table */}
      {subscribers.length === 0 ? (
        <p className="text-white/40 text-sm text-center py-8">No subscribers yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/50 text-left">
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 pr-4 font-medium">Source</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Mailgun</th>
                <th className="pb-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map(s => (
                <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-2.5 pr-4 font-mono text-xs">{s.email}</td>
                  <td className="py-2.5 pr-4 text-white/50">{s.source}</td>
                  <td className="py-2.5 pr-4">
                    {!s.subscribed ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-900/50 text-red-400">Unsubscribed</span>
                    ) : s.confirmed ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400">Confirmed</span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-400">Pending</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    {s.mailgun_synced ? (
                      <span className="text-green-400 text-xs">Synced</span>
                    ) : (
                      <span className="text-white/30 text-xs">-</span>
                    )}
                  </td>
                  <td className="py-2.5 text-white/50 text-xs">
                    {new Date(s.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-sm px-3 py-1 rounded border border-white/10 disabled:opacity-30 hover:bg-white/5 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-white/50">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="text-sm px-3 py-1 rounded border border-white/10 disabled:opacity-30 hover:bg-white/5 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
