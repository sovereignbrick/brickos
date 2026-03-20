# ADR-012: Dual Payment Processing — Stripe + Strike

**Status:** Accepted
**Date:** 2026-03-11

## Context
The platform serves two audiences: mainstream users who expect card payments, and sovereignty-focused users who prefer Bitcoin. Supporting only one alienates the other.

## Decision
Integrate **Stripe** for EUR card/subscription payments and **Strike** for Bitcoin/Lightning payments.

- **Stripe:** Recurring subscriptions, invoicing, webhooks, refunds. TEST keys on staging, LIVE on production.
- **Strike:** Bitcoin Lightning payments. EUR conversion rate captured at payment time, stored as snapshot in `btc_payment_snapshots`.
- **Affiliate commissions:** Payable in EUR or BTC.

## Alternatives Considered
- **Stripe only:** Simpler but excludes Bitcoin users — contradicts sovereignty mission.
- **BTCPay Server (self-hosted):** Full sovereignty but requires running a Bitcoin node. Operational burden too high for initial launch.
- **Boltz Gateway:** Submarine swaps for Lightning → on-chain. Researched (design doc exists) but deferred.

## Consequences
- **Easier:** Captures both audiences, aligns with privacy ethos, Strike integration is lightweight.
- **Harder:** Two payment codepaths, two sets of webhooks, BTC price volatility for affiliate payouts.
- **Future:** May add BTCPay Server as self-hosted option for OSS deployments.
