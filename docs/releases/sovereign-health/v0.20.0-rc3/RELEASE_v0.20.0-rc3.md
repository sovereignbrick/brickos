<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Release Notes — v0.20.0-rc3
 Date: 2026-03-18

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# Release Notes — v0.20.0-rc3

**Version:** 0.20.0-rc3
**Date:** 2026-03-18
**Previous:** 0.20.0-rc2 (2026-03-17)
**Repository:** github.com/sovereignbrick/brickos
**App Path:** `apps/health/sovereign-health/`

---

## Summary

RC3 adds onboarding flow, full light/dark theme toggle, tax-compliant billing infrastructure, WCAG 2.1 AA accessibility pass, and a large documentation cleanup. All pre-deployment checks pass (267 backend tests, 192 frontend tests, 0 theme violations, 96% Lighthouse accessibility).

---

## Key Changes

### Features

- **Onboarding checklist with global tracker (#19)** — New `onboarding-checklist.tsx` and `onboarding-tracker.tsx` components guide new users through initial setup steps
- **Dark/light theme toggle with full light theme support (#84)** — `theme-context.tsx` provider, updated `globals.css` with 102+ lines of theme-aware CSS, all pages and components updated
- **Learn page infrastructure (#22)** — New `/learn` route and page scaffolding (content pending #101)
- **Tax compliance & billing data sovereignty (#100)** — New `invoices`, `invoice_line_items`, `payment_methods_cache`, and `customer_tax_ids` tables; billing address and VAT fields on `user_profile`; expanded billing handler (+233 lines)
- **Tier-specific colors on pricing pages** — Pricing and feature comparison tables use per-tier color accents
- **Theme audit script for CI** — `scripts/check-theme-colors.sh` catches hardcoded colors before deploy
- **Screenshot gallery & lightbox** — Reusable components for website and frontend
- **Video embed component** — For learn page video content
- **Country list utility** — `countries.ts` with localized country names for billing address forms

### Fixes

- **Removed `consent_product_updates`** — Dropped from signup form, backend handlers, settings page, and database (migration 092)
- **Affiliate page light theme support** — Fixed white-on-white elements in light mode
- **Checkout page rework** — Updated for billing address collection and tax display
- **Settings page overhaul** — 192-line diff: billing section, theme toggle, cleaned up profile defaults
- **Navbar updates** — Theme toggle integration, responsive adjustments
- **Doctor chat components** — Dark/light theme support across all chat UI (agent grid, bubbles, input, layout, messages, conversation list, import review, quota badge, rating buttons, typing indicator)
- **Website header** — Theme-aware styling

### Backend

- **Billing handler expansion** — Tax calculation, VAT validation, invoice mirroring from Stripe, billing address CRUD
- **Auth handler cleanup** — Removed `consent_product_updates` from registration flow
- **Contact handler** — Minor cleanup
- **Settings handler** — Billing address and customer type fields
- **Segments service** — Minor adjustment
- **Reports handler** — Minor cleanup
- **brickos-billing crate** — Stripe integration updates for tax/invoice support
- **brickos-db crate** — User model updated for new billing fields

### Ops

- **Deploy script** — Version bump, improvements
- **Docker Compose** — Updated prod, staging, and selfhosted configurations
- **Cleanup script** — New `ops/cleanup.sh`

### Documentation

- **Major cleanup** — Removed ~33k lines of duplicated/outdated docs from `docs/releases/`, `docs/reports/`, and `docs/specs/`
- **Consolidated to `docs/project-files/`** — Single source of truth for release artifacts
- **Removed 90+ legacy spec files** — Old design docs, wireframes, and superseded specs cleaned out

---

## Database Migrations

| Migration | Description |
|-----------|-------------|
| `20260318000091_tax_compliance_billing_tables.sql` | Adds billing fields to `user_profile`; creates `invoices`, `invoice_line_items`, `payment_methods_cache`, `customer_tax_ids` tables |
| `20260318000092_drop_consent_product_updates.sql` | Drops unused `consent_product_updates` column from `user_profile` |

---

## Issues

**Closed:** #19 (onboarding checklist), #84 (theme toggle)
**Created:** #101, #102, #103, #104, #105, #106

---

## Pre-deployment Audit

| Check | Result |
|-------|--------|
| `cargo test` | 267 passed |
| `cargo fmt + clippy` | 0 warnings |
| `pnpm test` | 192 tests, 12 files |
| `theme-colors.sh` | 0 critical violations |
| Lighthouse accessibility | 96% |
| `cargo audit` | 0 CVEs (6 allowed warnings — unmaintained deps in genpdf) |

---

## Known Issues

- Protocol Comparison not yet implemented (Coming Soon)
- Benchmark not yet implemented (Coming Soon)
- AI Dashboard not yet implemented (Coming Soon)
- Learn page content pending (#101)
- Horizon tier features all Coming Soon
- Password reset email requires valid Mailgun credentials in .env

---

## Files Changed

~156 files changed, ~1,008 insertions, ~33,360 deletions (bulk from doc cleanup)
