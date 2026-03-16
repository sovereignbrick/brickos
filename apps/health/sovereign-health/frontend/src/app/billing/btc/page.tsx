'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Suspense } from 'react'
import { useTranslations } from 'next-intl'

function BtcCheckoutInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tBilling = useTranslations('billing')
  const tier = searchParams.get('tier') || 'focus'
  const period = parseInt(searchParams.get('period') || '12', 10)
  const promo = searchParams.get('promo') || undefined

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invoice, setInvoice] = useState<{
    invoice_id: string
    amount_eur: number
    amount_btc: number | null
    amount_sats: number | null
    lightning_invoice: string | null
    on_chain_address: string | null
    qr_data: string
    expires_at: string
    price_breakdown: {
      monthly_price: number
      base_total_eur: number
      annual_discount_eur: number
      promo_discount_eur: number
      btc_discount_percent: number
      btc_discount_eur: number
    }
    promo_applied: string | null
  } | null>(null)
  const [status, setStatus] = useState<'pending' | 'paid' | 'expired' | 'confirming'>('pending')
  const [copied, setCopied] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [graceLeft, setGraceLeft] = useState<number>(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const graceRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const tierDisplay: Record<string, string> = {
    focus: 'Focus', insight: 'Insight', clarity: 'Clarity', horizon: 'Horizon',
  }

  const periodDisplay = (m: number) => {
    if (m === 1) return '1 month'
    return `${m} months`
  }

  // Create invoice on mount
  useEffect(() => {
    let cancelled = false
    async function createInvoice() {
      try {
        const res = await api.billing.btc.createInvoice(tier, period, promo)
        if (cancelled) return
        setInvoice(res.data)
        // Calculate time left
        const expiresAt = new Date(res.data.expires_at).getTime()
        setTimeLeft(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)))
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to create invoice')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    createInvoice()
    return () => { cancelled = true }
  }, [tier, period, promo])

  // Poll for payment status (during pending and confirming)
  useEffect(() => {
    if (!invoice || (status !== 'pending' && status !== 'confirming')) return
    const interval = status === 'confirming' ? 2000 : 5000
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.billing.btc.checkInvoice(invoice.invoice_id)
        if (res.data.status === 'paid') {
          setStatus('paid')
          if (pollRef.current) clearInterval(pollRef.current)
          if (graceRef.current) clearInterval(graceRef.current)
        } else if (res.data.status === 'expired' && status !== 'confirming') {
          setStatus('expired')
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch {
        // ignore poll errors
      }
    }, interval)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [invoice, status])

  // Countdown timer — when it hits 0, enter grace period instead of expiring
  useEffect(() => {
    if (status !== 'pending' || timeLeft <= 0) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setStatus('confirming')
          setGraceLeft(60)
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [status, timeLeft])

  // Grace period countdown — only expire after this runs out
  useEffect(() => {
    if (status !== 'confirming') return
    graceRef.current = setInterval(() => {
      setGraceLeft(t => {
        if (t <= 1) {
          setStatus('expired')
          if (graceRef.current) clearInterval(graceRef.current)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (graceRef.current) clearInterval(graceRef.current) }
  }, [status])

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const formatSats = (sats: number) => {
    return sats.toLocaleString()
  }

  // Success screen
  if (status === 'paid') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">&#9889;</div>
          <h1 className="text-2xl font-bold text-white mb-2">Payment Confirmed!</h1>
          <p className="text-zinc-400 mb-6">
            Your {tierDisplay[tier] || tier} plan ({periodDisplay(period)}) is now active.
          </p>
          <button
            onClick={() => router.push('/billing')}
            className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium"
          >
            Go to Billing
          </button>
        </div>
      </div>
    )
  }

  // Expired screen
  if (status === 'expired') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">&#8987;</div>
          <h1 className="text-2xl font-bold text-white mb-2">Invoice Expired</h1>
          <p className="text-zinc-400 mb-6">
            The Bitcoin price quote has expired. Create a new invoice to get an updated rate.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium"
          >
            Create New Invoice
          </button>
        </div>
      </div>
    )
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Creating Bitcoin invoice...</div>
      </div>
    )
  }

  // Error
  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-red-900/50 rounded-lg p-8 text-center">
          <h1 className="text-xl font-bold text-red-400 mb-2">Error</h1>
          <p className="text-zinc-400 mb-6">{error || 'Failed to create invoice'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-zinc-800/50 px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">&#9889;</span>
            <h1 className="text-xl font-bold text-white">Pay with Bitcoin</h1>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Plan details */}
          <div className="flex justify-between items-start">
            <div>
              <div className="text-white font-semibold">{tierDisplay[tier] || tier}  - {periodDisplay(period)}</div>
              {invoice.promo_applied && (
                <div className="text-amber-400 text-sm mt-1">Promo: {invoice.promo_applied}</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-white font-bold text-lg">&euro;{invoice.amount_eur.toFixed(2)}</div>
              {invoice.amount_sats && (
                <div className="text-zinc-400 text-sm">{formatSats(invoice.amount_sats)} sats</div>
              )}
              {invoice.amount_btc && (
                <div className="text-zinc-500 text-xs">&asymp; {invoice.amount_btc.toFixed(8)} BTC</div>
              )}
            </div>
          </div>

          {/* Price breakdown */}
          <div className="bg-zinc-800/50 rounded-lg p-3 text-sm space-y-1">
            {invoice.price_breakdown.annual_discount_eur > 0 && (
              <div className="flex justify-between text-zinc-400">
                <span>{tBilling('annualDiscount')}</span>
                <span className="text-emerald-400">-&euro;{invoice.price_breakdown.annual_discount_eur.toFixed(2)}</span>
              </div>
            )}
            {invoice.price_breakdown.promo_discount_eur > 0 && (
              <div className="flex justify-between text-zinc-400">
                <span>{tBilling('promoDiscount')}</span>
                <span className="text-emerald-400">-&euro;{invoice.price_breakdown.promo_discount_eur.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-400">
              <span>Bitcoin discount ({invoice.price_breakdown.btc_discount_percent}%)</span>
              <span className="text-amber-400">-&euro;{invoice.price_breakdown.btc_discount_eur.toFixed(2)}</span>
            </div>
          </div>

          {/* QR Code */}
          {invoice.qr_data && (
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg">
                {/* Use an img tag with a QR code API since we're server-side rendering */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(invoice.qr_data)}`}
                  alt="Bitcoin payment QR code"
                  width={200}
                  height={200}
                  className="block"
                />
              </div>
            </div>
          )}

          {/* Payment details */}
          <div className="space-y-3">
            {invoice.lightning_invoice && (
              <div>
                <label className="text-zinc-500 text-xs uppercase tracking-wide">Lightning Invoice</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono truncate">
                    {invoice.lightning_invoice}
                  </div>
                  <button
                    onClick={() => copyToClipboard(invoice.lightning_invoice!, 'lightning')}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm text-white shrink-0"
                  >
                    {copied === 'lightning' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {invoice.on_chain_address && (
              <div>
                <label className="text-zinc-500 text-xs uppercase tracking-wide">On-chain Address</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono truncate">
                    {invoice.on_chain_address}
                  </div>
                  <button
                    onClick={() => copyToClipboard(invoice.on_chain_address!, 'onchain')}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm text-white shrink-0"
                  >
                    {copied === 'onchain' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Timer + status */}
          <div className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-4 py-3">
            {status === 'confirming' ? (
              <>
                <div className="flex items-center gap-2 text-amber-300">
                  <span className="inline-block w-2 h-2 bg-amber-300 rounded-full animate-pulse" />
                  Confirming payment...
                </div>
                <div className="text-zinc-400 font-mono text-sm">
                  {formatTime(graceLeft)}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-zinc-400">
                  <span className="inline-block w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                  Waiting for payment...
                </div>
                <div className="text-zinc-300 font-mono text-sm">
                  {formatTime(timeLeft)}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BtcCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    }>
      <BtcCheckoutInner />
    </Suspense>
  )
}
