# ADR 030: Hierarchical affiliate tracking with privacy-preserving click analytics

**Status:** Accepted
**Date:** 2026-03-12 (documented 2026-04-05)
**Context:** Sprint 012 -- affiliate system + Sprint 023 admin visibility

## Context
The platform needs to track user acquisition channels (direct vs referral), support a 2-level affiliate commission structure, and provide admin visibility into affiliate performance -- all while respecting user privacy (no IP logging, no user agent tracking).

## Decision
Privacy-by-design affiliate system with hierarchical referral tracking:

- **User-level**: `users.referred_by` (affiliate code of referrer), `users.affiliate_code` (auto-generated 8-char code), `users.parent_referrer_id` (grandparent in 2-level chain)
- **Click tracking**: `affiliate_clicks` stores only `affiliate_code + clicked_at`. No IP, no user agent. Rate limited via SHA256(IP + code) hash -- one-way, not stored.
- **Short links**: `short_links` + `short_link_clicks` with `visitor_hash` (SHA256 of IP + code + date, rotates daily). Provides unique visitor counting without storing PII.
- **Cookie**: `sh_ref` (30-day, sameSite=lax, first-touch attribution). Set on any page with `?ref=` parameter. Cleared after signup.
- **Conversions**: `affiliate_conversions` with status lifecycle (pending -> approved -> paid). 30-day evaluation period.
- **Commissions**: BTC (sats) or Stripe, with `btc_eur_rate` snapshot at conversion time.
- **Organization scoping**: Org owners see affiliate stats for their org members only. BrickOS admin sees cross-org overview.

## Alternatives Considered
- **UTM parameter tracking**: Not implemented yet -- affiliate codes cover the primary use case. UTM can be added later for campaign-level attribution.
- **Third-party affiliate platform**: Rejected -- adds cost, sends PII to third party, doesn't integrate with BTC payments
- **Simple referral code (no hierarchy)**: Rejected -- 2-level hierarchy incentivizes affiliate-to-affiliate recruitment

## Consequences
- Privacy: no PII stored in click tracking. GDPR-compliant by design.
- Admin visibility: Sprint 023 added "Source" column (Direct/Affiliate) to admin Users tab + affiliate summary cards
- Trade-off: no detailed click analytics (no referrer domain, no geographic data for affiliates). Accepted -- privacy > analytics.
- First-touch attribution means only the first referral link matters. If user clicks affiliate A then affiliate B, only A gets credit.
