---
number: 241
title: "design: verify license model supports multi-product (health, finance) + multi-org from BrickOS perspective"
labels: [design, licensing, infrastructure]
milestone: infrastructure
---

## Description

BrickOS is designed as a multi-product platform (Health, Finance, Infrastructure). The current license model needs verification that it can support:

1. **Multi-product licensing** — a user subscribes to Sovereign Health AND BTC Tracker with separate or bundled tiers
2. **Multi-org** — a user belongs to multiple organizations (personal + clinic + employer)
3. **Cross-product features** — Sovereign Link (infrastructure) used by Health app affiliates
4. **Platform-level vs app-level billing** — does billing happen at BrickOS level or per-app?

## Current State

### What Exists (from Design 021 — Multi-Tenant)
- `organizations` table (personal, clinic, family, enterprise, demo)
- `org_members` table (org_owner, org_admin, org_member)
- `app_roles` table (practitioner, patient, viewer per app)
- `data_shares` table (owner→grantee with scopes)
- `license_tiers` — currently health-specific (Glimpse, Focus, Insight, Clarity, Horizon)

### Questions to Answer

1. **Is `license_tiers` product-scoped?**
   - Current: tiers are global (not per-product)
   - Needed: a user could be Clarity for Health but Free for Finance
   - Fix: add `product_key` to `license_tiers`? Or separate subscription per product?

2. **Is billing per-product or per-platform?**
   - Stripe subscriptions currently tied to health tiers
   - Multi-product: separate Stripe subscriptions per product, or one platform subscription with product add-ons?

3. **Can orgs span products?**
   - A clinic org uses Health for patients + Finance for billing
   - Org roles need product scope: admin of Health but viewer of Finance

4. **Feature overlap**
   - PWA, Tor, 2FA — platform-level (not product-specific)
   - Dr. Alex — health-specific
   - BTC tracking — finance-specific
   - Short links — infrastructure, used by health affiliates

5. **Self-hosted implications**
   - Core tier = self-hosted. Does Core cover all products or per-product?
   - Start9 package: one package per product or bundled?

## Deliverable

A design document (design 028) that:
- Maps current schema to multi-product requirements
- Identifies gaps and required migrations
- Proposes billing architecture (per-product vs platform)
- Defines org/role model across products
- Estimated effort to implement

## References
- Design 021: Multi-Tenant Platform Offering
- Design 022: Deployment Architecture & Scaling
- `api/migrations/20260315000076_*` — org/role schema
- `crates/brickos-billing/` — current billing logic
