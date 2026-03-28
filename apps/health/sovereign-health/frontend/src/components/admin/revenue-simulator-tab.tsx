'use client'

import { useState, useMemo } from 'react'

// ---------------------------------------------------------------------------
// Pricing constants (mirrors api/src/payments/pricing.rs)
// ---------------------------------------------------------------------------

const TIERS = [
  { slug: 'focus', name: 'Focus', monthly: 999, annual: 9999 },
  { slug: 'insight', name: 'Insight', monthly: 2499, annual: 24999 },
  { slug: 'clarity', name: 'Clarity', monthly: 4999, annual: 49999 },
  { slug: 'horizon', name: 'Horizon', monthly: 9999, annual: 99999 },
]

const MINIMUM_CHARGE_CENTS = 500 // EUR 5.00 floor
const STRIPE_PCT = 0.015
const STRIPE_FIXED = 25 // EUR 0.25
const STRIKE_PCT = 0.01
const DEFAULT_BTC_DISCOUNT = 5
const DEFAULT_AFFILIATE_L1 = 20
const DEFAULT_AFFILIATE_L2 = 2

// ---------------------------------------------------------------------------
// Calculation engine
// ---------------------------------------------------------------------------

interface SimInput {
  listPriceCents: number
  promoPct: number
  promoFixedCents: number
  promoIsPercent: boolean
  btcDiscountPct: number
  isBtc: boolean
  hasAffiliate: boolean
  affiliateL1Pct: number
  hasL2Affiliate: boolean
  affiliateL2Pct: number
  orgDiscountPct: number
}

interface SimBreakdown {
  listPriceCents: number
  orgDiscountCents: number
  afterOrgCents: number
  promoDiscountCents: number
  afterPromoCents: number
  btcDiscountCents: number
  chargedCents: number
  floorApplied: boolean
  gatewayFeeCents: number
  grossRevenueCents: number
  affiliateL1Cents: number
  affiliateL2Cents: number
  netRevenueCents: number
  netRevenuePct: number
  customerSavingsCents: number
  customerSavingsPct: number
}

function calculate(input: SimInput): SimBreakdown {
  const list = input.listPriceCents

  // Step 1: Org discount
  const orgDiscount = Math.round(list * input.orgDiscountPct / 100)
  const afterOrg = Math.max(list - orgDiscount, 0)

  // Step 2: Promo discount (on after-org price)
  const promoDiscount = input.promoIsPercent
    ? Math.round(afterOrg * input.promoPct / 100)
    : Math.min(input.promoFixedCents, afterOrg)
  const afterPromo = Math.max(afterOrg - promoDiscount, 0)

  // Step 3: BTC discount (on after-promo price)
  const btcDiscount = input.isBtc
    ? Math.round(afterPromo * input.btcDiscountPct / 100)
    : 0
  let charged = afterPromo - btcDiscount

  // Step 4: EUR 5.00 floor
  const floorApplied = charged < MINIMUM_CHARGE_CENTS && charged > 0
  if (floorApplied) charged = MINIMUM_CHARGE_CENTS

  // Step 5: Gateway fee
  const gatewayFee = input.isBtc
    ? Math.round(charged * STRIKE_PCT)
    : Math.round(charged * STRIPE_PCT) + STRIPE_FIXED
  const gross = charged - gatewayFee

  // Step 6: Affiliate commissions
  const affiliateL1 = input.hasAffiliate
    ? Math.round(charged * input.affiliateL1Pct / 100)
    : 0
  const affiliateL2 = input.hasL2Affiliate
    ? Math.round(charged * input.affiliateL2Pct / 100)
    : 0
  const net = gross - affiliateL1 - affiliateL2

  const netPct = list > 0 ? Math.round(net * 1000 / list) / 10 : 0
  const savings = list - charged
  const savingsPct = list > 0 ? Math.round(savings * 1000 / list) / 10 : 0

  return {
    listPriceCents: list,
    orgDiscountCents: orgDiscount,
    afterOrgCents: afterOrg,
    promoDiscountCents: promoDiscount,
    afterPromoCents: afterPromo,
    btcDiscountCents: btcDiscount,
    chargedCents: charged,
    floorApplied,
    gatewayFeeCents: gatewayFee,
    grossRevenueCents: gross,
    affiliateL1Cents: affiliateL1,
    affiliateL2Cents: affiliateL2,
    netRevenueCents: net,
    netRevenuePct: netPct,
    customerSavingsCents: savings,
    customerSavingsPct: savingsPct,
  }
}

function centsToEur(cents: number): string {
  return (cents / 100).toFixed(2)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RevenueSimulatorTab() {
  // Inputs
  const [tier, setTier] = useState('insight')
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly')
  const [promoPct, setPromoPct] = useState(0)
  const [promoFixed, setPromoFixed] = useState(0)
  const [promoIsPercent, setPromoIsPercent] = useState(true)
  const [orgDiscountPct, setOrgDiscountPct] = useState(0)
  const [isBtc, setIsBtc] = useState(false)
  const [btcDiscountPct, setBtcDiscountPct] = useState(DEFAULT_BTC_DISCOUNT)
  const [hasAffiliate, setHasAffiliate] = useState(false)
  const [affiliateL1, setAffiliateL1] = useState(DEFAULT_AFFILIATE_L1)
  const [hasL2, setHasL2] = useState(false)
  const [affiliateL2, setAffiliateL2] = useState(DEFAULT_AFFILIATE_L2)

  const tierData = TIERS.find(t => t.slug === tier) || TIERS[1]
  const listPrice = interval === 'annual' ? tierData.annual : tierData.monthly

  // Single scenario calculation
  const breakdown = useMemo(() => calculate({
    listPriceCents: listPrice,
    promoPct,
    promoFixedCents: promoFixed,
    promoIsPercent,
    btcDiscountPct,
    isBtc,
    hasAffiliate,
    affiliateL1Pct: affiliateL1,
    hasL2Affiliate: hasL2,
    affiliateL2Pct: affiliateL2,
    orgDiscountPct,
  }), [listPrice, promoPct, promoFixed, promoIsPercent, btcDiscountPct, isBtc, hasAffiliate, affiliateL1, hasL2, affiliateL2, orgDiscountPct])

  // All-scenarios matrix
  const matrix = useMemo(() => {
    return TIERS.map(t => {
      const price = interval === 'annual' ? t.annual : t.monthly
      const base = {
        listPriceCents: price,
        promoPct,
        promoFixedCents: promoFixed,
        promoIsPercent,
        btcDiscountPct,
        affiliateL1Pct: affiliateL1,
        hasL2Affiliate: hasL2,
        affiliateL2Pct: affiliateL2,
        orgDiscountPct,
      }
      return {
        tier: t,
        card: calculate({ ...base, isBtc: false, hasAffiliate: false }),
        cardAff: calculate({ ...base, isBtc: false, hasAffiliate: true }),
        btc: calculate({ ...base, isBtc: true, hasAffiliate: false }),
        btcAff: calculate({ ...base, isBtc: true, hasAffiliate: true }),
      }
    })
  }, [interval, promoPct, promoFixed, promoIsPercent, btcDiscountPct, affiliateL1, hasL2, affiliateL2, orgDiscountPct])

  const netColor = (pct: number) => {
    if (pct < 30) return 'text-red-400'
    if (pct < 50) return 'text-yellow-400'
    return 'text-green-400'
  }

  return (
    <div className="space-y-8">
      {/* ── Input Panel ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier & Interval */}
        <div className="border border-border rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Subscription</h3>
          <div>
            <label className="text-xs text-muted-foreground">Tier</label>
            <select value={tier} onChange={e => setTier(e.target.value)}
              className="w-full mt-1 bg-background border border-border rounded px-3 py-2 text-sm">
              {TIERS.map(t => (
                <option key={t.slug} value={t.slug}>{t.name} ({centsToEur(t.monthly)}/mo)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Billing Interval</label>
            <div className="flex gap-2 mt-1">
              <button onClick={() => setInterval('monthly')}
                className={`flex-1 px-3 py-2 rounded text-sm border ${interval === 'monthly' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-border text-muted-foreground'}`}>
                Monthly
              </button>
              <button onClick={() => setInterval('annual')}
                className={`flex-1 px-3 py-2 rounded text-sm border ${interval === 'annual' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-border text-muted-foreground'}`}>
                Annual
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Payment Method</label>
            <div className="flex gap-2 mt-1">
              <button onClick={() => setIsBtc(false)}
                className={`flex-1 px-3 py-2 rounded text-sm border ${!isBtc ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-border text-muted-foreground'}`}>
                Card (Stripe)
              </button>
              <button onClick={() => setIsBtc(true)}
                className={`flex-1 px-3 py-2 rounded text-sm border ${isBtc ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-border text-muted-foreground'}`}>
                BTC (Strike)
              </button>
            </div>
          </div>
        </div>

        {/* Discounts */}
        <div className="border border-border rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Discounts</h3>
          <div>
            <label className="text-xs text-muted-foreground">Org Discount (%)</label>
            <input type="range" min={0} max={50} value={orgDiscountPct} onChange={e => setOrgDiscountPct(Number(e.target.value))}
              className="w-full mt-1" />
            <span className="text-sm font-mono">{orgDiscountPct}%</span>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Promo Code</label>
              <select value={promoIsPercent ? 'pct' : 'fixed'} onChange={e => setPromoIsPercent(e.target.value === 'pct')}
                className="bg-background border border-border rounded px-2 py-1 text-xs">
                <option value="pct">Percentage</option>
                <option value="fixed">Fixed EUR</option>
              </select>
            </div>
            {promoIsPercent ? (
              <>
                <input type="range" min={0} max={100} value={promoPct} onChange={e => setPromoPct(Number(e.target.value))}
                  className="w-full mt-1" />
                <span className="text-sm font-mono">{promoPct}%</span>
              </>
            ) : (
              <input type="number" min={0} value={promoFixed / 100} onChange={e => setPromoFixed(Math.round(Number(e.target.value) * 100))}
                className="w-full mt-1 bg-background border border-border rounded px-3 py-2 text-sm"
                placeholder="EUR amount" />
            )}
          </div>
          {isBtc && (
            <div>
              <label className="text-xs text-muted-foreground">BTC Discount (%)</label>
              <input type="range" min={0} max={15} value={btcDiscountPct} onChange={e => setBtcDiscountPct(Number(e.target.value))}
                className="w-full mt-1" />
              <span className="text-sm font-mono">{btcDiscountPct}%</span>
            </div>
          )}
        </div>

        {/* Affiliate */}
        <div className="border border-border rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Affiliate</h3>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={hasAffiliate} onChange={e => setHasAffiliate(e.target.checked)}
              className="rounded" id="aff-toggle" />
            <label htmlFor="aff-toggle" className="text-sm">Referred by affiliate (1st payment)</label>
          </div>
          {hasAffiliate && (
            <>
              <div>
                <label className="text-xs text-muted-foreground">L1 Commission (%)</label>
                <input type="range" min={0} max={50} value={affiliateL1} onChange={e => setAffiliateL1(Number(e.target.value))}
                  className="w-full mt-1" />
                <span className="text-sm font-mono">{affiliateL1}%</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={hasL2} onChange={e => setHasL2(e.target.checked)}
                  className="rounded" id="l2-toggle" />
                <label htmlFor="l2-toggle" className="text-sm">L2 upstream affiliate</label>
              </div>
              {hasL2 && (
                <div>
                  <label className="text-xs text-muted-foreground">L2 Commission (%)</label>
                  <input type="range" min={0} max={10} value={affiliateL2} onChange={e => setAffiliateL2(Number(e.target.value))}
                    className="w-full mt-1" />
                  <span className="text-sm font-mono">{affiliateL2}%</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Waterfall Breakdown ──────────────────────────────── */}
      <div className="border border-border rounded-lg p-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Revenue Waterfall -- {tierData.name} {interval === 'annual' ? 'Annual' : 'Monthly'}
        </h3>

        <div className="space-y-2 font-mono text-sm">
          <Row label="List Price" value={breakdown.listPriceCents} pct={100} color="text-foreground" bold />

          {breakdown.orgDiscountCents > 0 && (
            <Row label="Org Discount" value={-breakdown.orgDiscountCents}
              pct={-(breakdown.orgDiscountCents * 100 / breakdown.listPriceCents)} color="text-yellow-400" />
          )}
          {breakdown.promoDiscountCents > 0 && (
            <Row label="Promo Discount" value={-breakdown.promoDiscountCents}
              pct={-(breakdown.promoDiscountCents * 100 / breakdown.listPriceCents)} color="text-yellow-400" />
          )}
          {breakdown.btcDiscountCents > 0 && (
            <Row label="BTC Discount" value={-breakdown.btcDiscountCents}
              pct={-(breakdown.btcDiscountCents * 100 / breakdown.listPriceCents)} color="text-orange-400" />
          )}

          <div className="border-t border-border my-1" />
          <Row label={`Customer Pays${breakdown.floorApplied ? ' (floor applied)' : ''}`}
            value={breakdown.chargedCents}
            pct={breakdown.chargedCents * 100 / breakdown.listPriceCents}
            color="text-foreground" bold />

          <Row label={`Gateway Fee (${isBtc ? 'Strike ~1%' : 'Stripe 1.5%+0.25'})`}
            value={-breakdown.gatewayFeeCents}
            pct={-(breakdown.gatewayFeeCents * 100 / breakdown.listPriceCents)} color="text-red-400" />

          {breakdown.affiliateL1Cents > 0 && (
            <Row label={`Affiliate L1 (${affiliateL1}%)`}
              value={-breakdown.affiliateL1Cents}
              pct={-(breakdown.affiliateL1Cents * 100 / breakdown.listPriceCents)} color="text-purple-400" />
          )}
          {breakdown.affiliateL2Cents > 0 && (
            <Row label={`Affiliate L2 (${affiliateL2}%)`}
              value={-breakdown.affiliateL2Cents}
              pct={-(breakdown.affiliateL2Cents * 100 / breakdown.listPriceCents)} color="text-purple-300" />
          )}

          <div className="border-t-2 border-border my-1" />
          <Row label="BrickOS Net Revenue" value={breakdown.netRevenueCents}
            pct={breakdown.netRevenuePct} color={netColor(breakdown.netRevenuePct)} bold />
          <Row label="Customer Savings" value={breakdown.customerSavingsCents}
            pct={breakdown.customerSavingsPct} color="text-blue-400" />
        </div>

        {/* Visual bar */}
        <div className="mt-6">
          <div className="text-xs text-muted-foreground mb-1">Revenue Distribution</div>
          <div className="flex h-8 rounded overflow-hidden">
            <Bar pct={breakdown.netRevenueCents * 100 / breakdown.listPriceCents} color="bg-green-600" label="BrickOS" />
            <Bar pct={breakdown.gatewayFeeCents * 100 / breakdown.listPriceCents} color="bg-red-600" label="Gateway" />
            <Bar pct={breakdown.affiliateL1Cents * 100 / breakdown.listPriceCents} color="bg-purple-600" label="Aff L1" />
            <Bar pct={breakdown.affiliateL2Cents * 100 / breakdown.listPriceCents} color="bg-purple-400" label="Aff L2" />
            <Bar pct={breakdown.customerSavingsCents * 100 / breakdown.listPriceCents} color="bg-blue-600" label="Savings" />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-600 inline-block" /> BrickOS</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-600 inline-block" /> Gateway</span>
            {breakdown.affiliateL1Cents > 0 && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-600 inline-block" /> Affiliate L1</span>}
            {breakdown.affiliateL2Cents > 0 && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-400 inline-block" /> Affiliate L2</span>}
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-600 inline-block" /> Customer Savings</span>
          </div>
        </div>

        {/* Warnings */}
        {(breakdown.floorApplied || breakdown.netRevenuePct < 50) && (
          <div className="mt-4 space-y-1">
            {breakdown.floorApplied && (
              <div className="text-xs text-yellow-400 bg-yellow-400/10 rounded px-3 py-2">
                EUR 5.00 minimum floor applied -- actual discount is less than configured.
              </div>
            )}
            {breakdown.netRevenuePct < 50 && (
              <div className="text-xs text-red-400 bg-red-400/10 rounded px-3 py-2">
                Net revenue is {breakdown.netRevenuePct}% of list price -- below 50% threshold.
              </div>
            )}
            {breakdown.netRevenuePct < 30 && (
              <div className="text-xs text-red-400 bg-red-400/10 rounded px-3 py-2 font-bold">
                Net revenue below 30% -- this scenario is not financially viable.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── All Tiers Matrix ────────────────────────────────── */}
      <div className="border border-border rounded-lg p-6 overflow-x-auto">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          All Tiers -- {interval === 'annual' ? 'Annual' : 'Monthly'}
          {promoPct > 0 && ` -- ${promoPct}% promo`}
          {orgDiscountPct > 0 && ` -- ${orgDiscountPct}% org`}
        </h3>
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="text-left py-2 pr-4">Tier</th>
              <th className="text-left py-2 pr-4">List</th>
              <th className="text-right py-2 px-3">Card</th>
              <th className="text-right py-2 px-3">Card+Aff</th>
              <th className="text-right py-2 px-3">BTC</th>
              <th className="text-right py-2 px-3">BTC+Aff</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map(row => (
              <tr key={row.tier.slug} className="border-t border-border">
                <td className="py-2 pr-4 font-medium text-foreground">{row.tier.name}</td>
                <td className="py-2 pr-4 text-muted-foreground">{centsToEur(row.card.listPriceCents)}</td>
                <MatrixCell b={row.card} netColor={netColor} />
                <MatrixCell b={row.cardAff} netColor={netColor} />
                <MatrixCell b={row.btc} netColor={netColor} />
                <MatrixCell b={row.btcAff} netColor={netColor} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Annual Revenue Projection ───────────────────────── */}
      <div className="border border-border rounded-lg p-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Annual Revenue Projection (per subscriber)
        </h3>
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="text-left py-2 pr-4">Tier</th>
              <th className="text-right py-2 px-3">Annual Gross</th>
              <th className="text-right py-2 px-3">Annual Net (Card)</th>
              <th className="text-right py-2 px-3">Annual Net (BTC+Aff worst)</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map(row => {
              const months = interval === 'annual' ? 1 : 12
              return (
                <tr key={row.tier.slug} className="border-t border-border">
                  <td className="py-2 pr-4 font-medium">{row.tier.name}</td>
                  <td className="text-right px-3">{centsToEur(row.card.chargedCents * months)}</td>
                  <td className={`text-right px-3 ${netColor(row.card.netRevenuePct)}`}>
                    {centsToEur(row.card.netRevenueCents * months)}
                  </td>
                  <td className={`text-right px-3 ${netColor(row.btcAff.netRevenuePct)}`}>
                    {centsToEur(row.btcAff.netRevenueCents * months)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function Row({ label, value, pct, color, bold }: {
  label: string; value: number; pct: number; color: string; bold?: boolean
}) {
  const sign = value >= 0 ? '' : ''
  return (
    <div className={`flex items-center justify-between ${bold ? 'font-bold' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <div className="flex gap-4">
        <span className={color}>{sign}{centsToEur(value)}</span>
        <span className="text-muted-foreground w-16 text-right">({pct >= 0 ? '' : ''}{pct.toFixed(1)}%)</span>
      </div>
    </div>
  )
}

function Bar({ pct, color, label }: { pct: number; color: string; label: string }) {
  if (pct <= 0) return null
  return (
    <div className={`${color} relative`} style={{ width: `${Math.max(pct, 2)}%` }}
      title={`${label}: ${pct.toFixed(1)}%`} />
  )
}

function MatrixCell({ b, netColor }: { b: SimBreakdown; netColor: (pct: number) => string }) {
  return (
    <td className="text-right py-2 px-3">
      <span className={netColor(b.netRevenuePct)}>
        {centsToEur(b.netRevenueCents)}
      </span>
      <span className="text-muted-foreground text-xs ml-1">
        ({b.netRevenuePct}%)
      </span>
      {b.floorApplied && <span className="text-yellow-400 text-xs ml-1" title="EUR 5.00 floor applied">*</span>}
    </td>
  )
}
