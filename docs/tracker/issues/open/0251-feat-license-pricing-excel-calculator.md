---
number: 251
github_number: 429
title: "feat: Excel calculator for hierarchical license pricing with discounts"
labels: [feat, business, billing, sprint-current]
milestone: horizon-tier
---

## Description

Create an Excel spreadsheet that calculates the final price for each license tier in the hierarchical pricing model, applying all applicable discounts.

## Pricing Layers

1. **Base tier price** — from the hierarchical license package (Free, Starter, Pro, Enterprise, etc.)
2. **Affiliate discount** — 20% off for affiliate referrals
3. **Promo code discount** — variable percentage, applied after affiliate
4. **BTC payment discount** — optional 5% discount for Bitcoin payments

## Discount Stack (order matters)

```
Final Price = Base Price
            × (1 - affiliate_discount)      # 20% if applicable
            × (1 - promo_code_discount)      # variable %
            × (1 - btc_discount)             # 5% if BTC
```

## Requirements

- [ ] All tiers listed with monthly + annual pricing
- [ ] Toggle columns: affiliate (yes/no), promo code (% input), BTC (yes/no)
- [ ] Final price column with all discounts applied
- [ ] Summary row showing revenue per tier at various discount combos
- [ ] Sheet protected but editable in discount input cells
- [ ] Works in Excel + LibreOffice Calc

## Deliverable

- `docs/business/license-pricing-calculator.xlsx`
- Brief explanation of formulas in a second sheet tab
