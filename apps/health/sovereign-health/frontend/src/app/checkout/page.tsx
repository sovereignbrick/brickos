'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Image from 'next/image'

const TIER_PRICES: Record<string, { monthly: number; annual: number }> = {
  focus: { monthly: 999, annual: 9999 },
  insight: { monthly: 2499, annual: 24999 },
  clarity: { monthly: 4999, annual: 49999 },
}

function formatCents(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const t = useTranslations('checkout')
  const tCommon = useTranslations('common')
  const tTiers = useTranslations('tiers')
  const [error, setError] = useState('')
  const [checkingOut, setCheckingOut] = useState(false)
  const calledRef = useRef(false)

  const tier = searchParams.get('tier') || ''
  const interval = searchParams.get('interval') || 'monthly'
  const urlPromo = searchParams.get('promo') || ''
  const method = searchParams.get('method') || 'card'

  // Promo code state
  const [promoCode, setPromoCode] = useState(urlPromo)
  const [promoValid, setPromoValid] = useState<boolean | null>(null)
  const [promoMessage, setPromoMessage] = useState('')
  const [promoDiscount, setPromoDiscount] = useState<{ discount: string; discounted_price: number } | null>(null)
  const [validatingPromo, setValidatingPromo] = useState(false)

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'btc'>(method === 'btc' ? 'btc' : 'card')

  // ALL useEffects BEFORE any conditional returns (React rules of hooks)

  // Auth redirect - must be a hook, not after conditional return
  useEffect(() => {
    if (!authLoading && !user) {
      if (tier) {
        try {
          const pending = { tier, interval, promo: urlPromo || undefined, method: method !== 'card' ? method : undefined }
          sessionStorage.setItem('sh_pending_checkout', JSON.stringify(pending))
        } catch {}
      }
      const params = new URLSearchParams()
      if (tier) params.set('tier', tier)
      if (interval) params.set('interval', interval)
      if (urlPromo) params.set('promo', urlPromo)
      if (method !== 'card') params.set('method', method)
      window.location.href = `/signup?${params.toString()}`
    }
  }, [authLoading, user, tier, interval, urlPromo, method])

  // Auto-validate promo from URL on mount
  useEffect(() => {
    if (urlPromo && tier && user) {
      validatePromo(urlPromo)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const validatePromo = async (code: string) => {
    if (!code.trim()) {
      setPromoValid(null)
      setPromoMessage('')
      setPromoDiscount(null)
      return
    }
    setValidatingPromo(true)
    try {
      const res = await api.promotions.validate(code.trim(), tier)
      if (res.data.valid) {
        setPromoValid(true)
        setPromoMessage(res.data.discount || '')
        const tierPrice = res.data.prices?.find(p => p.tier === tier)
        if (tierPrice) {
          setPromoDiscount({
            discount: res.data.discount || '',
            discounted_price: tierPrice.discounted_price * 100,
          })
        }
      } else {
        setPromoValid(false)
        const reasons: Record<string, string> = {
          invalid_code: t('promoInvalid'),
          expired: t('promoExpired'),
          code_disabled: t('promoInvalid'),
          max_redemptions_reached: t('promoInvalid'),
          not_applicable_to_tier: t('promoNotApplicable'),
        }
        setPromoMessage(reasons[res.data.reason || ''] || t('promoInvalid'))
        setPromoDiscount(null)
      }
    } catch {
      setPromoValid(false)
      setPromoMessage(t('promoInvalid'))
      setPromoDiscount(null)
    } finally {
      setValidatingPromo(false)
    }
  }

  const startCheckout = useCallback(async () => {
    if (calledRef.current) return
    calledRef.current = true
    setCheckingOut(true)

    sessionStorage.removeItem('sh_pending_checkout')

    try {
      const res = await api.billing.checkout(tier, interval, promoValid ? promoCode.trim() : undefined)
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url
      } else {
        setError(t('error'))
        calledRef.current = false
        setCheckingOut(false)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('error')
      setError(msg)
      toast.error(msg)
      calledRef.current = false
      setCheckingOut(false)
    }
  }, [tier, interval, promoCode, promoValid, t])

  // --- Conditional returns AFTER all hooks ---

  // Loading auth state
  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-muted-foreground text-sm">{t('preparingCheckout')}</p>
        </div>
      </main>
    )
  }

  // Not authenticated - useEffect above will redirect
  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-muted-foreground text-sm">{t('preparingCheckout')}</p>
        </div>
      </main>
    )
  }

  // Authenticated - no tier selected, redirect to billing
  if (!tier) {
    router.push('/billing')
    return null
  }

  // Authenticated - show checkout details
  const tierName = tTiers(tier as 'focus' | 'insight' | 'clarity' | 'horizon' | 'glimpse')
  const tierPrices = TIER_PRICES[tier]
  const basePrice = tierPrices ? (interval === 'annual' ? tierPrices.annual : tierPrices.monthly) : 0
  const displayPrice = promoDiscount ? promoDiscount.discounted_price : basePrice

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Sovereign Health Intelligence" width={64} height={64} className="rounded-lg mx-auto mb-4" />
          <h1 className="text-2xl font-bold">{t('title')}</h1>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-zinc-900/50 p-6 space-y-5">
          {/* Plan summary */}
          <div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('selectedPlan')}</span>
              <span className="font-medium">{tierName}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">{t('interval')}</span>
              <span className="font-medium">{interval === 'annual' ? tCommon('annual') : tCommon('monthly')}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">{t('price')}</span>
              <span className="font-medium">
                {promoDiscount ? (
                  <>
                    <span className="line-through text-muted-foreground mr-1">{formatCents(basePrice)}</span>
                    {formatCents(displayPrice)}
                  </>
                ) : (
                  formatCents(basePrice)
                )}
                {interval === 'annual' ? '/yr' : '/mo'}
              </span>
            </div>
          </div>

          {/* Payment method */}
          <div className="border-t border-zinc-800 pt-4">
            <p className="text-sm font-medium mb-2">{tCommon('paymentMethod')}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors ${
                  paymentMethod === 'card'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-zinc-700 text-muted-foreground hover:border-zinc-500'
                }`}
              >
                {t('payCard')}
              </button>
              <button
                onClick={() => setPaymentMethod('btc')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors ${
                  paymentMethod === 'btc'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-zinc-700 text-muted-foreground hover:border-zinc-500'
                }`}
              >
                {t('payBtc')}
              </button>
            </div>
          </div>

          {/* Promo code */}
          <div className="border-t border-zinc-800 pt-4">
            <p className="text-sm font-medium mb-2">{t('promoLabel')}</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={e => {
                  setPromoCode(e.target.value)
                  if (!e.target.value.trim()) {
                    setPromoValid(null)
                    setPromoMessage('')
                    setPromoDiscount(null)
                  }
                }}
                placeholder={t('promoPlaceholder')}
                className="flex-1 bg-white/5 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={() => validatePromo(promoCode)}
                disabled={validatingPromo || !promoCode.trim()}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-sm rounded-lg transition-colors"
              >
                {validatingPromo ? '...' : t('promoApply')}
              </button>
            </div>
            {promoValid === true && (
              <p className="text-xs text-green-400 mt-1.5 flex items-center gap-1">
                <span>&#10003;</span> {promoMessage}
              </p>
            )}
            {promoValid === false && (
              <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                <span>&#10007;</span> {promoMessage}
              </p>
            )}
          </div>

          {/* Action */}
          <div className="border-t border-zinc-800 pt-4">
            {paymentMethod === 'btc' ? (
              <div className="text-center py-2">
                <a
                  href={`/billing/btc?tier=${tier}&period=${interval === 'annual' ? '12' : '1'}${promoCode && promoValid ? `&promo=${promoCode}` : ''}`}
                  className="w-full inline-block bg-amber-600 hover:bg-amber-500 text-white rounded-lg py-2.5 text-sm font-medium transition-colors text-center"
                >
                  {t('proceedToPayment')}
                </a>
                <p className="text-xs text-muted-foreground mt-2">{t('btcDiscount')}</p>
              </div>
            ) : error ? (
              <div className="space-y-3 text-center">
                <p className="text-red-400 text-sm">{error}</p>
                <button
                  onClick={() => { setError(''); calledRef.current = false; startCheckout() }}
                  className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                >
                  {tCommon('tryAgain')}
                </button>
              </div>
            ) : (
              <button
                onClick={startCheckout}
                disabled={checkingOut}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
              >
                {checkingOut ? t('redirecting') : t('proceedToPayment')}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          <Link href="/billing" className="hover:text-foreground transition-colors">
            {t('backToBilling')}
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutContent />
    </Suspense>
  )
}
