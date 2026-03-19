'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from '@/lib/toast'
import { api } from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AffiliateListItem {
  affiliate_code: string
  total_conversions: number
  total_commission_cents: number
  unpaid_commission_cents: number
}

interface QueueItem {
  conversion_id: string
  affiliate_code: string
  commission_amount_cents: number | null
  evaluation_ends_at: string | null
  created_at: string
}

interface PayoutItem {
  id: string
  affiliate_code: string
  amount_cents: number | null
  payout_method: string
  payout_reference: string | null
  status: string
  paid_at: string | null
  created_at: string
}

type SubTab = 'overview' | 'queue' | 'payouts'

function formatCents(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AffiliatesTab() {
  const t = useTranslations('admin')
  const [subTab, setSubTab] = useState<SubTab>('overview')
  const [queueCount, setQueueCount] = useState(0)

  useEffect(() => {
    api.admin.affiliateQueueCount()
      .then(r => setQueueCount(r.data.count))
      .catch(() => {})
  }, [subTab])

  const SUB_TABS: { key: SubTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'queue', label: `Approval Queue${queueCount > 0 ? ` (${queueCount})` : ''}` },
    { key: 'payouts', label: 'Payouts' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        {SUB_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              subTab === t.key
                ? 'border-blue-500 text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'overview' && <OverviewSubTab />}
      {subTab === 'queue' && <QueueSubTab onCountChange={setQueueCount} />}
      {subTab === 'payouts' && <PayoutsSubTab />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview Sub-Tab
// ---------------------------------------------------------------------------

function OverviewSubTab() {
  const [affiliates, setAffiliates] = useState<AffiliateListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.admin.affiliateList()
      .then(r => setAffiliates(r.data.affiliates))
      .catch(() => toast.error('Failed to load affiliates'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-muted-foreground text-sm">Loading...</p>

  const totalConversions = affiliates.reduce((s, a) => s + a.total_conversions, 0)
  const totalCommission = affiliates.reduce((s, a) => s + a.total_commission_cents, 0)
  const totalUnpaid = affiliates.reduce((s, a) => s + a.unpaid_commission_cents, 0)

  const cards = [
    { label: 'Active Affiliates', value: affiliates.length },
    { label: 'Total Conversions', value: totalConversions },
    { label: 'Total Commission', value: formatCents(totalCommission) },
    { label: 'Unpaid', value: formatCents(totalUnpaid) },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {affiliates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No affiliate conversions yet.</p>
      ) : (
        <div>
          <h3 className="text-sm font-medium mb-3">Leaderboard</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4 text-right">Conversions</th>
                  <th className="py-2 pr-4 text-right">Total Commission</th>
                  <th className="py-2 text-right">Unpaid</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.map((a, i) => (
                  <tr key={a.affiliate_code} className="border-b border-border/50">
                    <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{a.affiliate_code}</td>
                    <td className="py-2 pr-4 text-right">{a.total_conversions}</td>
                    <td className="py-2 pr-4 text-right">{formatCents(a.total_commission_cents)}</td>
                    <td className="py-2 text-right">
                      {a.unpaid_commission_cents > 0 ? (
                        <span className="text-amber-400">{formatCents(a.unpaid_commission_cents)}</span>
                      ) : (
                        <span className="text-muted-foreground">€0.00</span>
                      )}
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

// ---------------------------------------------------------------------------
// Approval Queue Sub-Tab
// ---------------------------------------------------------------------------

function QueueSubTab({ onCountChange }: { onCountChange: (count: number) => void }) {
  const t = useTranslations('admin')
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.admin.affiliateQueue()
      .then(r => {
        setQueue(r.data.queue)
        onCountChange(r.data.queue.length)
      })
      .catch(() => toast.error('Failed to load queue'))
      .finally(() => setLoading(false))
  }, [onCountChange])

  useEffect(() => { load() }, [load])

  const handleApprove = async (id: string) => {
    setProcessing(true)
    try {
      await api.admin.affiliateApprove(id)
      toast.success('Conversion approved')
      setConfirmAction(null)
      load()
    } catch {
      toast.error('Failed to approve')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async (id: string) => {
    setProcessing(true)
    try {
      await api.admin.affiliateReject(id, rejectReason)
      toast.success('Conversion rejected')
      setConfirmAction(null)
      setRejectReason('')
      load()
    } catch {
      toast.error('Failed to reject')
    } finally {
      setProcessing(false)
    }
  }

  const handleBulkApprove = async () => {
    if (queue.length === 0) return
    setProcessing(true)
    try {
      let approved = 0
      for (const item of queue) {
        await api.admin.affiliateApprove(item.conversion_id)
        approved++
      }
      toast.success(`Approved ${approved} conversion(s)`)
      load()
    } catch {
      toast.error('Bulk approve failed partway')
      load()
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading...</p>

  if (queue.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center">
        <p className="text-muted-foreground text-sm">No conversions awaiting approval.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{queue.length} conversion(s) ready for review</p>
        <button
          onClick={handleBulkApprove}
          disabled={processing}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          Approve All
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4">Code</th>
              <th className="py-2 pr-4 text-right">Commission</th>
              <th className="py-2 pr-4">Eval Ended</th>
              <th className="py-2 pr-4">Created</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {queue.map(item => (
              <tr key={item.conversion_id} className="border-b border-border/50">
                <td className="py-2 pr-4 font-mono text-xs">{item.affiliate_code}</td>
                <td className="py-2 pr-4 text-right">
                  {item.commission_amount_cents != null ? formatCents(item.commission_amount_cents) : '-'}
                </td>
                <td className="py-2 pr-4 text-muted-foreground text-xs">
                  {item.evaluation_ends_at ? formatDate(item.evaluation_ends_at) : '-'}
                </td>
                <td className="py-2 pr-4 text-muted-foreground text-xs">
                  {formatDate(item.created_at)}
                </td>
                <td className="py-2 text-right">
                  {confirmAction?.id === item.conversion_id ? (
                    <div className="flex items-center gap-2 justify-end">
                      {confirmAction.action === 'reject' && (
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder={t('rejectReasonPlaceholder')}
                          className="bg-card border border-border rounded px-2 py-1 text-xs w-32"
                        />
                      )}
                      <button
                        onClick={() => confirmAction.action === 'approve'
                          ? handleApprove(item.conversion_id)
                          : handleReject(item.conversion_id)
                        }
                        disabled={processing}
                        className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                          confirmAction.action === 'approve'
                            ? 'bg-green-600 hover:bg-green-500 text-white'
                            : 'bg-red-600 hover:bg-red-500 text-white'
                        } disabled:opacity-50`}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => { setConfirmAction(null); setRejectReason('') }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => setConfirmAction({ id: item.conversion_id, action: 'approve' })}
                        className="text-xs text-green-400 hover:text-green-300 font-medium"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setConfirmAction({ id: item.conversion_id, action: 'reject' })}
                        className="text-xs text-red-400 hover:text-red-300 font-medium"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Payouts Sub-Tab
// ---------------------------------------------------------------------------

function PayoutsSubTab() {
  const [payouts, setPayouts] = useState<PayoutItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [markPaidId, setMarkPaidId] = useState<string | null>(null)
  const [payoutRef, setPayoutRef] = useState('')
  const [processing, setProcessing] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.admin.affiliatePayouts()
      .then(r => setPayouts(r.data.payouts))
      .catch(() => toast.error('Failed to load payouts'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreatePayouts = async () => {
    setCreating(true)
    try {
      const res = await api.admin.affiliateCreatePayouts()
      const count = res.data.payouts.length
      if (count === 0) {
        toast.info('No affiliates meet the minimum payout threshold (€25)')
      } else {
        toast.success(`Created ${count} payout(s)`)
      }
      load()
    } catch {
      toast.error('Failed to create payouts')
    } finally {
      setCreating(false)
    }
  }

  const handleMarkPaid = async (id: string) => {
    if (!payoutRef.trim()) {
      toast.error('Please enter a payout reference (e.g. TX hash)')
      return
    }
    setProcessing(true)
    try {
      await api.admin.affiliateMarkPaid(id, payoutRef.trim())
      toast.success('Payout marked as paid')
      setMarkPaidId(null)
      setPayoutRef('')
      load()
    } catch {
      toast.error('Failed to mark paid')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{payouts.length} payout(s)</p>
        <button
          onClick={handleCreatePayouts}
          disabled={creating}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          {creating ? 'Creating...' : 'Create Payout Batch'}
        </button>
      </div>

      {payouts.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">No payouts yet. Approve conversions first, then create a batch.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4">Code</th>
                <th className="py-2 pr-4 text-right">Amount</th>
                <th className="py-2 pr-4">Method</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Reference</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map(p => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-xs">{p.affiliate_code}</td>
                  <td className="py-2 pr-4 text-right">
                    {p.amount_cents != null ? formatCents(p.amount_cents) : '-'}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground text-xs">{p.payout_method}</td>
                  <td className="py-2 pr-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.status === 'paid'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-muted-foreground truncate max-w-[120px]">
                    {p.payout_reference || '-'}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground text-xs">
                    {formatDate(p.created_at)}
                  </td>
                  <td className="py-2 text-right">
                    {p.status === 'pending' && (
                      markPaidId === p.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <input
                            type="text"
                            value={payoutRef}
                            onChange={e => setPayoutRef(e.target.value)}
                            placeholder="TX hash / ref"
                            className="bg-card border border-border rounded px-2 py-1 text-xs w-32"
                          />
                          <button
                            onClick={() => handleMarkPaid(p.id)}
                            disabled={processing}
                            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-medium px-2 py-1 rounded transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => { setMarkPaidId(null); setPayoutRef('') }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setMarkPaidId(p.id)}
                          className="text-xs text-green-400 hover:text-green-300 font-medium"
                        >
                          Mark Paid
                        </button>
                      )
                    )}
                    {p.status === 'paid' && p.paid_at && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(p.paid_at)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
