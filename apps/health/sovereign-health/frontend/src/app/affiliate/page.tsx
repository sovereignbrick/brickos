'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { toast } from '@/lib/toast'
import { Copy, Check, Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useContent } from '@/lib/content-context'
import { QRCodeCanvas } from 'qrcode.react'

interface AffiliateStats {
  total_clicks: number
  total_signups: number
  paid_conversions: number
  pending_commission_cents: number
  approved_commission_cents: number
  paid_commission_cents: number
}

interface BtcStats {
  pending_sats: number
  approved_sats: number
  paid_sats: number
}

interface PayoutSettings {
  method: string | null
  btc_address: string | null
}

interface Conversion {
  id: string
  status: string
  commission_amount_cents: number | null
  commission_btc_sats: number | null
  payout_method_snapshot: string | null
  referred_email: string | null
  created_at: string
}

type SortField = 'date' | 'amount' | 'status' | 'method'

function formatCents(cents: number): string {
  return `\u20AC${(cents / 100).toFixed(2)}`
}

function formatSats(sats: number): string {
  return `${sats.toLocaleString()} sats`
}

function maskBtcAddress(addr: string): string {
  if (addr.length <= 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function AffiliatePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const t = useTranslations('affiliate')
  const tCommon = useTranslations('common')
  const { locale: contentLocale } = useContent()

  const [affiliateCode, setAffiliateCode] = useState('')
  const [referralLink, setReferralLink] = useState('')
  const [stats, setStats] = useState<AffiliateStats | null>(null)
  const [btcStats, setBtcStats] = useState<BtcStats | null>(null)
  const [hasEurCommissions, setHasEurCommissions] = useState(false)
  const [hasBtcCommissions, setHasBtcCommissions] = useState(false)
  const [payoutSettings, setPayoutSettings] = useState<PayoutSettings | null>(null)
  const [conversions, setConversions] = useState<Conversion[]>([])
  const [conversionsTotal, setConversionsTotal] = useState(0)
  const [conversionsPage, setConversionsPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [loadingData, setLoadingData] = useState(true)
  const [copied, setCopied] = useState(false)

  // Payout settings form state
  const [payoutMethod, setPayoutMethod] = useState('btc_onchain')
  const [btcAddress, setBtcAddress] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)

  const loadStats = useCallback(async () => {
    try {
      const res = await api.affiliate.me()
      setAffiliateCode(res.data.affiliate_code)
      setReferralLink(res.data.referral_link)
      setStats(res.data.stats)
      setBtcStats(res.data.btc)
      setHasEurCommissions(res.data.has_eur_commissions)
      setHasBtcCommissions(res.data.has_btc_commissions)
      setPayoutSettings(res.data.payout_settings)
      if (res.data.payout_settings?.method) {
        setPayoutMethod(res.data.payout_settings.method)
      }
      if (res.data.payout_settings?.btc_address) {
        setBtcAddress(res.data.payout_settings.btc_address)
      }
    } catch {
      // Will show empty state
    }
  }, [])

  const loadConversions = useCallback(async (page: number, sort: SortField, order: 'asc' | 'desc') => {
    try {
      const res = await api.affiliate.conversions(page, 20, sort, order)
      setConversions(res.data.conversions)
      setConversionsTotal(res.data.total)
      setConversionsPage(page)
    } catch {
      // Ignore
    }
  }, [])

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login?return=/affiliate')
      return
    }
    Promise.all([loadStats(), loadConversions(1, sortField, sortOrder)]).finally(() => setLoadingData(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, router, loadStats, loadConversions])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(tCommon('copyFailed'))
    }
  }

  const downloadQR = useCallback(() => {
    const qrCanvas = document.getElementById('affiliate-qr-download') as HTMLCanvasElement
    if (!qrCanvas) return

    const size = qrCanvas.width
    const padding = 16
    const textHeight = 32
    const totalWidth = size + padding * 2
    const totalHeight = size + padding * 2 + textHeight

    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = totalWidth
    exportCanvas.height = totalHeight
    const ctx = exportCanvas.getContext('2d')!

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, totalWidth, totalHeight)
    ctx.drawImage(qrCanvas, padding, padding)

    const logo = new Image()
    logo.crossOrigin = 'anonymous'
    logo.onload = () => {
      const logoSize = 90
      const borderSize = 2
      const cx = padding + size / 2
      const cy = padding + size / 2

      ctx.beginPath()
      ctx.arc(cx, cy, logoSize / 2 + borderSize, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.drawImage(logo, cx - logoSize / 2, cy - logoSize / 2, logoSize, logoSize)

      ctx.fillStyle = '#000000'
      ctx.font = '600 22px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('sovereignhealth.io', totalWidth / 2, size + padding + textHeight - 6)

      const url = exportCanvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `sovereign-health-affiliate-${affiliateCode}.png`
      link.href = url
      link.click()
    }
    logo.src = '/apple-touch-icon.png'
  }, [affiliateCode])

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      await api.affiliate.updateSettings({
        payout_method: payoutMethod,
        btc_address: payoutMethod === 'btc_onchain' ? btcAddress : undefined,
      })
      toast.success(t('payoutSaved'))
      await loadStats()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('payoutFailed'))
    } finally {
      setSavingSettings(false)
    }
  }

  const toggleSort = (field: SortField) => {
    const newOrder = sortField === field ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'desc'
    setSortField(field)
    setSortOrder(newOrder)
    loadConversions(1, field, newOrder)
  }

  const perPage = 20

  const statusConfig: Record<string, { color: string; label: string }> = {
    pending: { color: 'text-yellow-400 bg-yellow-400/10', label: t('pending') },
    approved: { color: 'text-green-400 bg-green-400/10', label: t('approved') },
    paid: { color: 'text-emerald-300 bg-emerald-300/10', label: t('paid') },
    rejected: { color: 'text-red-400 bg-red-400/10', label: t('rejected') },
    refunded: { color: 'text-red-400 bg-red-400/10', label: t('refunded') },
  }

  const dateLocale = contentLocale === 'de' ? 'de-DE' : 'en-US'
  const showBtcTiles = hasBtcCommissions || payoutMethod === 'btc_onchain'
  const showSplitHeadings = showBtcTiles

  if (loading || loadingData) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <p className="text-muted-foreground text-sm">{tCommon('loading')}</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Section 1: Title + Referral Link + QR + Payment Terms */}
        <div>
          <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="flex-1 space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">{t('referralLink')}</h2>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-accent border rounded-lg px-3 py-2.5 text-sm font-mono truncate select-all">
                  {referralLink}
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center w-10 h-10 rounded-lg border bg-accent hover:bg-accent transition-colors shrink-0"
                  title={tCommon('copyToClipboard')}
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{t('shareDescription')}</p>

              <div className="pt-3 border-t border-border space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{t('paymentTerms')}</p>
                <ul className="text-xs text-muted-foreground/70 space-y-0.5 list-disc list-inside">
                  <li>{t('paymentThreshold')}</li>
                  <li>{t('paymentSchedule')}</li>
                  <li>{t('btcConversion')}</li>
                </ul>
              </div>
            </div>

            {referralLink && (
              <div className="flex flex-col items-center gap-1">
                <div className="bg-white rounded-md p-1.5 inline-block">
                  <div className="relative">
                    <QRCodeCanvas
                      id="affiliate-qr-preview"
                      value={referralLink}
                      size={100}
                      level="H"
                      includeMargin={false}
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-[1px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/apple-touch-icon.png" alt="" className="w-7 h-7 rounded-full" />
                    </div>
                  </div>
                </div>
                <div className="hidden">
                  <QRCodeCanvas
                    id="affiliate-qr-download"
                    value={referralLink}
                    size={400}
                    level="H"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
                <button
                  onClick={downloadQR}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  {t('downloadQR')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Referral Stats (neutral) */}
        {stats && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('referralStats')}</h3>
            <div className="grid grid-cols-3 gap-3">
              <StatCard label={t('clicks')} value={stats.total_clicks} />
              <StatCard label={t('signups')} value={stats.total_signups} />
              <StatCard label={t('paidConversions')} value={stats.paid_conversions} />
            </div>
          </div>
        )}

        {/* Section 3: EUR Commissions (blue) */}
        {stats && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {showSplitHeadings ? <>{t('commissionsEur')} <span className="text-blue-400">&#8364;</span></> : t('commissions')}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <EurTile label={t('pending')} value={formatCents(stats.pending_commission_cents)} />
              <EurTile label={t('approved')} value={formatCents(stats.approved_commission_cents)} />
              <EurTile label={t('paid')} value={formatCents(stats.paid_commission_cents)} />
            </div>
          </div>
        )}

        {/* Section 4: BTC Commissions (orange) */}
        {btcStats && showBtcTiles && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('commissionsBtc')} <span className="text-orange-400">&#8383;</span></h3>
            <div className="grid grid-cols-3 gap-3">
              <BtcTile label={t('pending')} value={formatSats(btcStats.pending_sats)} />
              <BtcTile label={t('approved')} value={formatSats(btcStats.approved_sats)} />
              <BtcTile label={t('paid')} value={formatSats(btcStats.paid_sats)} />
            </div>
          </div>
        )}

        {/* Section 5: Commission History (sortable table) */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('transactionHistory')}</h3>
          {conversions.length === 0 ? (
            <div className="border border-border rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground/50">{t('noTransactions')}</p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th
                        onClick={() => toggleSort('date')}
                        className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium cursor-pointer hover:text-foreground select-none"
                      >
                        {t('colDate')} <SortIcon active={sortField === 'date'} order={sortOrder} />
                      </th>
                      <th className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium">
                        {t('colReferral')}
                      </th>
                      <th
                        onClick={() => toggleSort('amount')}
                        className="text-right px-3 py-2.5 text-xs text-muted-foreground font-medium cursor-pointer hover:text-foreground select-none"
                      >
                        {t('colAmount')} <SortIcon active={sortField === 'amount'} order={sortOrder} />
                      </th>
                      <th
                        onClick={() => toggleSort('method')}
                        className="text-center px-3 py-2.5 text-xs text-muted-foreground font-medium cursor-pointer hover:text-foreground select-none"
                      >
                        {t('colMethod')} <SortIcon active={sortField === 'method'} order={sortOrder} />
                      </th>
                      <th
                        onClick={() => toggleSort('status')}
                        className="text-center px-3 py-2.5 text-xs text-muted-foreground font-medium cursor-pointer hover:text-foreground select-none"
                      >
                        {t('colStatus')} <SortIcon active={sortField === 'status'} order={sortOrder} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {conversions.map((c, i) => {
                      const sc = statusConfig[c.status] || statusConfig.pending
                      return (
                        <tr key={c.id} className={`border-b border-border/50 ${i % 2 === 0 ? 'bg-transparent' : 'bg-accent/30'}`}>
                          <td className="px-3 py-2.5 text-xs">
                            {new Date(c.created_at).toLocaleDateString(dateLocale, {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                            })}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[140px]">
                            {c.referred_email || '\u2014'}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-right font-mono">
                            {c.payout_method_snapshot === 'btc_onchain' && c.commission_btc_sats != null
                              ? <span className="text-orange-300">{formatSats(c.commission_btc_sats)}</span>
                              : c.commission_amount_cents != null
                                ? <span className="text-blue-300">{formatCents(c.commission_amount_cents)}</span>
                                : '-'}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-center">
                            {c.payout_method_snapshot === 'btc_onchain'
                              ? <span className="inline-flex items-center gap-1 text-orange-400">Bitcoin</span>
                              : <span className="inline-flex items-center gap-1 text-blue-400">Euro</span>
                            }
                          </td>
                          <td className="px-3 py-2.5 text-xs text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.color}`}>
                              {sc.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {conversionsTotal > perPage && (
                <div className="flex items-center justify-between px-3 py-2 border-t border-border text-xs text-muted-foreground">
                  <span>{t('showing', { from: (conversionsPage - 1) * perPage + 1, to: Math.min(conversionsPage * perPage, conversionsTotal), total: conversionsTotal })}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { const p = conversionsPage - 1; loadConversions(p, sortField, sortOrder) }}
                      disabled={conversionsPage === 1}
                      className="px-2 py-1 rounded bg-muted hover:bg-accent disabled:opacity-30 transition-colors"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => { const p = conversionsPage + 1; loadConversions(p, sortField, sortOrder) }}
                      disabled={conversionsPage * perPage >= conversionsTotal}
                      className="px-2 py-1 rounded bg-muted hover:bg-accent disabled:opacity-30 transition-colors"
                    >
                      →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 6: Payout Settings */}
        <div className="rounded-xl border border-border p-4 space-y-4">
          <h3 className="text-sm font-medium">{t('payoutSettings')}</h3>
          <div>
            <label className="text-sm font-medium block mb-1.5">{t('payoutMethod')}</label>
            <select
              value={payoutMethod}
              onChange={e => setPayoutMethod(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="btc_onchain">{t('btcOnchain')}</option>
              <option value="bank">{t('bankTransfer')}</option>
            </select>
          </div>

          {payoutMethod === 'btc_onchain' && (
            <div>
              <label className="text-sm font-medium block mb-1.5">{t('btcAddress')}</label>
              <input
                type="text"
                value={btcAddress}
                onChange={e => setBtcAddress(e.target.value)}
                placeholder="bc1q..."
                className="w-full bg-accent border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {payoutSettings?.btc_address && btcAddress === payoutSettings.btc_address && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('savedAddress', { address: maskBtcAddress(payoutSettings.btc_address) })}
                </p>
              )}
            </div>
          )}

          {payoutMethod === 'bank' && (
            <p className="text-sm text-muted-foreground">
              {t('bankContact')}
            </p>
          )}

          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {savingSettings ? tCommon('saving') : tCommon('save')}
          </button>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border p-4 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  )
}

function EurTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-blue-300 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-950/20 p-4 text-center">
      <p className="text-xl font-bold text-blue-700 dark:text-blue-100">{value}</p>
      <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">{label}</p>
    </div>
  )
}

function BtcTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-orange-300 dark:border-orange-800/50 bg-orange-50 dark:bg-orange-950/20 p-4 text-center">
      <p className="text-xl font-bold text-orange-700 dark:text-orange-100">{value}</p>
      <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">{label}</p>
    </div>
  )
}

function SortIcon({ active, order }: { active: boolean; order: 'asc' | 'desc' }) {
  if (!active) return <span className="text-muted-foreground/30 ml-1">↕</span>
  return <span className="ml-1">{order === 'asc' ? '↑' : '↓'}</span>
}
