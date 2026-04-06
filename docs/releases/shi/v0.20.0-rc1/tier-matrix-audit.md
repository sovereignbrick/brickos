<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 License Tier Matrix Audit
 Version: 0.20.0-rc1 — 2026-03-16

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# License Tier Matrix Audit — v0.20.0-rc1

**Date:** 2026-03-16
**Source:** Staging DB (`sovereign_health_staging`) + Frontend (`tiers.ts`) + Backend (`tier.rs`)

---

## 1. Tier Overview

| Tier | Monthly | Annual | Annual Discount | Type | Status |
|------|---------|--------|-----------------|------|--------|
| **Core** | Free | Free | — | Self-hosted / OSS | Active |
| **Glimpse** | Free | Free | — | Free tier | Active |
| **Focus** | €9.99 | €99.90 | 17% | Starter paid | Active (highlighted) |
| **Insight** | €24.99 | €249.90 | 17% | Mid-tier | Active |
| **Clarity** | €49.99 | €499.90 | 17% | Premium | Active |
| **Horizon** | €99.99 | €999.90 | 17% | Enterprise | Active |

---

## 2. Feature Limit Matrix

### 2.1 Data Features

| Feature | Glimpse | Focus | Insight | Clarity | Horizon | Core |
|---------|---------|-------|---------|---------|---------|------|
| Biomarkers | 8 | 20 | 50 | Unlimited | All 75+ | All |
| Data History | 30 days | 365 days | Unlimited | Unlimited | Unlimited | Unlimited |
| Calculated Markers | 1 | 3 | 8 | All 22+ | All 22+ | All |
| Templates | 1 | 3 | 5 | Unlimited | Unlimited | Unlimited |
| Influence Factors | 2 | 10 | 25 | Unlimited | Unlimited | Unlimited |
| Measurements | 100 | 250 | 500 | Unlimited | Unlimited | Unlimited |
| Body Composition | No | Yes | Yes | Yes | Yes | Yes |
| Reference Ranges | No | Yes | Yes | Yes | Yes | Yes |
| Lifestyle Presets | No | Yes | Yes | Yes | Yes | Yes |

### 2.2 AI Features (Monthly Quota)

| Feature | Glimpse | Focus | Insight | Clarity | Horizon | Core |
|---------|---------|-------|---------|---------|---------|------|
| Dr. Alex General | 2/mo | 5/mo | 30/mo | Unlimited | Unlimited | Unlimited |
| Trend Analysis | 1/mo | 3/mo | 10/mo | Unlimited | Unlimited | Unlimited |
| Lab Explanation | 1/mo | 3/mo | 10/mo | Unlimited | Unlimited | Unlimited |
| Nutrition Chat | No | 3/mo | 10/mo | Unlimited | Unlimited | Unlimited |
| Supplement Review | No | 3/mo | 10/mo | Unlimited | Unlimited | Unlimited |
| Protocol Comparison | No | No | 5/mo | Unlimited | Unlimited | Unlimited |
| Check Influence Factors | No | Yes | Yes | Yes | Yes | Yes |
| AI Dashboard | No | No | Yes | Yes | Yes | No |
| Benchmark | No | No | No | Yes | Yes | No |

### 2.3 Reporting & Export

| Feature | Glimpse | Focus | Insight | Clarity | Horizon | Core |
|---------|---------|-------|---------|---------|---------|------|
| CSV Export | No | Yes | Yes | Yes | Yes | Yes |
| JSON Export | No | Yes | Yes | Yes | Yes | Yes |
| PDF Reports | No | No | 1/mo | 2/mo | Unlimited | Unlimited |
| Lab Import | No | No | 3/mo | Unlimited | Unlimited | Unlimited |
| Influence Import | No | No | 1/mo | Unlimited | Unlimited | Unlimited |

### 2.4 Security & Integrations

| Feature | Glimpse | Focus | Insight | Clarity | Horizon | Core |
|---------|---------|-------|---------|---------|---------|------|
| MFA (TOTP) | No | Yes | Yes | Yes | Yes | Yes |
| Standard Support | Yes | Yes | Yes | Yes | Yes | Yes |
| Priority Support | No | No | No | No | Soon | No |
| API Access | No | No | No | No | Yes | Yes |
| Self-Hosted Hybrid | No | No | No | No | Yes | Yes (full) |
| Nostr Login | Soon | Soon | Soon | Soon | Soon | Soon |
| Tor Support | Soon | Soon | Soon | Soon | Soon | Soon |
| StartOS Package | Soon | Soon | Soon | Soon | Soon | Soon |
| Personal Onboarding | No | No | No | No | Soon | No |

---

## 3. Enforcement Points

Where tier limits are actually checked in the backend:

| Feature | Enforcement File | Function | Notes |
|---------|-----------------|----------|-------|
| Markers | `tier.rs` | `GLIMPSE_MARKERS` array | Hardcoded 8-marker whitelist |
| Measurements | `measurements.rs:90` | `check_measurement_cap()` | Counts user's total measurements |
| Templates | `templates.rs:46` | `check_count_limit("templates")` | Rejects create if at limit |
| Influence Factors | `influence_factors.rs:242` | `check_count_limit("influence_factors")` | Rejects create if at limit |
| Medications | `medications.rs:143` | `check_count_limit("medications")` | Same as influence factors |
| CSV Export | `export.rs:31` | `check_feature("csv_export")` | Boolean gate |
| JSON Export | `reports.rs:653` | `check_feature("json_export")` | Boolean gate |
| Custom Thresholds | `settings.rs:776,855` | `check_feature("custom_thresholds")` | Boolean gate |
| Doctor Chat | `doctor_chat.rs:47` | `check_chat_quota()` | Per-agent monthly quota |
| Lab Import | `import.rs:46` | `check_chat_quota("lab_import")` | Uses chat quota system |
| Med Import | `import.rs:532` | `check_chat_quota("med_import")` | Uses chat quota system |

**Not enforced in backend (frontend-only or not yet implemented):**
- History days (no backend filter — all data returned, frontend could limit display)
- Body composition (no backend gate)
- Lifestyle presets (no backend gate)
- Calculated markers limit (all computed client-side)

---

## 4. Findings & Inconsistencies

### TIER-F001 — Frontend↔DB Chat Quota Mismatch

| | |
|---|---|
| **Severity** | Medium |
| **Finding** | Frontend `tiers.ts` shows different chat limits than DB |

| Tier | Frontend `doctorChat` | DB `chat_general` |
|------|----------------------|-------------------|
| Glimpse | 1 | 2 |
| Focus | 5 | 5 (match) |
| Insight | 15 | 30 |
| Clarity | unlimited | unlimited (match) |

**Impact:** Users may see a lower limit displayed than what the backend allows. The backend is the source of truth and correctly enforces the DB limit.

**Recommendation:** Update `tiers.ts` to match DB values, or document that frontend shows a simplified "total across agents" number.

### TIER-F002 — Horizon Price Mismatch

| | |
|---|---|
| **Severity** | Low |
| **Finding** | Frontend shows "Custom" but DB has €99.99/mo |

Frontend `TIERS.horizon.price = null` → displays "Custom"
DB `license_tiers.price_monthly_eur = 99.99`

**Impact:** Pricing page shows "Contact Us" for Horizon, but Stripe could charge €99.99. This is intentional (Horizon is an enterprise tier with custom negotiation), but the DB price should either be NULL or match the display intent.

**Recommendation:** Set DB `price_monthly_eur = NULL` for Horizon, or add a `is_public_price` flag.

### TIER-F003 — History Days Not Enforced Backend

| | |
|---|---|
| **Severity** | Medium |
| **Finding** | Glimpse should see only 30 days of history, but backend returns all data |

The `GET /measurements` endpoint does not filter by tier history limit. A Glimpse user's API response includes all historical measurements.

**Impact:** Frontend may display all data anyway if it doesn't enforce the limit client-side.

**Recommendation:** Add `max_history_days` filter to the measurements list query based on user tier.

### TIER-F004 — Calculated Markers Not Enforced

| | |
|---|---|
| **Severity** | Low |
| **Finding** | Calculated markers (GKI, BMI, etc.) are computed client-side with no tier gating |

Glimpse should see only 1 calculated marker, Focus 3, Insight 8. But `computeMarkers()` in the frontend returns all computed markers regardless of tier.

**Impact:** Free users see all calculated markers. This is a premium feature leak.

**Recommendation:** Filter `computeMarkers()` output by tier limit, or accept this as a known upsell opportunity.

### TIER-F005 — Core Tier Inconsistency

| | |
|---|---|
| **Severity** | Low |
| **Finding** | Core tier is unlimited and free, but has inconsistent feature flags |

Core has `ai_dashboard_insights=false` and `cohort_comparison=false`, but other unlimited features are true. This seems intentional (self-hosted users don't get cloud-only features), but it's not documented.

Also: Core has `protocol_comparison=true` but `personal_onboarding=false` — the distinction between cloud and self-hosted features needs a clear rule.

**Recommendation:** Add a `core_only_excluded` list or `requires_cloud` flag to product_features.

### TIER-F006 — Coming Soon Features in Tier Matrix

| | |
|---|---|
| **Severity** | Info |
| **Finding** | 12 of 33 features are "coming_soon" |

Features with `status=coming_soon`: StartOS Package, AI Dashboard, Benchmark, Protocol Comparison, Tor Support, PDF Reports, Lab Import, Influence Factor Import, API Access, Self-Hosted Hybrid, Personal Onboarding, Priority Support, Nostr Login.

These are included in the tier_features matrix with `included=true/false` but are not functional. Users see "Coming Soon" badges.

**Recommendation:** No action needed — this is correctly handled. Ensure "coming_soon" features are never enforced as limits (they currently aren't).

---

## 5. Relationship Diagram

```
license_tiers (6 rows)
  │
  │ tier_key (slug)
  │
  ├──→ tier_features (33 features × 6 tiers = 198 rows)
  │      │
  │      │ feature_id (FK)
  │      │
  │      └──→ product_features (33 rows)
  │             ├── category: data | ai | reporting | security | integrations
  │             └── status: active | coming_soon
  │
  ├──→ user_licenses (1 per user)
  │      │
  │      │ tier_id (FK)
  │      │
  │      └──→ users
  │             │
  │             ├──→ chat_agent_quota (per agent per month)
  │             ├──→ measurements (count-limited)
  │             ├──→ measurement_templates (count-limited)
  │             ├──→ influence_factors (count-limited)
  │             └──→ user_medications (count-limited)
  │
  └──→ license_tier_translations (i18n: name, tagline, description)
         └── locales: en, de
```

**Enforcement flow:**
1. User makes API request
2. Handler calls `tier::check_feature()` or `tier::check_count_limit()`
3. Service queries `user_licenses → license_tiers → tier_features`
4. If `included=false` or count >= `limit_value` → returns 403 `tier_limit_exceeded`
5. Grace period: uses `previous_tier_slug` limits during downgrade window

---

## 6. Test Coverage

**File:** `frontend/src/lib/tier-matrix.test.ts` — **22 tests**

| Group | Tests | What It Verifies |
|-------|-------|-----------------|
| Tier hierarchy | 5 | Price ordering, annual discount range, display order, all active |
| Progressive limits | 4 | Limits increase glimpse→focus→insight, unlimited for clarity/horizon |
| Frontend↔backend | 4 | Prices match, unlimited tiers match, chat counts reasonable |
| Display helpers | 3 | Price labels, upgrade path, core no upgrade |
| Feature gates | 2 | Glimpse blocked features, paid tier exports |
| Documented inconsistencies | 4 | Core unlimited, chat mismatches, horizon price |

---

## 7. Recommendations Summary

| ID | Priority | Finding | Action |
|----|----------|---------|--------|
| TIER-F001 | Medium | Chat quota mismatch FE↔DB | Sync `tiers.ts` with DB values |
| TIER-F002 | Low | Horizon price null vs 99.99 | Set DB price to NULL or add flag |
| TIER-F003 | Medium | History days not enforced | Add backend filter on measurements query |
| TIER-F004 | Low | Calculated markers not gated | Filter client-side or accept as upsell |
| TIER-F005 | Low | Core tier feature flags unclear | Document cloud-only vs self-hosted rule |
| TIER-F006 | Info | 12/33 features coming_soon | No action — correctly handled |
