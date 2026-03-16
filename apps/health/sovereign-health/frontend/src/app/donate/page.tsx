'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { useTranslations } from 'next-intl'
import { APP_CONFIG } from '@/lib/config'
import { Copy, Check } from 'lucide-react'

const API_BASE = APP_CONFIG.apiUrl

const PRESETS = [5, 10, 25, 50]

interface InvoiceData {
  invoice_id: string
  amount_eur: number
  amount_btc: number | null
  amount_sats: number | null
  lightning_invoice: string | null
  on_chain_address: string | null
  qr_data: string
  expires_at: string
}

type PageStatus = 'input' | 'paying' | 'confirming' | 'paid' | 'expired'

export default function DonatePage() {
  const t = useTranslations('donate')

  const [amount, setAmount] = useState(10)
  const [customAmount, setCustomAmount] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [status, setStatus] = useState<PageStatus>('input')
  const [timeLeft, setTimeLeft] = useState(0)
  const [graceLeft, setGraceLeft] = useState(0)
  const [copied, setCopied] = useState(false)
  const [scheme, setScheme] = useState<'lightning' | 'onchain'>('lightning')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const graceRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const effectiveAmount = isCustom ? parseFloat(customAmount) || 0 : amount

  const createDonation = async () => {
    if (effectiveAmount < 1 || effectiveAmount > 1000) {
      setError(t('minAmount'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch(`${API_BASE}/donate/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: effectiveAmount, currency: 'EUR', message: message || undefined }),
      })
      const data = await resp.json()
      if (data.error) {
        setError(data.error.message || 'Error')
        return
      }
      setInvoice(data.data)
      setStatus('paying')
      const expiresAt = new Date(data.data.expires_at).getTime()
      setTimeLeft(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)))
    } catch {
      setError('Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  // Poll for payment status
  useEffect(() => {
    if (!invoice || (status !== 'paying' && status !== 'confirming')) return
    const interval = status === 'confirming' ? 2000 : 3000
    pollRef.current = setInterval(async () => {
      try {
        const resp = await fetch(`${API_BASE}/donate/status/${invoice.invoice_id}`)
        const data = await resp.json()
        if (data.data?.status === 'paid') {
          setStatus('paid')
          if (pollRef.current) clearInterval(pollRef.current)
          if (graceRef.current) clearInterval(graceRef.current)
        }
      } catch {
        // ignore
      }
    }, interval)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [invoice, status])

  // Countdown timer
  useEffect(() => {
    if (status !== 'paying' || timeLeft <= 0) return
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

  // Grace period
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

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const resetForm = () => {
    setInvoice(null)
    setStatus('input')
    setTimeLeft(0)
    setGraceLeft(0)
    setError(null)
  }

  const qrValue = invoice
    ? scheme === 'lightning'
      ? invoice.lightning_invoice || invoice.qr_data
      : invoice.on_chain_address
        ? `bitcoin:${invoice.on_chain_address}?amount=${invoice.amount_btc?.toFixed(8) || '0'}`
        : invoice.qr_data
    : ''

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">

          {/* Paid screen */}
          {status === 'paid' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
              <div className="text-6xl mb-4">&#9889;</div>
              <h1 className="text-2xl font-bold text-white mb-2">{t('thankYou')}</h1>
              <p className="text-zinc-400 mb-6">{t('thankYouMessage')}</p>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
              >
                {t('donateAgain')}
              </button>
            </div>
          )}

          {/* Expired screen */}
          {status === 'expired' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
              <div className="text-6xl mb-4">&#8987;</div>
              <h1 className="text-2xl font-bold text-white mb-2">{t('invoiceExpired')}</h1>
              <p className="text-zinc-400 mb-6">{t('invoiceExpiredMessage')}</p>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
              >
                {t('tryAgain')}
              </button>
            </div>
          )}

          {/* Payment screen */}
          {(status === 'paying' || status === 'confirming') && invoice && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <div className="bg-zinc-800/50 px-6 py-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-orange-400 text-xl">&#8383;</span>
                  <h1 className="text-lg font-bold text-white">{t('title')}</h1>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Amount */}
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">&euro;{invoice.amount_eur.toFixed(2)}</p>
                  {invoice.amount_sats && (
                    <p className="text-sm text-orange-400">&asymp; {invoice.amount_sats.toLocaleString()} sats</p>
                  )}
                </div>

                {/* QR Code */}
                {qrValue && (
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrValue)}`}
                        alt="Payment QR code"
                        width={200}
                        height={200}
                        className="block"
                      />
                    </div>
                  </div>
                )}

                {/* Scheme toggle */}
                <div className="flex justify-center gap-3 text-xs">
                  <button
                    onClick={() => setScheme('lightning')}
                    className={scheme === 'lightning' ? 'text-orange-400 font-medium' : 'text-zinc-500 hover:text-zinc-300'}
                  >
                    &#9889; Lightning
                  </button>
                  <span className="text-zinc-600">|</span>
                  <button
                    onClick={() => setScheme('onchain')}
                    className={scheme === 'onchain' ? 'text-orange-400 font-medium' : 'text-zinc-500 hover:text-zinc-300'}
                  >
                    &#9939; On-chain
                  </button>
                </div>

                {/* Copy button */}
                <button
                  onClick={() => copyToClipboard(qrValue)}
                  className="w-full flex items-center justify-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors py-2"
                >
                  {copied
                    ? <><Check className="w-3 h-3 text-green-400" /> {t('copied')}</>
                    : <><Copy className="w-3 h-3" /> {t('copyInvoice')}</>
                  }
                </button>

                {/* Timer */}
                <div className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-4 py-3">
                  {status === 'confirming' ? (
                    <>
                      <div className="flex items-center gap-2 text-amber-300 text-sm">
                        <span className="inline-block w-2 h-2 bg-amber-300 rounded-full animate-pulse" />
                        {t('confirming')}
                      </div>
                      <div className="text-zinc-400 font-mono text-sm">{formatTime(graceLeft)}</div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-zinc-400 text-sm">
                        <span className="inline-block w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                        {t('waitingForPayment')}
                      </div>
                      <div className="text-zinc-300 font-mono text-sm">{formatTime(timeLeft)}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Input screen */}
          {status === 'input' && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white mb-2">
                  <span className="text-orange-400">&#8383;</span> {t('title')}
                </h1>
                <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
                {/* Amount label */}
                <label className="text-sm font-medium text-zinc-300 block">{t('amountLabel')}</label>

                {/* Presets */}
                <div className="grid grid-cols-5 gap-2">
                  {PRESETS.map(p => (
                    <button
                      key={p}
                      onClick={() => { setAmount(p); setIsCustom(false) }}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                        !isCustom && amount === p
                          ? 'bg-orange-600 text-white'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      &euro;{p}
                    </button>
                  ))}
                  <button
                    onClick={() => setIsCustom(true)}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                      isCustom
                        ? 'bg-orange-600 text-white'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {t('custom')}
                  </button>
                </div>

                {/* Custom amount input */}
                {isCustom && (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">&euro;</span>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      step="0.01"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      placeholder="1.00 - 1000.00"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                )}

                {/* Message */}
                <div>
                  <label className="text-sm font-medium text-zinc-300 block mb-1.5">{t('messageLabel')}</label>
                  <input
                    type="text"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    maxLength={100}
                    placeholder={t('messagePlaceholder')}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                {/* Error */}
                {error && <p className="text-sm text-red-400">{error}</p>}

                {/* Submit */}
                <button
                  onClick={createDonation}
                  disabled={loading || effectiveAmount < 1}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <span className="text-lg">&#8383;</span>
                  {loading ? '...' : t('button')}
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </div>
  )
}
