'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useContent } from '@/lib/content-context'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { APP_CONFIG } from '@/lib/config'
import { toast } from '@/lib/toast'
import { IS_OSS } from '@/lib/mode'
import { InfoTooltip } from '@/components/info-tooltip'
import { COUNTRIES as BILINGUAL_COUNTRIES } from '@/lib/countries'

/* ================================================================
   License Tab (Task 8) - merged with billing features (B-0063)
   ================================================================ */

const LICENSE_TIER_ORDER = ['glimpse', 'core', 'focus', 'insight', 'clarity', 'horizon']

const LICENSE_TIER_PRICES: Record<string, { monthly: number; annual: number }> = {
  focus: { monthly: 999, annual: 9999 },
  insight: { monthly: 2499, annual: 24999 },
  clarity: { monthly: 4999, annual: 49999 },
}

function formatLicenseCents(cents: number): string {
  return `\u20AC${(cents / 100).toFixed(2)}`
}

interface LicenseInvoice {
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

interface StripePaymentMethod {
  brand: string
  last4: string
  exp_month: number
  exp_year: number
}

interface StripeInvoice {
  id: string
  number: string
  amount_paid: number
  currency: string
  status: string
  created: number
  invoice_pdf: string
  hosted_invoice_url: string
}

function BillingAddressSection() {
  const t = useTranslations('settings.license')
  const tCommon = useTranslations('common')
  const { user } = useAuth()
  const { locale } = useContent()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    customer_type: 'private',
    company_name: '',
    vat_id: '',
    billing_address_line1: '',
    billing_address_line2: '',
    billing_address_city: '',
    billing_address_postal_code: '',
    billing_address_state: '',
    billing_address_country: '',
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loaded) return
    api.settings.get().then(res => {
      const p = res.data?.profile
      if (p) {
        setForm({
          customer_type: p.customer_type || 'private',
          company_name: p.company_name || '',
          vat_id: p.vat_id || '',
          billing_address_line1: p.billing_address_line1 || '',
          billing_address_line2: p.billing_address_line2 || '',
          billing_address_city: p.billing_address_city || '',
          billing_address_postal_code: p.billing_address_postal_code || '',
          billing_address_state: p.billing_address_state || '',
          billing_address_country: p.billing_address_country || '',
        })
      }
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [loaded])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.settings.updateProfile(form)
      toast.success(t('billingAddressSaved'))
    } catch {
      toast.error(t('actionFailed'))
    } finally {
      setSaving(false)
    }
  }

  const countryLang = (locale === 'de' ? 'de' : 'en') as 'en' | 'de'

  const inp = 'w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <div className="border border-border rounded-lg p-6 space-y-4">
      <div>
        <h3 className="font-medium">{t('billingAddressTitle')}</h3>
        <p className="text-xs text-muted-foreground mt-1">{t('billingAddressDesc')}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-4">
          <div>
            <label htmlFor="settings-customer-type" className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              {t('customerType')}
              <InfoTooltip>{t('customerTypeInfo')}</InfoTooltip>
            </label>
            <select id="settings-customer-type" value={form.customer_type} onChange={e => setForm({ ...form, customer_type: e.target.value })} className={inp}>
              <option value="private">{t('customerPrivate')}</option>
              <option value="organization">{t('customerOrganization')}</option>
            </select>
          </div>
          {form.customer_type === 'organization' && (
            <>
              <div>
                <label htmlFor="settings-company-name" className="text-xs text-muted-foreground block mb-1">{t('companyName')}</label>
                <input id="settings-company-name" type="text" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} className={inp} />
              </div>
              <div>
                <label htmlFor="settings-vat-id" className="text-xs text-muted-foreground block mb-1">{t('vatId')}</label>
                <input id="settings-vat-id" type="text" value={form.vat_id} onChange={e => setForm({ ...form, vat_id: e.target.value })} className={inp} placeholder="DE123456789" />
              </div>
            </>
          )}
          <div>
            <label htmlFor="settings-address-line1" className="text-xs text-muted-foreground block mb-1">{t('addressLine1')}</label>
            <input id="settings-address-line1" type="text" value={form.billing_address_line1} onChange={e => setForm({ ...form, billing_address_line1: e.target.value })} className={inp} />
          </div>
          <div>
            <label htmlFor="settings-address-line2" className="text-xs text-muted-foreground block mb-1">{t('addressLine2')}</label>
            <input id="settings-address-line2" type="text" value={form.billing_address_line2} onChange={e => setForm({ ...form, billing_address_line2: e.target.value })} className={inp} />
          </div>
        </div>
        {/* Right column */}
        <div className="space-y-4">
          <div>
            <label htmlFor="settings-billing-city" className="text-xs text-muted-foreground block mb-1">{t('city')}</label>
            <input id="settings-billing-city" type="text" value={form.billing_address_city} onChange={e => setForm({ ...form, billing_address_city: e.target.value })} className={inp} />
          </div>
          <div>
            <label htmlFor="settings-billing-postal-code" className="text-xs text-muted-foreground block mb-1">{t('postalCode')}</label>
            <input id="settings-billing-postal-code" type="text" value={form.billing_address_postal_code} onChange={e => setForm({ ...form, billing_address_postal_code: e.target.value })} className={inp} />
          </div>
          <div>
            <label htmlFor="settings-billing-state" className="text-xs text-muted-foreground block mb-1">{t('state')}</label>
            <input id="settings-billing-state" type="text" value={form.billing_address_state} onChange={e => setForm({ ...form, billing_address_state: e.target.value })} className={inp} />
          </div>
          <div>
            <label htmlFor="settings-billing-country" className="text-xs text-muted-foreground block mb-1">{t('billingCountry')}</label>
            <select id="settings-billing-country" value={form.billing_address_country} onChange={e => setForm({ ...form, billing_address_country: e.target.value })} className={inp}>
              <option value="">-</option>
              {BILINGUAL_COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name[countryLang]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? '...' : t('saveBillingAddress')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LicenseTab() {
  const t = useTranslations('settings.license')
  const tCommon = useTranslations('common')
  const { user, isDemo, refreshUser } = useAuth()
  const [tierInfo, setTierInfo] = useState<{ slug: string; name: string } | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [paymentCanceled, setPaymentCanceled] = useState(false)
  const [cardInfo, setCardInfo] = useState<StripePaymentMethod | null>(null)
  const [stripeInvoices, setStripeInvoices] = useState<StripeInvoice[]>([])
  const [billingLoading, setBillingLoading] = useState(true)

  const tierNames: Record<string, string> = {
    glimpse: 'Glimpse', core: 'Core', focus: 'Focus',
    insight: 'Insight', clarity: 'Clarity', horizon: 'Horizon',
  }

  const [subscription, setSubscription] = useState<{
    tier_slug: string; billing_interval: string; status: string;
    current_period_end: string; cancel_at_period_end: boolean;
  } | null>(null)
  const [stripeEnabled, setStripeEnabled] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [changingInterval, setChangingInterval] = useState(false)
  const [showChangePlan, setShowChangePlan] = useState(false)
  const [changingPlan, setChangingPlan] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [invoices, setInvoices] = useState<LicenseInvoice[]>([])
  const [portalLoading, setPortalLoading] = useState(false)
  const billingCacheRef = useRef<{ ts: number } | null>(null)

  const applySyncResult = (data: {
    synced: boolean; tier_slug?: string; billing_interval?: string;
    status?: string; current_period_end?: string; cancel_at_period_end?: boolean;
    payment_method?: StripePaymentMethod | null;
    invoices?: StripeInvoice[];
  }) => {
    if (data.synced && data.tier_slug) {
      const n = tierNames[data.tier_slug] || data.tier_slug
      setTierInfo({ slug: data.tier_slug, name: n })
      refreshUser() // update auth context so navbar badge reflects new tier
      if (data.tier_slug && data.billing_interval && data.status && data.current_period_end) {
        setSubscription({
          tier_slug: data.tier_slug,
          billing_interval: data.billing_interval,
          status: data.status,
          current_period_end: data.current_period_end,
          cancel_at_period_end: data.cancel_at_period_end || false,
        })
      }
    }
    if (data.payment_method) setCardInfo(data.payment_method)
    if (data.invoices) setStripeInvoices(data.invoices)
  }

  // Handle payment success/canceled URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paymentParam = params.get('payment')
    if (paymentParam === 'success' || paymentParam === 'canceled') {
      if (paymentParam === 'success') setPaymentSuccess(true)
      if (paymentParam === 'canceled') setPaymentCanceled(true)
      params.delete('payment')
      const qs = params.toString()
      const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}`
      window.history.replaceState({}, '', newUrl)
      if (paymentParam === 'success') {
        const timer = setTimeout(() => {
          Promise.all([
            api.billing.sync().catch(() => null),
            api.billing.status().catch(() => null),
          ]).then(([syncRes, statusRes]) => {
            if (syncRes?.data) applySyncResult(syncRes.data)
            if (statusRes?.data) {
              setStripeEnabled(statusRes.data.stripe_enabled)
              setSubscription(statusRes.data.subscription)
              if (statusRes.data.subscription?.tier_slug) {
                const n = tierNames[statusRes.data.subscription.tier_slug] || statusRes.data.subscription.tier_slug
                setTierInfo({ slug: statusRes.data.subscription.tier_slug, name: n })
              }
            }
            billingCacheRef.current = { ts: Date.now() }
            setBillingLoading(false)
          })
        }, 2000)
        return () => clearTimeout(timer)
      }
    }
  }, [])

  // Load billing data in parallel (with 60s cache)
  useEffect(() => {
    if (IS_OSS) { setBillingLoading(false); return }
    if (billingCacheRef.current && Date.now() - billingCacheRef.current.ts < 60000) {
      setBillingLoading(false)
      return
    }

    Promise.all([
      api.billing.status().catch(() => null),
      api.billing.sync().catch(() => null),
      api.invoices.list().catch(() => null),
    ]).then(([statusRes, syncRes, invoicesRes]) => {
      if (statusRes?.data) {
        setStripeEnabled(statusRes.data.stripe_enabled)
        setSubscription(statusRes.data.subscription)
      }
      if (syncRes?.data) applySyncResult(syncRes.data)
      if (invoicesRes?.data?.invoices) setInvoices(invoicesRes.data.invoices)
      billingCacheRef.current = { ts: Date.now() }
    }).finally(() => setBillingLoading(false))
  }, [])

  const tierColors: Record<string, string> = {
    glimpse: 'bg-zinc-600', core: 'bg-blue-600', focus: 'bg-emerald-600',
    insight: 'bg-purple-600', clarity: 'bg-amber-600', horizon: 'bg-rose-600',
  }

  const handlePortal = async () => {
    setPortalLoading(true)
    try {
      const res = await api.billing.portal()
      window.location.href = res.data.portal_url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('actionFailed'))
    } finally {
      setPortalLoading(false)
    }
  }

  const handleReactivate = async () => {
    setReactivating(true)
    try {
      const res = await api.billing.reactivate()
      toast.success(res.data.message)
      setSubscription(prev => prev ? { ...prev, cancel_at_period_end: false } : null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('actionFailed'))
    } finally {
      setReactivating(false)
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

  const handleChangePlan = async (newTier: string) => {
    if (!subscription) return
    setChangingPlan(true)
    try {
      const res = await api.billing.changePlan(newTier, subscription.billing_interval)
      toast.success(res.data.message)
      setShowChangePlan(false)
      const statusRes = await api.billing.status()
      setSubscription(statusRes.data.subscription)
      if (statusRes.data.subscription) {
        const newName = tierNames[statusRes.data.subscription.tier_slug] || statusRes.data.subscription.tier_slug
        setTierInfo({ slug: statusRes.data.subscription.tier_slug, name: newName })
      }
      refreshUser()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('actionFailed'))
    } finally {
      setChangingPlan(false)
    }
  }

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

  if (IS_OSS) {
    return (
      <div className="space-y-6">
        <div className="border border-border rounded-lg p-6 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">{tCommon('currentPlan')}</p>
            <p className="text-lg font-semibold flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-600 text-white">Core</span>
              {t('coreSelfHosted')}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{t('allFeaturesIncluded')}</p>
        </div>
      </div>
    )
  }

  if (isDemo) {
    return (
      <div className="space-y-6">
        <div className="border border-border rounded-lg p-6 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('demoProfilePlan')}</p>
            <p className="text-lg font-semibold">{tierInfo?.name || 'Clarity'}</p>
          </div>
          <p className="text-sm text-muted-foreground">{t('registerPrompt')}</p>
          <Link href="/signup" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
            Register
          </Link>
        </div>
      </div>
    )
  }

  // Show plan info immediately from user data (no full-page spinner)
  const slug = tierInfo?.slug || user?.tier || 'glimpse'
  const name = tierNames[slug] || tierInfo?.name || 'Glimpse'
  const color = tierColors[slug] || 'bg-zinc-600'
  const isAnnual = subscription?.billing_interval === 'annual'
  const currentTierRank = LICENSE_TIER_ORDER.indexOf(slug)
  const availableTiers = ['focus', 'insight', 'clarity'].filter(tier => tier !== slug)
  const allInvoices = stripeInvoices.length > 0 ? stripeInvoices : []
  const hasPaidPlan = subscription || slug !== 'glimpse'

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* Two-column layout for plan + billing */}
      {paymentSuccess && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 flex items-center gap-3">
          <span className="text-green-400 text-lg">&#10003;</span>
          <div>
            <p className="font-medium text-green-300">{t('paymentSuccessTitle')}</p>
            <p className="text-sm text-green-400/80">{t('paymentSuccessDesc', { tier: name })}</p>
          </div>
        </div>
      )}
      {paymentCanceled && (
        <div className="bg-muted/50 border border-border rounded-lg p-4 flex items-center gap-3">
          <span className="text-muted-foreground text-lg">&#8505;</span>
          <p className="text-sm text-muted-foreground">{t('paymentCanceled')}</p>
        </div>
      )}

      {/* Two-column: Billing left, Plan right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left column: Billing Address */}
      <BillingAddressSection />
      <div className="space-y-6">
      {/* Current plan info - renders immediately from user data */}
      <div className="border border-border rounded-lg p-6 space-y-5">
        <h3 className="font-medium">{tCommon('currentPlan')}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('plan')}</p>
            <p className="text-lg font-semibold flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${color}`}>{name}</span>
              {subscription && `(${isAnnual ? tCommon('annual') : tCommon('monthly')})`}
              <InfoTooltip>{t(`tierInfo_${slug}`)}</InfoTooltip>
            </p>
          </div>
          {subscription && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">{tCommon('status')}</p>
                <p className={`text-lg font-semibold ${
                  subscription.status === 'active' && !subscription.cancel_at_period_end ? 'text-green-400'
                  : subscription.status === 'past_due' ? 'text-yellow-400' : 'text-muted-foreground'
                }`}>
                  {subscription.cancel_at_period_end
                    ? t('cancellingOn', { date: formatDate(subscription.current_period_end) })
                    : subscription.status === 'past_due' ? t('pastDue') : tCommon('active')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{tCommon('nextBilling')}</p>
                <p className="font-medium">{formatDate(subscription.current_period_end)}</p>
              </div>
            </>
          )}
          <div>
            <p className="text-sm text-muted-foreground">{t('memberSince')}</p>
            <p className="font-medium">{user?.created_at ? formatDate(user.created_at) : 'N/A'}</p>
          </div>
        </div>
        {!subscription && slug !== 'horizon' && (
          <div className="flex items-center gap-3 pt-2">
            <Link href="/checkout?tier=focus&interval=monthly" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
              {t('upgrade')}
            </Link>
            <a href={`${APP_CONFIG.websiteUrl}/pricing`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300">
              {t('viewPricing')}
            </a>
          </div>
        )}
      </div>

      {/* Payment Method - with Manage button */}
      {hasPaidPlan && (
        <div className="border border-border rounded-lg p-6 space-y-3">
          <h3 className="font-medium">{t('paymentMethodTitle')}</h3>
          {billingLoading ? (
            <div className="h-5 w-48 bg-muted rounded animate-pulse" />
          ) : cardInfo ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium capitalize">
                {t('cardEndingIn', { brand: cardInfo.brand, last4: cardInfo.last4 })}
              </span>
              <span className="text-sm text-muted-foreground">
                {t('cardExpires', {
                  month: String(cardInfo.exp_month).padStart(2, '0'),
                  year: String(cardInfo.exp_year),
                })}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noPaymentMethod')}</p>
          )}
          {subscription && stripeEnabled && (
            <div>
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="px-4 py-2 bg-muted hover:bg-accent disabled:opacity-50 text-sm rounded-lg transition-colors"
              >
                {portalLoading ? '...' : tCommon('managePayment')}
              </button>
              <p className="text-xs text-muted-foreground mt-1">{t('managePaymentDesc')}</p>
            </div>
          )}
        </div>
      )}

      {/* Subscription management (only for active subscriptions) */}
      {subscription && (
      <div className="border border-border rounded-lg p-6 space-y-4">
        <div className="space-y-4">
          {/* Change plan */}
          {!subscription.cancel_at_period_end && slug !== 'horizon' && slug !== 'clarity' && (
            <div>
              <button onClick={() => setShowChangePlan(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
                {tCommon('changePlan')}
              </button>
            </div>
          )}

          {/* Switch interval */}
          {!subscription.cancel_at_period_end && (
            <div>
              <button
                onClick={handleChangeInterval}
                disabled={changingInterval}
                className="px-4 py-2 bg-muted hover:bg-accent disabled:opacity-50 text-sm rounded-lg transition-colors"
              >
                {changingInterval ? '...' : isAnnual ? t('switchToMonthly') : t('switchToYearly')}
              </button>
            </div>
          )}

          {/* Cancelled - show reactivate */}
          {subscription.cancel_at_period_end && (
            <button onClick={handleReactivate} disabled={reactivating} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
              {reactivating ? tCommon('reactivating') : t('reactivateSubscription')}
            </button>
          )}

          {/* Past due */}
          {subscription.status === 'past_due' && stripeEnabled && (
            <button onClick={handlePortal} disabled={portalLoading} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
              {portalLoading ? '...' : t('updatePaymentMethod')}
            </button>
          )}
        </div>

        {/* Cancel section */}
        <div className="border-t border-border pt-4">
          {subscription.cancel_at_period_end ? (
            <p className="text-sm text-muted-foreground">
              {t('endingOn', { date: formatDate(subscription.current_period_end) })}
            </p>
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
      )}

      </div>
      </div>

      {/* Payment History - Stripe invoices + DB invoices (full width) */}
      {hasPaidPlan && (
        <div className="border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">{t('invoicesTitle')}</h3>
            {stripeEnabled && subscription && (
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50"
              >
                {portalLoading ? '...' : t('viewAllInvoices')}
              </button>
            )}
          </div>
          {billingLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-5 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : allInvoices.length > 0 ? (
            <div className="space-y-3">
              {allInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {new Date(inv.created * 1000).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </span>
                  <span>{inv.number || '-'}</span>
                  <span>{formatLicenseCents(inv.amount_paid)}</span>
                  <span className="text-green-400">{tCommon('paid')}</span>
                  {inv.invoice_pdf ? (
                    <a
                      href={inv.invoice_pdf}
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
          ) : invoices.length > 0 ? (
            <div className="space-y-3">
              {invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{formatDate(inv.date)}</span>
                  <span>{inv.tier ? tierNames[inv.tier] || inv.tier : '-'}</span>
                  <span>{inv.amount_cents ? formatLicenseCents(inv.amount_cents) : '-'}</span>
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
          ) : (
            <p className="text-sm text-muted-foreground">{tCommon('noData')}</p>
          )}
        </div>
      )}

      {/* Change Plan Modal */}
      {showChangePlan && subscription && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-semibold">{tCommon('changePlanTitle')}</h2>
            <p className="text-sm text-muted-foreground">
              {tCommon('currentPlanLabel', {
                tier: tierNames[subscription.tier_slug] || subscription.tier_slug,
                price: LICENSE_TIER_PRICES[subscription.tier_slug]
                  ? formatLicenseCents(isAnnual
                    ? LICENSE_TIER_PRICES[subscription.tier_slug].annual
                    : LICENSE_TIER_PRICES[subscription.tier_slug].monthly)
                    + (isAnnual ? '/yr' : '/mo')
                  : ''
              })}
            </p>

            <div className="space-y-2">
              {availableTiers.map(tier => {
                const prices = LICENSE_TIER_PRICES[tier]
                const price = prices
                  ? formatLicenseCents(isAnnual ? prices.annual : prices.monthly) + (isAnnual ? '/yr' : '/mo')
                  : ''
                return (
                  <button
                    key={tier}
                    onClick={() => handleChangePlan(tier)}
                    disabled={changingPlan}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border hover:border-zinc-500 disabled:opacity-50 transition-colors"
                  >
                    <span className="font-medium">{tierNames[tier]}</span>
                    <span className="text-sm text-muted-foreground">{price}</span>
                  </button>
                )
              })}
              <button
                disabled
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border opacity-60"
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
              className="w-full px-4 py-2 bg-muted hover:bg-accent text-sm rounded-lg transition-colors"
            >
              {tCommon('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Cancel confirmation modal */}
      {showCancelModal && subscription && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-semibold">{t('cancelConfirmTitle')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('cancelConfirmText', {
                tier: tierNames[subscription.tier_slug] || subscription.tier_slug,
                date: formatDate(subscription.current_period_end),
              })}
            </p>

            <div>
              <label htmlFor="settings-cancel-reason" className="text-sm text-muted-foreground block mb-1">{tCommon('cancelReason')}</label>
              <select
                id="settings-cancel-reason"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm"
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
                className="flex-1 px-4 py-2 bg-muted hover:bg-accent text-sm rounded-lg transition-colors"
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
