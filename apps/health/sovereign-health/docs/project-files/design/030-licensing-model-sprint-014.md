# Design 030: Licensing Model -- Sprint 014 Implementation Detail

**Status:** Accepted
**Date:** 2026-03-26
**Sprint:** 014
**Depends on:** Design 016 (AGPL strategy), Design 021 (multi-tenant), Design 029 (SSoT architecture)

---

## Overview

This document describes the complete licensing model as implemented in Sprint 014. It covers the three-layer architecture, tier structure, AI credit pool, enforcement mechanism, and how pricing flows from database to website.

---

## 1. Three-Layer Architecture

```
L1: BrickOS Platform (sovereign authority)
    Defines all tiers, features, pricing, and rules.
    Tables: license_tiers, product_features, tier_features
    Column: product_key scopes tiers per app (default: sovereign-health)

L2: Organization (billing anchor)
    An org subscribes to a tier per product.
    Individual users are a personal org with 1 member.
    Tables: organizations, org_members, user_licenses
    Future: org_licenses (per-org billing, Phase 3 of Design 021)

L3: App (enforcement + display)
    Each app reads its product's tier config from L1.
    Enforces at runtime via tier.rs, displays on website.
    Functions: check_tier_feature(), check_tier_limit(), check_ai_credits()
```

---

## 2. Tier Structure

| Tier | Slug | Monthly EUR | Annual EUR | Target |
|------|------|------------|-----------|--------|
| Core | core | Free (AGPL) | -- | Self-hosters, developers |
| Glimpse | glimpse | 0 | 0 | Individuals exploring |
| Focus | focus | 9.99 | 99.90 | Serious individual users |
| Insight | insight | 24.99 | 249.90 | Power users |
| Clarity | clarity | 49.99 | 499.90 | Small teams (2 members) |
| Horizon | horizon | 99.99 | 999.90 | Practices/coaches (10 members) |
| Licensed Package | custom | Negotiated | Negotiated | Clinics, vendors, enterprises |

Tiers are stored in `license_tiers` table with `product_key = 'sovereign-health'`.

---

## 3. Feature Matrix (from tier_features SSoT)

### Data & Tracking

| Feature | Glimpse | Focus | Insight | Clarity | Horizon |
|---------|---------|-------|---------|---------|---------|
| Biomarkers | 8 | 20 | 50 | Unlimited | Unlimited |
| Data History | 30 days | 365 days | Unlimited | Unlimited | Unlimited |
| Calculated Markers | 1 | 3 | 8 | Unlimited | Unlimited |
| Measurement Templates | 1 | 3 | 5 | Unlimited | Unlimited |
| Influence Factors | 2 | 10 | 25 | Unlimited | Unlimited |
| Measurements | 100 | 250 | 500 | Unlimited | Unlimited |
| Body Composition | No | Yes | Yes | Yes | Yes |
| Reference Ranges | No | Yes | Yes | Yes | Yes |
| Lifestyle Presets | No | Yes | Yes | Yes | Yes |

### AI Credit Pool

| Feature | Glimpse | Focus | Insight | Clarity | Horizon |
|---------|---------|-------|---------|---------|---------|
| Total AI Credits/month | 3 | 17 | 75 | Unlimited | Unlimited |
| General Chat (1 credit) | 1 | 5 | 30 | Unlimited | Unlimited |
| Trend Analysis (1 credit) | 1 | 3 | 10 | Unlimited | Unlimited |
| Lab Explanation (1 credit) | 1 | 3 | 10 | Unlimited | Unlimited |
| Diet Chat (1 credit) | 0 | 3 | 10 | Unlimited | Unlimited |
| Supplement Chat (1 credit) | 0 | 3 | 10 | Unlimited | Unlimited |
| Protocol Chat (1 credit) | 0 | 0 | 5 | Unlimited | Unlimited |

Smart imports cost 2 credits each (lab import, med import, measurement import).

### Reporting & Export

| Feature | Glimpse | Focus | Insight | Clarity | Horizon |
|---------|---------|-------|---------|---------|---------|
| CSV Export | No | Yes | Yes | Yes | Yes |
| JSON Export | No | Yes | Yes | Yes | Yes |
| PDF Reports | No | No | 1/month | 2/month | Unlimited |

### Security & Integrations

| Feature | Glimpse | Focus | Insight | Clarity | Horizon |
|---------|---------|-------|---------|---------|---------|
| Two-Factor Auth (TOTP) | No | Yes | Yes | Yes | Yes |
| API Access | No | No | No | No | Yes |
| Self-Hosted Hybrid | No | No | No | No | Yes |

---

## 4. Enforcement Architecture

### Single Source of Truth

```
tier_features table (DB)
    |
    +-- tier.rs: check_tier_feature(user, "csv_export")     [boolean check]
    +-- tier.rs: check_tier_limit(user, "markers", count)   [numeric check]
    +-- tier.rs: check_ai_credits(user, "general")          [pool check]
    +-- tier.rs: consume_ai_credits(user, "lab_import")     [pool deduction]
    +-- GET /api/tiers/features                              [API for frontend]
    +-- website/data/tiers.json                              [generated from DB]
```

### Key Functions (services/tier.rs)

| Function | Purpose |
|----------|---------|
| `get_user_tier_slug(pool, user_id)` | Resolve user to tier slug (lightweight, no 30-column load) |
| `load_tier_features(pool, tier_slug)` | Load all features for a tier into HashMap |
| `load_user_features(pool, user_id)` | Resolve user + load features in one call |
| `check_tier_feature(pool, user_id, key)` | Boolean feature gate (UpgradeRequired error if denied) |
| `check_tier_limit(pool, user_id, key, count)` | Numeric limit check |
| `check_ai_credits(pool, user_id, agent)` | Check credit pool before action |
| `consume_ai_credits(pool, user_id, agent)` | Deduct credits + dual-write to chat_agent_quota |
| `get_ai_credit_status(pool, user_id)` | Non-enforcing status for display |
| `find_required_tier(pool, feature_key)` | Dynamic lookup of lowest tier with feature |

### Bypasses

| Mode | Behavior |
|------|----------|
| `SHI_MODE=oss` | All features unlimited (self-hosted) |
| `SHI_MODE=saas` | Full tier enforcement (production) |
| Admin role | Access to admin panel only, does NOT bypass tier limits |

---

## 5. AI Credit Pool

Replaces the legacy per-agent `chat_*_monthly` columns and `doctor_chat_quota` table.

### How It Works

1. User sends a chat or import request
2. `check_ai_credits()` loads `TierFeatureSet`, sums all `chat_*` limit_values = pool limit
3. Reads `ai_credit_usage.used_credits` for current month
4. If `used + cost > limit` -> QuotaExceeded error
5. On success: `consume_ai_credits()` upserts `ai_credit_usage` + writes `chat_agent_quota` for analytics

### Credit Costs

| Action | Credits |
|--------|---------|
| General chat, trends, labs, diet, supplements, protocols | 1 |
| Smart lab import | 2 |
| Smart med import | 2 |
| Smart measurement import | 2 |

### Reset

Monthly. Lazy check: if `month_year < current month`, user starts fresh.

---

## 6. Discount Stack

Applied at billing level (Stripe or manual invoice):

```
Final Price = Base Price
    x (1 - affiliate_discount)      # 20% if applicable
    x (1 - promo_code_discount)      # variable %
    x (1 - btc_discount)             # 5% if BTC payment
```

Calculated in Excel (#251) and enforced by Stripe coupon/promotion codes.

---

## 7. User Journeys

### Journey 1: Individual User (Glimpse -> Focus upgrade)

1. Registers at sovereignhealth.io -> auto-assigned Glimpse (free)
2. Auto-creates personal org (implicit, user never sees "org")
3. Imports a lab PDF -> uses 2 AI credits (smart import)
4. Asks Dr. Alex a question -> uses 1 credit -> 0 remaining
5. Hits CSV export -> blocked, "Upgrade to Focus"
6. Upgrades to Focus via Stripe -> 20 markers, 17 AI credits/month

### Journey 2: Clinic (Licensed Package)

1. Clinic contacts sales -> custom proposal
2. Setup: base license + staff seats (29 EUR/seat) + patient seats (5 EUR/seat)
3. Org created, staff invited with practitioner/assistant roles
4. Patients self-register, linked to org
5. Seat enforcement: `COUNT(staff) < max_staff`, `COUNT(patients) < max_patients`
6. AI credits from org pool, not individual tier

### Journey 3: White-Label Self-Host

1. Enterprise purchases commercial license (AGPL exemption)
2. Receives Docker images + Ed25519 signed license key
3. Sets `SHI_MODE=licensed` + license key in .env
4. License key validated on startup (offline, signature-only)
5. Features/seats defined in license key, enforced by tier.rs

---

## 8. Data Model

### Tables

| Table | Purpose |
|-------|---------|
| `license_tiers` | Tier definitions (slug, name, prices, product_key) |
| `product_features` | Feature catalog (key, name EN/DE, category, status) |
| `tier_features` | Feature-to-tier mapping (included, limit_value, labels) |
| `user_licenses` | User's active tier assignment |
| `ai_credit_usage` | Monthly AI credit pool tracking |
| `chat_agent_quota` | Per-agent usage analytics (dual-write) |

### Legacy (deprecated, kept for data)

| Table | Replaced By |
|-------|-------------|
| `doctor_chat_quota` | `ai_credit_usage` |
| `license_tiers` columns (30+ booleans/ints) | `tier_features` rows |

---

## 9. What's Implemented vs. Planned

### Implemented (Sprint 014)

- [x] `product_key` on `license_tiers`
- [x] `TierFeatureSet` struct + `load_tier_features()` (one-query HashMap)
- [x] `check_tier_feature()` / `check_tier_limit()` reading from `tier_features`
- [x] AI credit pool (`ai_credit_usage` table + `check/consume_ai_credits`)
- [x] All 11 handler callers migrated from legacy to SSoT functions
- [x] Legacy `doctor_chat_quota` functions removed
- [x] Admin role no longer bypasses tier enforcement
- [x] Website pricing synced with tier_features (EN + DE)
- [x] Demo measurements excluded from tier limit counts
- [x] 119 backend tests pass

### Planned (Design 021 Phases)

- [ ] Phase 1: Org API endpoints, JWT org_id, org member management (6-7 weeks)
- [ ] Phase 2: Data sharing, practitioner-patient access (5 weeks)
- [ ] Phase 3: Licensed packages table, org-level billing (3 weeks)
- [ ] Phase 4: License key system (Ed25519), `SHI_MODE=licensed` (3-4 weeks)
- [ ] Phase 5: White-label theming per org (3 weeks)

---

## References

- Design 016: AGPL licensing strategy
- Design 019: Website tier consistency
- Design 021: Multi-tenant platform offering
- Design 029: SSoT architecture decisions
- ADR 022: Tier features database-driven
- Sprint 014: User journeys (individual, clinic, white-label)
