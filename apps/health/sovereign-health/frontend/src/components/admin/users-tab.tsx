'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from '@/lib/toast'
import { api } from '@/lib/api'
import { AdminUser } from '@/lib/types'

const TIERS = ['core', 'glimpse', 'focus', 'insight', 'clarity', 'horizon']
const TIER_COLORS: Record<string, string> = {
  core: 'bg-zinc-600',
  glimpse: 'bg-zinc-500',
  focus: 'bg-blue-600',
  insight: 'bg-purple-600',
  clarity: 'bg-amber-600',
  horizon: 'bg-emerald-600',
}

export function UsersTab() {
  const t = useTranslations('admin')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.admin.listUsers({ page, per_page: 25, search: search || undefined })
      setUsers(res.data)
      setTotal(res.meta.total)
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder={t('searchByEmailPlaceholder')}
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
        />
        <span className="text-xs text-white/40">{total} users</span>
      </div>

      {/* User table */}
      <div className="border border-white/10 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="text-left px-4 py-2 text-white/40 font-medium">Email</th>
              <th className="text-left px-4 py-2 text-white/40 font-medium">Tier</th>
              <th className="text-left px-4 py-2 text-white/40 font-medium">Pay</th>
              <th className="text-left px-4 py-2 text-white/40 font-medium">Override</th>
              <th className="text-left px-4 py-2 text-white/40 font-medium">Joined</th>
              <th className="text-right px-4 py-2 text-white/40 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <Fragment key={user.id}>
                <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5">
                    <div className="text-white text-sm">{user.email}</div>
                    {user.display_name && <div className="text-white/40 text-xs">{user.display_name}</div>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium text-white ${TIER_COLORS[user.tier] || 'bg-zinc-600'}`}>
                      {user.tier}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {user.payment_method === 'strike_btc' ? (
                      <span className="text-amber-400 text-xs font-medium">BTC</span>
                    ) : (
                      <span className="text-white/40 text-xs">Card</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {user.admin_override ? (
                      <span className="text-amber-400 text-xs font-medium">Override</span>
                    ) : (
                      <span className="text-white/20 text-xs">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-white/40 text-xs">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {expandedUserId === user.id ? 'Close' : 'Manage'}
                    </button>
                  </td>
                </tr>
                {expandedUserId === user.id && (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 bg-white/[0.02]">
                      <LicenseManager
                        user={user}
                        onUpdate={() => fetchUsers()}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 25 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-xs text-white/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-xs text-white/40">Page {page} of {Math.ceil(total / 25)}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page * 25 >= total}
            className="text-xs text-white/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

function LicenseManager({ user, onUpdate }: { user: AdminUser; onUpdate: () => void }) {
  const [selectedTier, setSelectedTier] = useState(user.tier)
  const [note, setNote] = useState(user.admin_override_note || '')
  const [loading, setLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'apply' | 'remove' | null>(null)
  const [showRefund, setShowRefund] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [refundForce, setRefundForce] = useState(false)
  const [refunding, setRefunding] = useState(false)

  const handleApplyOverride = async () => {
    setLoading(true)
    try {
      await api.admin.updateUserLicense(user.id, {
        tier: selectedTier,
        override_active: true,
        note: note || undefined,
      })
      toast.success(`${user.email} set to ${selectedTier}`)
      setConfirmAction(null)
      onUpdate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update license')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveOverride = async () => {
    setLoading(true)
    try {
      await api.admin.updateUserLicense(user.id, {
        override_active: false,
      })
      toast.success(`Override removed for ${user.email}`)
      setConfirmAction(null)
      onUpdate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove override')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      {/* Current status */}
      <div className="text-xs space-y-1">
        <div className="text-white/60">
          Current tier: <span className={`inline-block px-1.5 py-0.5 rounded text-white ${TIER_COLORS[user.tier] || 'bg-zinc-600'}`}>{user.tier}</span>
        </div>
        {user.admin_override && (
          <>
            <div className="text-amber-400">Status: Admin Override</div>
            {user.admin_override_at && (
              <div className="text-white/40">
                Set at {new Date(user.admin_override_at).toLocaleString()}
              </div>
            )}
            {user.admin_override_note && (
              <div className="text-white/40">Reason: &quot;{user.admin_override_note}&quot;</div>
            )}
          </>
        )}
      </div>

      {/* Tier selection */}
      <div>
        <div className="text-xs text-white/40 mb-2">Assign tier:</div>
        <div className="flex flex-wrap gap-1.5">
          {TIERS.map(tier => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                selectedTier === tier
                  ? `${TIER_COLORS[tier]} text-white ring-2 ring-white/30`
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Note field */}
      <div>
        <div className="text-xs text-white/40 mb-1">Reason (optional):</div>
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g., VIP demo access"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {confirmAction === 'apply' ? (
          <div className="flex items-center gap-2 bg-amber-900/30 border border-amber-500/30 rounded-lg px-3 py-2">
            <span className="text-xs text-amber-300">Set {user.email} to {selectedTier}? This overrides Stripe.</span>
            <button onClick={handleApplyOverride} disabled={loading} className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 rounded transition-colors disabled:opacity-50">
              {loading ? '...' : 'Confirm'}
            </button>
            <button onClick={() => setConfirmAction(null)} className="text-xs text-white/40 hover:text-white/60">Cancel</button>
          </div>
        ) : confirmAction === 'remove' ? (
          <div className="flex items-center gap-2 bg-red-900/30 border border-red-500/30 rounded-lg px-3 py-2">
            <span className="text-xs text-red-300">Revert to Stripe-based tier?</span>
            <button onClick={handleRemoveOverride} disabled={loading} className="text-xs bg-red-600 hover:bg-red-500 text-white px-2.5 py-1 rounded transition-colors disabled:opacity-50">
              {loading ? '...' : 'Confirm'}
            </button>
            <button onClick={() => setConfirmAction(null)} className="text-xs text-white/40 hover:text-white/60">Cancel</button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setConfirmAction('apply')}
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              Apply Override
            </button>
            {user.admin_override && (
              <button
                onClick={() => setConfirmAction('remove')}
                className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 transition-colors"
              >
                Remove Override
              </button>
            )}
          </>
        )}
      </div>

      {/* Refund Section */}
      {user.tier !== 'core' && user.tier !== 'glimpse' && !user.admin_override && (
        <div className="border-t border-white/10 pt-4 mt-4">
          {!showRefund ? (
            <button
              onClick={() => setShowRefund(true)}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Refund Subscription
            </button>
          ) : (
            <div className="space-y-3 bg-red-900/20 border border-red-500/20 rounded-lg p-3">
              <div className="text-xs text-red-300 font-medium">Refund Subscription</div>
              <p className="text-[11px] text-white/50">
                This will issue a Stripe refund, cancel the subscription, revert to free plan, and mark any affiliate commission as refunded.
              </p>
              <div>
                <div className="text-xs text-white/40 mb-1">Reason:</div>
                <input
                  type="text"
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  placeholder="e.g., User requested within 30-day policy"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-white/50">
                <input
                  type="checkbox"
                  checked={refundForce}
                  onChange={e => setRefundForce(e.target.checked)}
                  className="rounded"
                />
                Force refund (override 30-day policy)
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setRefunding(true)
                    try {
                      const res = await api.admin.refundSubscription(user.id, {
                        reason: refundReason || undefined,
                        full_refund: true,
                        force: refundForce,
                      })
                      toast.success(`Refunded ${(res.data.amount_refunded_cents / 100).toFixed(2)} EUR`)
                      setShowRefund(false)
                      onUpdate()
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Refund failed')
                    } finally {
                      setRefunding(false)
                    }
                  }}
                  disabled={refunding}
                  className="text-xs bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  {refunding ? 'Processing...' : 'Confirm Refund'}
                </button>
                <button
                  onClick={() => { setShowRefund(false); setRefundReason(''); setRefundForce(false) }}
                  className="text-xs text-white/40 hover:text-white/60"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Warning */}
      <div className="text-[10px] text-white/30 leading-relaxed">
        Override bypasses Stripe/BTC subscriptions. Payment webhooks will not change this user&apos;s tier until the override is removed.
      </div>
    </div>
  )
}
