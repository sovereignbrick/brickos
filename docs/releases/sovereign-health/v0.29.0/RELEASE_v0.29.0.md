# Release v0.29.0

**Date:** 2026-03-27
**Sprint:** 014 -- Licensing SSoT, Deploy Hardening & Security
**Previous:** v0.28.0
**Velocity:** 54 pts planned + significant bonus work
**Commits:** 39
**Duration:** 3 days (2026-03-25 to 2026-03-27)

---

## Highlights

- **Licensing SSoT (Single Source of Truth)** -- `tier_features` table is now THE enforcement source for all feature gates, numeric limits, and AI credits. Replaces 30+ legacy `license_tiers` columns. All 11 handler callers migrated.
- **AI Credit Pool** -- Unified monthly credit pool replaces 9 per-agent chat quotas. Chat = 1 credit, Smart Import = 2 credits. New `ai_credit_usage` table with `check_ai_credits()` / `consume_ai_credits()` functions.
- **L1/L2/L3 Licensing Architecture** -- Platform (L1) defines tiers, Organization (L2) subscribes, App (L3) enforces. 3 user journeys documented (individual, clinic, white-label).
- **Reference Ranges Overhaul** -- All 84 markers now have reference ranges. 20+ markers with LOINC-coded tooltips. Keto/carnivore protocol with 11 marker-specific ranges. 10 previously-missing ranges filled.
- **Settings Tab Restructure** -- Profile split into Health Profile (body data + lifestyle) and Account (email, language, license). 7 tabs on one row.
- **138 Automated Tests** -- 25 new tests: 9 SSoT enforcement, 11 calculated marker formulas, 8 reference range completeness.
- **4 Design Documents** -- 029 (SSoT architecture), 030 (licensing model), 031 (business logic reference), 032 (reference ranges protocol impact).

---

## Architecture Changes

### Licensing SSoT (#237, #241, #235)

**Before:** Enforcement read from 30+ boolean/integer columns on `license_tiers`. Website read from static JSON. These drifted.

**After:** Both enforcement and display read from `tier_features` + `product_features` tables.

New functions in `services/tier.rs`:
- `TierFeatureSet` -- loads all features for a tier in one query (HashMap)
- `check_tier_feature()` -- boolean feature gate
- `check_tier_limit()` -- numeric limit enforcement
- `check_ai_credits()` / `consume_ai_credits()` -- AI credit pool
- `get_ai_credit_status()` -- non-enforcing status for display
- `find_required_tier()` -- dynamic (no hardcoded mapping)

### AI Credit Pool

| Tier | Pool Size | Credit Costs |
|------|-----------|-------------|
| Glimpse | 3/month | Chat: 1, Import: 2 |
| Focus | 17/month | Chat: 1, Import: 2 |
| Insight | 75/month | Chat: 1, Import: 2 |
| Clarity | Unlimited | -- |
| Horizon | Unlimited | -- |

### Admin Role Change

Admin role no longer bypasses tier enforcement. Admin is for panel access, not license override. Only `SHI_MODE=oss` bypasses tiers.

---

## New Migrations (7)

| Migration | Purpose |
|-----------|---------|
| `20260326000001` | Seed calculated marker values for average/at_risk demo profiles |
| `20260326000002` | Add `product_key` column to `license_tiers` |
| `20260326000003` | Create `ai_credit_usage` table + seed from chat_agent_quota |
| `20260326000004` | GDPR cascade fix -- 9 FK tables with SET NULL |
| `20260326000005` | Populate chat limit_values in tier_features |
| `20260327000001` | Reference range tooltips + keto protocol + fill NULLs |
| `20260327000002` | Fill 10 missing reference ranges + emdash cleanup |

---

## Bug Fixes

- **#262 Demo calculated markers** -- `demo_zone_detail()` was hardcoding `latest_value: None`. Now queries `calculated_marker_values` with demo profile filter. Later upgraded to runtime computation (same pipeline as production).
- **#265 Consent toggles** -- Backend expected `newsletter` but frontend sent `consent_newsletter`. Now accepts both.
- **#267 Device type i18n** -- Added missing translations for fora6, qardio_arm, qardio_base.
- **#233 Staging CORS** -- Added `WEBSITE_URL` and staging website to `CORS_ORIGINS`.
- **Chat scroll** -- Propagated `min-h-0 overflow-hidden` through full flex chain.
- **Measurement count** -- Demo measurements excluded from tier limit (`WHERE is_demo = false`).
- **Legacy quota removal** -- Removed `doctor_chat_quota` functions; all quota via `ai_credit_usage`.
- **Emdash cleanup** -- All emdashes removed from DB content (calculated_markers, marker_translations, marker_content).

---

## Frontend Changes

- **Settings tabs** -- Restructured: Health Profile | Devices | Ranges | Factors | Account | Security | Privacy
- **Account tab** -- New component with email, display name, language, country, date/time format, PWA install, push notifications
- **Health Profile** -- Gender, body measurements, lifestyle defaults only
- **PWA manifest** -- Split icon purposes (any/maskable), added 32x32 favicon, description field
- **Loading screen** -- New `loading.tsx` with logo pulse animation
- **Doctor chat sidebar** -- Constrained to `max-w-5xl` to align with navbar
- **Demo profile color** -- Subtitle color matches profile (green/orange/red)
- **Marker detail** -- "When to Worry" removed, "Why It Matters" moved to carousel
- **Pricing page** -- AI Credits values updated (5/15/50/unlimited)

---

## Website Content Updates

- **tiers.json** -- Updated to match tier_features DB SSoT
- **features-en/de.json** -- Corrected marker counts (8/20/50, not 10/75+)
- **content-en/de.json** -- Fixed stale tier summaries, "100+ Biomarkers" hero text
- **Pricing page** -- "AI Chats" renamed to "AI Credits"
- **Markers directory** -- 8 calculated markers enriched with tooltips, units, why_it_matters, when_to_worry

---

## Documentation

| Doc | Title | Purpose |
|-----|-------|---------|
| Design 029 | Licensing SSoT Architecture | 7 binding decisions for #237 implementation |
| Design 030 | Licensing Model Sprint 014 | Complete model with L1/L2/L3, feature matrix, user journeys |
| Design 031 | Business Logic Reference | Calculated markers, health profile fields, user journey narrative |
| Design 032 | Reference Ranges Protocol Impact | For MD review: keto/fasting range shifts with practical examples |

---

## Test Suite

**138 total tests (up from 113):**

| Suite | Tests | Coverage |
|-------|-------|----------|
| Unit (lib) | 23 | Core functions |
| Smoke | 2 | Health + hello endpoints |
| Integration | 10 | HTTP routing + snapshots |
| Tier (SSoT) | 17 | Feature gates, limits, AI credits, API |
| Calculated Markers | 11 | Formulas (GKI, BMI, WHtR, HOMA-IR), protocol resolution, edge cases |
| Reference Ranges | 8 | Completeness, consistency, keto/fasting, tooltips, LOINC |
| Auth | 9 | Login, register, JWT, MFA |
| CRUD | 5 | Measurements, settings |
| Doctor Chat | 7 | Chat, quota, conversations |
| Measurements | 12 | Entry, validation, trends |
| Platform | 28 | Cross-cutting integration |
| E2E | 3 | Smoke against live server |

---

## Issues Created (for next sprint)

| # | Title | Milestone |
|---|-------|-----------|
| #264 | Demo runtime calculated markers | health-intelligence |
| #266 | pgAudit log forwarding to admin | privacy-and-security |
| #268 | CLA, trademark, commercial page | release-workflow |
| #270 | Vegan + Mediterranean reference ranges | health-intelligence |
| #271 | OpenVAS network security scan | privacy-and-security |

---

## Breaking Changes

- **Admin role no longer bypasses tier limits.** Admin users are subject to their license tier for feature gates and AI credits. Only `SHI_MODE=oss` provides unlimited access.
- **`doctor_chat_quota` table deprecated.** All quota enforcement now uses `ai_credit_usage`. The old table still exists for historical data but is no longer written to.
- **`check_feature()` callers migrated.** All handlers now call `check_tier_feature()` which reads from `tier_features` table, not `license_tiers` columns.

---

## Upgrade Notes

1. Migrations run automatically on startup (`sqlx::migrate!()`)
2. No manual DB changes required
3. Frontend build required (settings tab restructure)
4. Cloudflare cache purge recommended after deploy
5. Demo user may need credit reset (`DELETE FROM ai_credit_usage WHERE user_id = ...`)
