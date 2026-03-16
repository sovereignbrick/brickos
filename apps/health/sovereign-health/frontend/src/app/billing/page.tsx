'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { APP_CONFIG } from '@/lib/config'
import { IS_OSS } from '@/lib/mode'
import { toast } from '@/lib/toast'
import { useTranslations } from 'next-intl'

interface Subscription {
  tier_slug: string
  billing_interval: string
  status: string
  current_period_end: string
  cancel_at_period_end: boolean
  cancelled_at: string | null
  grace_period_end: string | null
}

interface BtcPayment {
  tier: string
  period_months: number
  amount_eur: number
  amount_sats: number | null
  paid_at: string | null
  prepaid_from: string | null
  prepaid_until: string | null
}

interface PaymentEvent {
  event_type: string
  amount_cents: number | null
  status: string
  created_at: string
}

interface Invoice {
  id: string
  date: string
  amount_cents: number | null
  currency: string
  tier: string | null
  status: string
  pdf_url: string | null
  hosted_url: string | null
  invoice_number: string | null
}

const TIER_ORDER = ['glimpse', 'core', 'focus', 'insight', 'clarity', 'horizon']

const TIER_PRICES: Record<string, { monthly: number; annual: number }> = {
  focus: { monthly: 999, annual: 9999 },
  insight: { monthly: 2499, annual: 24999 },
  clarity: { monthly: 4999, annual: 49999 },
}

function tierName(slug: string): string {
  const names: Record<string, string> = {
    glimpse: 'Glimpse', core: 'Core', focus: 'Focus',
    insight: 'Insight', clarity: 'Clarity', horizon: 'Horizon',
  }
  return names[slug] || slug
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatCents(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`
}

function BillingContent() {
  const searchParams = useSearchParams()
  const t = useTranslations('billing')
  const tCommon = useTranslations('common')
  const [loading, setLoading] = useState(true)
  const [stripeEnabled, setStripeEnabled] = useState(false)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [btcPayment, setBtcPayment] = useState<BtcPayment | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string>('stripe')
  const [cancelling, setCancelling] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [reactivating, setReactivating] = useState(false)
  const [showChangePlan, setShowChangePlan] = useState(false)
  const [changingPlan, setChangingPlan] = useState(false)
  const [changingInterval, setChangingInterval] = useState(false)
  const [payments, setPayments] = useState<PaymentEvent[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success(t('subscriptionActive'))
    }
  }, [searchParams, t])

  useEffect(() => {
    api.billing.status()
      .then(res => {
        setStripeEnabled(res.data.stripe_enabled)
        setSubscription(res.data.subscription)
        setBtcPayment(res.data.btc_payment || null)
        setPaymentMethod(res.data.payment_method || 'stripe')
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    api.billing.history()
      .then(res => setPayments(res.data.payments || []))
      .catch(() => {})

    api.invoices.list()
      .then(res => setInvoices(res.data.invoices || []))
      .catch(() => {})
  }, [])

  const handleCancel = async () => {
    setCancelling(true)
    try {
      const res = await api.billing.cancel(cancelReason || undefined)
      toast.success(res.data.message)
      setSubscription(prev => prev ? { ...prev, cancel_at_period_end: true } : null)
      setShowCancelModal(false)
      setCancelReason('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('actionFailed'))
    } finally {
      setCancelling(false)
    }
  }

  const handleReactivate = async () => {
    setReactivating(true)
    try {
      const res = await api.billing.reactivate()
      toast.success(res.data.message)
      setSubscription(prev => prev ? { ...prev, cancel_at_period_end: false, cancelled_at: null } : null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('actionFailed'))
    } finally {
      setReactivating(false)
    }
  }

  const handlePortal = async () => {
    try {
      const res = await api.billing.portal()
      window.location.href = res.data.portal_url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('actionFailed'))
    }
  }

  const handleChangePlan = async (newTier: string) => {
    if (!subscription) return
    setChangingPlan(true)
    try {
      const res = await api.billing.changePlan(newTier, subscription.billing_interval)
      toast.success(res.data.message)
      setShowChangePlan(false)
      // Refresh status
      const statusRes = await api.billing.status()
      setSubscription(statusRes.data.subscription)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('actionFailed'))
    } finally {
      setChangingPlan(false)
    }
  }

  const handleChangeInterval = async () => {
    if (!subscription) return
    setChangingInterval(true)
    const newInterval = subscription.billing_interval === 'annual' ? 'monthly' : 'annual'
    try {
      const res = await api.billing.changeInterval(newInterval)
      toast.success(res.data.message)
      const statusRes = await api.billing.status()
      setSubscription(statusRes.data.subscription)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('actionFailed'))
    } finally {
      setChangingInterval(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center text-muted-foreground">{tCommon('loading')}</div>
      </div>
    )
  }

  // BTC prepaid (no Stripe subscription)
  if (!subscription && btcPayment && paymentMethod === 'strike_btc') {
    const prepaidUntil = btcPayment.prepaid_until ? formatDate(btcPayment.prepaid_until) : 'Unknown'
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>
        <div className="rounded-xl border p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{tCommon('currentPlan')}</p>
              <p className="text-lg font-semibold">{tierName(btcPayment.tier)} ({btcPayment.period_months} months)</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('payment')}</p>
              <p className="text-lg font-semibold text-amber-400">&#9889; {t('btcPrepaid')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('paidUntil')}</p>
              <p className="font-medium">{prepaidUntil}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tCommon('amount')}</p>
              <p className="font-medium">
                &euro;{btcPayment.amount_eur.toFixed(2)}
                {btcPayment.amount_sats && (
                  <span className="text-muted-foreground text-sm ml-1">({btcPayment.amount_sats.toLocaleString()} sats)</span>
                )}
              </p>
            </div>
          </div>
          <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-3">
            <a
              href={`/billing/btc?tier=${btcPayment.tier}&period=${btcPayment.period_months}`}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-lg transition-colors"
            >
              {t('renewEarly')}
            </a>
            {stripeEnabled && (
              <a
                href={`/checkout?tier=${btcPayment.tier}&interval=monthly`}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm rounded-lg transition-colors"
              >
                {t('switchToCard')}
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  // No subscription (Glimpse user)
  if (!subscription) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>
        <div className="rounded-xl border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{tCommon('currentPlan')}</p>
              <p className="text-lg font-semibold">Glimpse ({tCommon('free')})</p>
            </div>
          </div>
          {stripeEnabled && (
            <div className="space-y-3 pt-2">
              <p className="text-sm text-muted-foreground">{tCommon('upgradePlan')}</p>
              {['focus', 'insight', 'clarity'].map(tier => {
                const prices = TIER_PRICES[tier]
                if (!prices) return null
                return (
                  <a
                    key={tier}
                    href={`/checkout?tier=${tier}&interval=monthly`}
                    className="flex items-center justify-between px-4 py-3 rounded-lg border border-zinc-700 hover:border-blue-500 transition-colors"
                  >
                    <span className="font-medium">{tierName(tier)}</span>
                    <span className="text-sm text-muted-foreground">{formatCents(prices.monthly)}/mo</span>
                  </a>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Has subscription
  const isAnnual = subscription.billing_interval === 'annual'
  const statusLabel = subscription.cancel_at_period_end
    ? t('cancellingOn', { date: formatDate(subscription.current_period_end) })
    : subscription.status === 'past_due'
      ? t('pastDue')
      : tCommon('active')

  const currentTierRank = TIER_ORDER.indexOf(subscription.tier_slug)
  const availableTiers = ['focus', 'insight', 'clarity'].filter(
    tier => tier !== subscription.tier_slug
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>

      <div className="rounded-xl border p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{tCommon('currentPlan')}</p>
            <p className="text-lg font-semibold">
              {tierName(subscription.tier_slug)} ({isAnnual ? tCommon('annual') : tCommon('monthly')})
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{tCommon('status')}</p>
            <p className={`text-lg font-semibold ${
              subscription.status === 'active' && !subscription.cancel_at_period_end
                ? 'text-green-400'
                : subscription.status === 'past_due'
                  ? 'text-yellow-400'
                  : 'text-zinc-400'
            }`}>
              {statusLabel}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{tCommon('nextBilling')}</p>
            <p className="font-medium">{formatDate(subscription.current_period_end)}</p>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-3">
          <button
            onClick={handlePortal}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm rounded-lg transition-colors"
          >
            {tCommon('managePayment')}
          </button>
          <button
            onClick={handlePortal}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm rounded-lg transition-colors"
          >
            {t('viewInvoices')}
          </button>
          <button
            onClick={() => setShowChangePlan(true)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm rounded-lg transition-colors"
          >
            {tCommon('changePlan')}
          </button>
          <button
            onClick={handleChangeInterval}
            disabled={changingInterval}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-sm rounded-lg transition-colors"
          >
            {changingInterval ? '...' : isAnnual ? t('switchToMonthly') : t('switchToYearly')}
          </button>
        </div>

        <div className="border-t border-zinc-800 pt-4">
          {subscription.cancel_at_period_end ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('endingOn', { date: formatDate(subscription.current_period_end) })}
              </p>
              <button
                onClick={handleReactivate}
                disabled={reactivating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {reactivating ? tCommon('reactivating') : t('reactivateSubscription')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCancelModal(true)}
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              {t('cancelSubscription')}
            </button>
          )}
        </div>
      </div>

      {/* Invoices & Payment History */}
      {(invoices.length > 0 || payments.length > 0) && (
        <div className="mt-8 rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">{t('invoicesTitle')}</h2>
          {invoices.length > 0 ? (
            <div className="space-y-3">
              {invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{formatDate(inv.date)}</span>
                  <span>{inv.tier ? tierName(inv.tier) : '-'}</span>
                  <span>{inv.amount_cents ? formatCents(inv.amount_cents) : '-'}</span>
                  <span className="text-green-400">{tCommon('paid')}</span>
                  {inv.pdf_url ? (
                    <a
                      href={inv.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                      title={tCommon('downloadInvoice')}
                    >
                      PDF
                    </a>
                  ) : (
                    <span className="text-zinc-600">-</span>
                  )}
                </div>
              ))}
            </div>
          ) : payments.length > 0 ? (
            <div className="space-y-3">
              {payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{formatDate(p.created_at)}</span>
                  <span>{p.amount_cents ? formatCents(p.amount_cents) : '-'}</span>
                  <span className={p.status === 'succeeded' || p.status === 'completed'
                    ? 'text-green-400' : 'text-red-400'}>
                    {p.status === 'succeeded' || p.status === 'completed' ? tCommon('paid') : tCommon('failed')}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* Change Plan Modal */}
      {showChangePlan && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-semibold">{tCommon('changePlanTitle')}</h2>
            <p className="text-sm text-muted-foreground">
              {tCommon('currentPlanLabel', {
                tier: tierName(subscription.tier_slug),
                price: TIER_PRICES[subscription.tier_slug]
                  ? formatCents(isAnnual
                    ? TIER_PRICES[subscription.tier_slug].annual
                    : TIER_PRICES[subscription.tier_slug].monthly)
                    + (isAnnual ? '/yr' : '/mo')
                  : ''
              })}
            </p>

            <div className="space-y-2">
              {availableTiers.map(tier => {
                const prices = TIER_PRICES[tier]
                const isUpgrade = TIER_ORDER.indexOf(tier) > currentTierRank
                const price = prices
                  ? formatCents(isAnnual ? prices.annual : prices.monthly) + (isAnnual ? '/yr' : '/mo')
                  : ''
                return (
                  <button
                    key={tier}
                    onClick={() => handleChangePlan(tier)}
                    disabled={changingPlan}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-zinc-700 hover:border-zinc-500 disabled:opacity-50 transition-colors"
                  >
                    <span className="font-medium">{tierName(tier)}</span>
                    <span className="text-sm text-muted-foreground">{price}</span>
                  </button>
                )
              })}
              <button
                disabled
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-zinc-700 opacity-60"
              >
                <span className="font-medium">Horizon</span>
                <span className="text-sm text-muted-foreground">{tCommon('contactForPlan')}</span>
              </button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>{t('upgradeNote')}</p>
              <p>{t('downgradeNote')}</p>
            </div>

            <button
              onClick={() => setShowChangePlan(false)}
              className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm rounded-lg transition-colors"
            >
              {tCommon('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-semibold">{t('cancelConfirmTitle')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('cancelConfirmText', {
                tier: tierName(subscription.tier_slug),
                date: formatDate(subscription.current_period_end),
              })}
            </p>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">{tCommon('cancelReason')}</label>
              <select
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">-</option>
                <option value="too_expensive">{tCommon('reasonTooExpensive')}</option>
                <option value="not_using">{t('reasonNotUsing')}</option>
                <option value="switching">{tCommon('reasonSwitching')}</option>
                <option value="missing_features">{tCommon('reasonMissingFeatures')}</option>
                <option value="other">{tCommon('reasonOther')}</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowCancelModal(false); setCancelReason('') }}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm rounded-lg transition-colors"
              >
                {tCommon('keepPlan')}
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {cancelling ? tCommon('cancelling') : t('cancelSubscription')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BillingPage() {
  const t = useTranslations('billing')

  if (IS_OSS) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
        <p className="text-muted-foreground">{t('selfHosted')}</p>
      </div>
    )
  }

  return (
    <Suspense>
      <BillingContent />
    </Suspense>
  )
}
