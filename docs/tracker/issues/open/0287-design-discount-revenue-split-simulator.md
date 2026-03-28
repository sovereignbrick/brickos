---
number: 287
github: 268
title: "design: discount structure + revenue split simulator (multi-stakeholder)"
labels: [design, business, admin, priority-medium]
milestone: business-model
---

## Description

Build a comprehensive understanding and interactive simulator for the BrickOS discount and revenue split structure. Currently, the admin promotions page (app.sovereignhealth.io/admin) shows a basic Revenue Impact Preview, but as the system grows more complex with multiple discount layers and stakeholders, we need a dedicated tool to visualize and simulate all scenarios.

## Problem

When a subscription is sold, multiple discount layers can stack:
- **Promo code** (percentage or fixed, one-time or repeating)
- **Affiliate commission** (percentage of sale to referrer)
- **Payment method** (card vs BTC -- different processing fees)
- **Org-level discounts** (bulk/enterprise pricing)
- **Multi-tier affiliate** (affiliate who referred the affiliate)
- **Annual vs monthly** (annual discount built into pricing)

It's currently hard to answer: **"For a given sale scenario, who gets what?"**

## Stakeholders in a Sale

| Stakeholder | Cut | Notes |
|-------------|-----|-------|
| **BrickOS (platform)** | Net revenue after all deductions | Must stay above minimum floor |
| **Affiliate** | Commission % of sale price | First-time or recurring |
| **Stripe/Payment processor** | ~2.9% + 0.30 EUR (card) | Or BTC Lightning (~1%) |
| **Customer** | Discount savings | Promo code, org discount |
| **Upstream affiliate** | Multi-tier commission | If affiliate was referred by another affiliate |
| **Organization** | Org-level discount | Bulk seats, enterprise agreement |

## Scenarios to Model

1. **Direct sale, no discount** -- Customer buys Insight at full price via card
2. **Promo code only** -- 50% off for 12 months (e.g., BTCPRAGUE50)
3. **Affiliate only** -- Affiliate referred, gets 10% commission
4. **Promo + Affiliate** -- Stacked: 50% promo + affiliate commission
5. **BTC payment** -- Lower processing fee, different affiliate floor
6. **Promo + Affiliate + BTC** -- Worst case for margin (shown in red in current UI)
7. **Org-level discount** -- Enterprise buys 20 seats at 30% off
8. **Org + Affiliate** -- Enterprise referred by affiliate
9. **Annual vs Monthly** -- Annual pricing already includes ~17% discount
10. **Multi-tier affiliate** -- Affiliate A referred Affiliate B who referred Customer
11. **Free trial -> conversion** -- Revenue timing and attribution

## Current State

The admin Promotions page already calculates:
- Price Preview (per tier with discount applied)
- Revenue Impact Preview with 4 scenarios per tier:
  - Card (no affiliate)
  - Card + Affiliate
  - BTC (no affiliate)
  - BTC + Affiliate
- Warning when margin drops below 50% or hits EUR 5.00 floor
- Shows net revenue as EUR amount and percentage of list price

## What's Needed

### Option A: Extend Admin Promotions Page
- [ ] Add interactive sliders/inputs for all variables
- [ ] Show full waterfall: list price -> discount -> affiliate -> processing -> net
- [ ] Visualize as Sankey diagram or stacked bar chart
- [ ] Show annual revenue projection per scenario
- [ ] Compare scenarios side-by-side

### Option B: Dedicated Revenue Simulator Page (Recommended)
- [ ] New admin page: `/admin/revenue-simulator`
- [ ] Input panel: tier, payment method, promo code, affiliate %, org discount %, annual/monthly
- [ ] Output: waterfall breakdown per stakeholder
- [ ] Visual: Sankey diagram showing money flow
- [ ] Table: all scenarios matrix (tiers x payment methods x discount combos)
- [ ] Guardrails: highlight when BrickOS margin < threshold
- [ ] Export: CSV/PDF for financial planning
- [ ] Saved scenarios: compare "BTC Prague launch" vs "standard pricing"

### Data Model Review
- [ ] Document current discount tables (promotions, affiliate_codes, org_discounts)
- [ ] Document commission calculation logic
- [ ] Document payment processing fee structure
- [ ] Document minimum revenue floors per tier
- [ ] Map the full money flow from customer payment to net revenue

## Deliverables

- [ ] Design doc: complete discount/revenue structure documentation
- [ ] Revenue flow diagram (visual: who gets what)
- [ ] Interactive simulator (admin page or standalone tool)
- [ ] Scenario library (pre-built common scenarios)

## References

- Current admin promotions UI: app.sovereignhealth.io/admin (Promotions tab)
- Issue #251: License pricing Excel calculator
- Design 030: Licensing Model
