'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from '@/lib/toast'
import { api } from '@/lib/api'

interface Promotion {
  id: string
  code: string
  name: string
  discount_type: string
  discount_value: number
  currency: string
  duration: string
  duration_months: number | null
  applicable_tiers: string[] | null
  max_redemptions: number | null
  redemption_count: number
  starts_at: string | null
  expires_at: string | null
  is_active: boolean
  status: string
  stripe_coupon_id: string
  stripe_promo_code_id: string | null
  created_at: string
  created_by_email: string | null
}

interface Redemption {
  id: string
  user_id: string
  email: string | null
  display_name: string | null
  tier: string | null
  redeemed_at: string
}

interface CreateForm {
  code: string
  name: string
  discount_type: 'percent_off' | 'amount_off'
  discount_value: string
  currency: string
  duration: 'once' | 'repeating' | 'forever'
  duration_months: string
  applicable_tiers: string[]
  max_redemptions: string
  starts_at: string
  expires_at: string
}

const TIERS = ['focus', 'insight', 'clarity', 'horizon']
const TIER_PRICES: Record<string, number> = {
  focus: 9.99,
  insight: 24.99,
  clarity: 49.99,
  horizon: 99.99,
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-900/50 text-emerald-400',
  expiring_soon: 'bg-yellow-900/50 text-yellow-400',
  expired: 'bg-red-900/50 text-red-400',
  disabled: 'bg-zinc-800 text-zinc-500',
}

function formatDiscount(type: string, value: number, currency: string): string {
  return type === 'percent_off' ? `${value}% off` : `€${value.toFixed(2)} off`
}

function formatDuration(duration: string, months: number | null): string {
  if (duration === 'once') return 'One-time'
  if (duration === 'forever') return 'Forever'
  if (duration === 'repeating' && months) return `${months} months`
  return duration
}

const defaultForm: CreateForm = {
  code: '',
  name: '',
  discount_type: 'percent_off',
  discount_value: '',
  currency: 'eur',
  duration: 'repeating',
  duration_months: '12',
  applicable_tiers: ['focus', 'insight', 'clarity'],
  max_redemptions: '',
  starts_at: '',
  expires_at: '',
}

interface RevenueScenario {
  charged: number
  net: number
  net_pct: number
  floor_applied: boolean
}

interface RevenuePreviewTier {
  tier: string
  monthly: { list_cents: number; scenarios: Record<string, RevenueScenario> }
  yearly: { list_cents: number; scenarios: Record<string, RevenueScenario> }
}

interface RevenuePreview {
  tiers: RevenuePreviewTier[]
  warnings: string[]
}

export function PromotionsTab() {
  const t = useTranslations('admin')
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<CreateForm>({ ...defaultForm })
  const [selectedPromo, setSelectedPromo] = useState<string | null>(null)
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [redemptionLoading, setRedemptionLoading] = useState(false)
  const [revenuePreview, setRevenuePreview] = useState<RevenuePreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const fetchPromotions = useCallback(async () => {
    try {
      const res = await api.admin.promotions()
      setPromotions(res.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load promotions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPromotions() }, [fetchPromotions])

  const handleCreate = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.discount_value) {
      toast.error('Code, name, and discount value are required')
      return
    }
    setCreating(true)
    try {
      await api.admin.createPromotion({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        currency: form.currency,
        duration: form.duration,
        duration_months: form.duration === 'repeating' ? parseInt(form.duration_months) || undefined : undefined,
        applicable_tiers: form.applicable_tiers.length > 0 ? form.applicable_tiers : undefined,
        max_redemptions: form.max_redemptions ? parseInt(form.max_redemptions) : undefined,
        starts_at: form.starts_at || undefined,
        expires_at: form.expires_at || undefined,
      })
      toast.success('Promotion created')
      setShowCreate(false)
      setForm({ ...defaultForm })
      fetchPromotions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create promotion')
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (promo: Promotion) => {
    try {
      await api.admin.updatePromotion(promo.id, { is_active: !promo.is_active })
      toast.success(promo.is_active ? 'Promotion disabled' : 'Promotion enabled')
      fetchPromotions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  const handleViewRedemptions = async (promoId: string) => {
    if (selectedPromo === promoId) {
      setSelectedPromo(null)
      return
    }
    setSelectedPromo(promoId)
    setRedemptionLoading(true)
    try {
      const res = await api.admin.promotionRedemptions(promoId)
      setRedemptions(res.data.redemptions)
    } catch {
      setRedemptions([])
    } finally {
      setRedemptionLoading(false)
    }
  }

  // Price preview (simple client-side)
  const previewPrices = () => {
    const value = parseFloat(form.discount_value) || 0
    if (value <= 0) return null
    const tiers = form.applicable_tiers.length > 0 ? form.applicable_tiers : TIERS
    return tiers.map(t => {
      const original = TIER_PRICES[t] || 0
      const discounted = form.discount_type === 'percent_off'
        ? original * (1 - value / 100)
        : Math.max(0, original - value)
      return { tier: t, original, discounted: Math.round(discounted * 100) / 100 }
    })
  }

  // Revenue impact preview (server-side with gateway fees + affiliate)
  const fetchRevenuePreview = async (pct: number) => {
    if (pct <= 0 || pct > 100) {
      setRevenuePreview(null)
      return
    }
    setPreviewLoading(true)
    try {
      const res = await api.admin.promoPreview(pct)
      setRevenuePreview(res.data)
    } catch {
      setRevenuePreview(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  // Debounced revenue preview on discount value change
  useEffect(() => {
    if (form.discount_type !== 'percent_off' || !showCreate) return
    const value = parseFloat(form.discount_value) || 0
    if (value <= 0) { setRevenuePreview(null); return }
    const timer = setTimeout(() => fetchRevenuePreview(value), 500)
    return () => clearTimeout(timer)
  }, [form.discount_value, form.discount_type, showCreate])

  if (loading) {
    return <div className="p-6 text-center text-white/40">Loading promotions...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Promotions</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {showCreate ? 'Cancel' : '+ Create New'}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="border border-white/10 rounded-xl p-6 space-y-4 bg-white/[0.02]">
          <h3 className="font-medium">Create Promotion</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/50 block mb-1">Code</label>
              <input
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="BTCPRAGUE50"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">Name</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="BTC Prague 2026 Launch"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-white/50 block mb-1">Discount Type</label>
              <select
                value={form.discount_type}
                onChange={e => setForm({ ...form, discount_type: e.target.value as 'percent_off' | 'amount_off' })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="percent_off">Percentage</option>
                <option value="amount_off">Fixed Amount (€)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">
                Value {form.discount_type === 'percent_off' ? '(%)' : '(€)'}
              </label>
              <input
                type="number"
                value={form.discount_value}
                onChange={e => setForm({ ...form, discount_value: e.target.value })}
                placeholder={form.discount_type === 'percent_off' ? '50' : '10.00'}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">Duration</label>
              <select
                value={form.duration}
                onChange={e => setForm({ ...form, duration: e.target.value as 'once' | 'repeating' | 'forever' })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="once">One-time</option>
                <option value="repeating">Repeating (months)</option>
                <option value="forever">Forever</option>
              </select>
            </div>
          </div>

          {form.duration === 'repeating' && (
            <div className="max-w-[200px]">
              <label className="text-xs text-white/50 block mb-1">Duration (months)</label>
              <input
                type="number"
                value={form.duration_months}
                onChange={e => setForm({ ...form, duration_months: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-white/50 block mb-2">Applicable Tiers</label>
            <div className="flex flex-wrap gap-2">
              {TIERS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    const tiers = form.applicable_tiers.includes(t)
                      ? form.applicable_tiers.filter(x => x !== t)
                      : [...form.applicable_tiers, t]
                    setForm({ ...form, applicable_tiers: tiers })
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    form.applicable_tiers.includes(t)
                      ? 'bg-blue-600/30 border-blue-500/50 text-blue-400'
                      : 'bg-white/5 border-white/10 text-white/40'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-white/50 block mb-1">Max Redemptions</label>
              <input
                type="number"
                value={form.max_redemptions}
                onChange={e => setForm({ ...form, max_redemptions: e.target.value })}
                placeholder={t('unlimitedPlaceholder')}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">Start Date</label>
              <input
                type="date"
                value={form.starts_at}
                onChange={e => setForm({ ...form, starts_at: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">Expiry Date</label>
              <input
                type="date"
                value={form.expires_at}
                onChange={e => setForm({ ...form, expires_at: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Price Preview */}
          {previewPrices() && (
            <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
              <p className="text-xs text-white/50 mb-2">Price Preview</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {previewPrices()?.map(p => (
                  <div key={p.tier} className="text-sm">
                    <span className="text-white/60 capitalize">{p.tier}: </span>
                    <span className="text-white/30 line-through">€{p.original.toFixed(2)}</span>
                    {' '}
                    <span className="text-emerald-400 font-medium">€{p.discounted.toFixed(2)}</span>
                    <span className="text-white/30">/mo</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Revenue Impact Preview (server-side) */}
          {form.discount_type === 'percent_off' && revenuePreview && (
            <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02] space-y-3">
              <p className="text-xs text-white/50 font-medium">Revenue Impact Preview</p>
              {previewLoading ? (
                <p className="text-xs text-white/30">Calculating...</p>
              ) : (
                <>
                  {revenuePreview.warnings.length > 0 && (
                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                      {revenuePreview.warnings.map((w, i) => (
                        <p key={i} className="text-xs text-yellow-400">{w}</p>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    {revenuePreview.tiers.map(t => (
                      <div key={t.tier} className="grid grid-cols-5 gap-2 text-xs items-center">
                        <span className="text-white/60 capitalize font-medium">{t.tier}</span>
                        <span className="text-white/40">
                          Card: €{(t.monthly.scenarios.card_no_affiliate.net / 100).toFixed(2)} ({t.monthly.scenarios.card_no_affiliate.net_pct}%)
                        </span>
                        <span className="text-white/40">
                          Card+Aff: €{(t.monthly.scenarios.card_with_affiliate.net / 100).toFixed(2)} ({t.monthly.scenarios.card_with_affiliate.net_pct}%)
                        </span>
                        <span className="text-white/40">
                          BTC: €{(t.monthly.scenarios.btc_no_affiliate.net / 100).toFixed(2)} ({t.monthly.scenarios.btc_no_affiliate.net_pct}%)
                        </span>
                        <span className={`${t.monthly.scenarios.btc_with_affiliate.net_pct < 50 ? 'text-red-400' : 'text-white/40'}`}>
                          BTC+Aff: €{(t.monthly.scenarios.btc_with_affiliate.net / 100).toFixed(2)} ({t.monthly.scenarios.btc_with_affiliate.net_pct}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            {creating ? 'Creating in Stripe...' : 'Create in Stripe & Activate'}
          </button>
        </div>
      )}

      {/* Promotions List */}
      {promotions.length === 0 ? (
        <p className="text-white/40 text-sm text-center py-8">No promotions yet. Create your first one.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/50 text-left">
                <th className="pb-2 pr-4 font-medium">Code</th>
                <th className="pb-2 pr-4 font-medium">Discount</th>
                <th className="pb-2 pr-4 font-medium">Duration</th>
                <th className="pb-2 pr-4 font-medium">Used</th>
                <th className="pb-2 pr-4 font-medium">Expires</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map(p => (
                <Fragment key={p.id}>
                  <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-3 pr-4">
                      <span className="font-mono font-medium text-white">{p.code}</span>
                      <span className="block text-xs text-white/30 mt-0.5">{p.name}</span>
                    </td>
                    <td className="py-3 pr-4">{formatDiscount(p.discount_type, p.discount_value, p.currency)}</td>
                    <td className="py-3 pr-4">{formatDuration(p.duration, p.duration_months)}</td>
                    <td className="py-3 pr-4">
                      <button
                        onClick={() => handleViewRedemptions(p.id)}
                        className="hover:text-blue-400 transition-colors"
                      >
                        {p.redemption_count}/{p.max_redemptions ?? '∞'}
                      </button>
                    </td>
                    <td className="py-3 pr-4 text-white/50">
                      {p.expires_at ? new Date(p.expires_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] || STATUS_COLORS.active}`}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleToggle(p)}
                        className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                          p.is_active
                            ? 'text-red-400 hover:bg-red-900/30'
                            : 'text-emerald-400 hover:bg-emerald-900/30'
                        }`}
                      >
                        {p.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                  {selectedPromo === p.id && (
                    <tr>
                      <td colSpan={7} className="py-3 px-4 bg-white/[0.02]">
                        {redemptionLoading ? (
                          <p className="text-white/40 text-xs">Loading...</p>
                        ) : redemptions.length === 0 ? (
                          <p className="text-white/40 text-xs">No redemptions yet</p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-white/40">
                                <th className="text-left pb-1">User</th>
                                <th className="text-left pb-1">Tier</th>
                                <th className="text-left pb-1">Redeemed</th>
                              </tr>
                            </thead>
                            <tbody>
                              {redemptions.map(r => (
                                <tr key={r.id} className="text-white/60">
                                  <td className="py-1">{r.email || r.user_id}</td>
                                  <td className="py-1 capitalize">{r.tier || '-'}</td>
                                  <td className="py-1">{new Date(r.redeemed_at).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
