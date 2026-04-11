'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/lib/toast'
import { api } from '@/lib/api'
import { usePlatformFilter } from '@/app/platform/platform-context'

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
  const { appFilter } = usePlatformFilter()
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [meta, setMeta] = useState<SubscriberMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [syncing, setSyncing] = useState(false)
  const [exporting, setExporting] = useState(false)

  const fetchSubscribers = useCallback(async (p: number) => {
    try {
      const res = await api.admin.newsletterSubscribers(p, 50, appFilter)
      setSubscribers(res.data.subscribers)
      setMeta(res.data.meta)
    } catch {
      toast.error('Failed to load subscribers')
    } finally {
      setLoading(false)
    }
  }, [appFilter])

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

  if (loading) return <p className="text-muted-foreground text-sm">Loading...</p>

  const totalPages = meta ? Math.ceil(meta.total / meta.per_page) : 1

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold mt-1">{meta?.total ?? 0}</p>
        </div>
        <div className="border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Confirmed</p>
          <p className="text-2xl font-bold mt-1 text-green-400">{meta?.subscribed ?? 0}</p>
        </div>
        <div className="border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold mt-1 text-yellow-400">{meta?.pending ?? 0}</p>
        </div>
        <div className="border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Unsubscribed</p>
          <p className="text-2xl font-bold mt-1 text-red-400">{meta?.unsubscribed ?? 0}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="text-sm bg-muted border border-border rounded-lg px-4 py-2 hover:bg-accent transition-colors disabled:opacity-50"
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
        <div
          className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-blue-200 space-y-1"
          data-testid="newsletter-empty-banner"
        >
          <p className="font-semibold">No newsletter subscribers in this database</p>
          <p className="text-blue-300/80">
            This is expected on a freshly cold-booted dev DB -- no one signed up locally.
            On staging and production this table aggregates every email captured by the
            sign-up forms across all SHI surfaces (homepage, app, embedded widgets).
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-left">
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 pr-4 font-medium">Source</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Mailgun</th>
                <th className="pb-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map(s => (
                <tr key={s.id} className="border-b border-border/50 hover:bg-accent">
                  <td className="py-2.5 pr-4 font-mono text-xs">{s.email}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{s.source}</td>
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
                      <span className="text-muted-foreground/60 text-xs">-</span>
                    )}
                  </td>
                  <td className="py-2.5 text-muted-foreground text-xs">
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
            className="text-sm px-3 py-1 rounded border border-border disabled:opacity-30 hover:bg-muted transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="text-sm px-3 py-1 rounded border border-border disabled:opacity-30 hover:bg-muted transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
