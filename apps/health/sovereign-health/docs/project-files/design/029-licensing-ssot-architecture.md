# Design 029: Licensing SSoT Architecture — L1→L2→L3 Decisions

**Status:** Accepted
**Date:** 2026-03-26
**Sprint:** 014
**Issues:** #241, #237, #235
**Depends on:** Design 021, Design 019, ADR 022

---

## Purpose

Resolve the 7 open architecture questions from Sprint 014 to unblock SSoT implementation (#237). This document records binding decisions — not exploration (see Design 021 for the full multi-tenant strategy).

---

## Three-Layer Model (Binding)

```
┌─────────────────────────────────────────────────────┐
│  L1: BrickOS Platform (sovereign authority)          │
│  license_tiers (product_key scoped)                  │
│  product_features → tier_features                    │
│  Defines ALL tiers, features, pricing, rules.        │
├─────────────────────────────────────────────────────┤
│  L2: Organization (billing anchor)                   │
│  organizations → org_members → roles                 │
│  An org subscribes to a tier per product.            │
│  Billing entity. Personal orgs are implicit.         │
├─────────────────────────────────────────────────────┤
│  L3: App (enforcement + display)                     │
│  user_licenses → tier.rs → check_feature()           │
│  Each app reads its product's tier config from L1,   │
│  enforces at runtime, displays on website.           │
└─────────────────────────────────────────────────────┘
```

---

## Decision 1: `license_tiers` gets `product_key`

**Decision:** Add `product_key VARCHAR(50) NOT NULL DEFAULT 'sovereign-health'` to `license_tiers`.

**Rationale:**
- Current tiers (Glimpse→Horizon) are health-specific. A future Finance app may have different tiers.
- Adding `product_key` now is cheap (default covers all existing rows). Removing it later is expensive.
- Composite uniqueness: `UNIQUE (slug, product_key)` — same slug can exist per product.

**Migration:**
```sql
ALTER TABLE license_tiers ADD COLUMN IF NOT EXISTS product_key VARCHAR(50) NOT NULL DEFAULT 'sovereign-health';
ALTER TABLE license_tiers ADD CONSTRAINT uq_tier_slug_product UNIQUE (slug, product_key);
```

**Impact on tier.rs:** Add `product_key` filter to all `license_tiers` queries. Use config/env var `PRODUCT_KEY=sovereign-health` so each app binary knows its product.

---

## Decision 2: `tier_features` is THE enforcement source

**Decision:** `tier.rs` enforcement reads from `tier_features` + `product_features`, NOT from `license_tiers` columns.

**Current state:** `get_user_tier()` reads 30+ columns from `license_tiers` (booleans, ints). Website reads from `tier_features` via API. These drift.

**Target state:**
```
tier_features (DB)
  ├── tier.rs: check_feature(user, "csv_export") → query tier_features
  ├── GET /api/tiers/features → same table
  ├── website/data/tiers.json → generated from same table
  └── Excel calculator (#251) → same numbers
```

**Migration path (incremental, not big-bang):**
1. Add `check_tier_feature()` function that reads from `tier_features`
2. Migrate enforcement callers one-by-one from column reads to `check_tier_feature()`
3. Keep `license_tiers` columns as fallback during transition
4. After all callers migrated: deprecate columns (do NOT delete — backward compat for rollback)

**New function signature:**
```rust
pub async fn check_tier_feature(
    pool: &PgPool,
    tier_slug: &str,
    feature_key: &str,
) -> Result<TierFeatureCheck, AppError> {
    // Returns: { included: bool, limit_value: Option<String> }
    // Query: tier_features JOIN product_features WHERE tier_key = $1 AND feature_key = $2
}
```

---

## Decision 3: Unified AI Credit Pool

**Decision:** Replace 9 per-agent `chat_*_monthly` columns with a single `ai_credits_monthly` in `tier_features`.

**Credit costs:**
| Action | Credits |
|--------|---------|
| General chat message | 1 |
| Trend analysis | 1 |
| Lab explanation | 1 |
| Diet/supplement/protocol chat | 1 |
| Smart lab import | 2 |
| Smart med import | 2 |
| Smart measurement import | 2 |

**Tier allocations (in `tier_features`):**
| Tier | Credits/month |
|------|--------------|
| Glimpse | 5 |
| Focus | 15 |
| Insight | 50 |
| Clarity | unlimited |
| Horizon | unlimited |
| Core | unlimited |

**Migration:**
1. Add `ai_credits_monthly` feature to `product_features`
2. Add per-tier values in `tier_features`
3. Modify `chat_agent_quota` table: add `credits_consumed` column (default 1)
4. `check_chat_quota()` → reads `ai_credits_monthly` from `tier_features`, sums `credits_consumed` from `chat_agent_quota`
5. Keep per-agent tracking for analytics (which agents are most used)

**Reset:** Lazy reset — on quota check, if `month_year < current_month`, reset count.

---

## Decision 4: Org is the billing anchor

**Decision:** The subscription/license is attached to the **organization**, not the individual user. Individual users are a special case (personal org, 1 member).

**Current state:** `user_licenses` has `user_id` FK. Billing is per-user.

**Target state (future, not this sprint):**
```sql
-- Future: org_licenses replaces user_licenses for org context
CREATE TABLE org_licenses (
    org_id UUID NOT NULL REFERENCES organizations(id),
    product_key VARCHAR(50) NOT NULL,
    tier_id UUID NOT NULL REFERENCES license_tiers(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    ...
    PRIMARY KEY (org_id, product_key)
);
```

**This sprint:** Keep `user_licenses` as-is. Document the target model. The personal org = implicit user license mapping works for now. Multi-org billing is Phase 3 of Design 021 (~4 months out).

**Why not now:** Changing the billing anchor requires Stripe org-level subscriptions, org context in JWT, and RLS org_id scoping — all Phase 1-2 work.

---

## Decision 5: Self-hosted modes

**Decision:** Three `SHI_MODE` values:

| Mode | Tier enforcement | License check | Who uses it |
|------|-----------------|---------------|-------------|
| `oss` | None (unlimited) | None | Self-hosters, developers |
| `saas` | Full (tier.rs) | None (Stripe) | Our hosted SaaS |
| `licensed` | License key defines limits | Ed25519 key validation | On-premise licensed customers |

**This sprint:** `oss` and `saas` already work. `licensed` mode is Phase 4 of Design 021 — document only, no implementation.

---

## Decision 6: Website reads from SSoT

**Decision:** Eliminate hardcoded pricing data. Three-step fix:

### Step A: Generate `tiers.json` from DB (this sprint — #237)
```bash
# New script: ops/generate-tiers-json.sh
# Queries tier_features via API, outputs website/data/tiers.json
curl -s https://api.sovereignhealth.io/api/tiers/features | \
  jq '[.data[] | {slug, name, tagline, prices, features_summary}]' > website/data/tiers.json
```

### Step B: Pricing page reads `tiers.json` (this sprint — #236)
- Remove hardcoded feature rows from `pricing/page.tsx`
- Read from generated `tiers.json` or fetch from API at build time
- Feature names/descriptions come from `product_features.name_en` / `name_de`

### Step C: Feature-details page already API-driven (done — ADR 022)
- `GET /api/tiers/features` → consumed by feature comparison page
- No changes needed here

---

## Decision 7: Enforcement completeness audit

**Decision:** Every `product_features` row with `status = 'active'` MUST have:
1. A `tier_features` row per tier defining `included` + `limit_value`
2. A corresponding enforcement check in `tier.rs` (for features that require enforcement)
3. A display entry on the website pricing page

**Audit approach (this sprint):**
```sql
-- Features in DB but NOT enforced in code:
SELECT pf.feature_key FROM product_features pf
WHERE pf.status = 'active'
  AND pf.feature_key NOT IN (/* list from grep -r check_feature tier.rs */);
```

Not all features need runtime enforcement (e.g., "priority_support" is a service commitment, not code). Mark non-enforced features with a `enforcement_type` of `display_only` vs `runtime`.

---

## Data Flow Diagram (Final)

```
                    ┌──────────────────────────┐
                    │  L1: BrickOS Platform DB  │
                    │                          │
                    │  license_tiers           │
                    │    + product_key          │
                    │  product_features         │
                    │  tier_features            │
                    └────────┬─────────────────┘
                             │
              ┌──────────────┼──────────────────┐
              │              │                   │
              ▼              ▼                   ▼
    ┌──────────────┐ ┌──────────────┐  ┌───────────────┐
    │ tier.rs      │ │ GET /api/    │  │ tiers.json    │
    │ enforcement  │ │ tiers/       │  │ (generated)   │
    │              │ │ features     │  │               │
    │ check_tier_  │ │              │  │ pricing/      │
    │ feature()    │ │ feature-     │  │ page.tsx      │
    │              │ │ details page │  │               │
    │ check_chat_  │ │ (frontend)   │  │ website       │
    │ quota()      │ │              │  │ pricing page  │
    └──────────────┘ └──────────────┘  └───────────────┘
         L3: App          L3: App         L3: Website
```

---

## What Changes This Sprint vs. Later

| Change | This Sprint (014) | Phase 1-2 (Design 021) |
|--------|------------------|----------------------|
| `product_key` on `license_tiers` | Add column + default | Multi-product queries |
| `tier_features` as enforcement source | New `check_tier_feature()` | Migrate ALL callers |
| AI credit pool | Migration + tier.rs refactor | Analytics dashboard |
| Org billing anchor | Document decision only | `org_licenses` table + Stripe |
| `SHI_MODE=licensed` | Document decision only | License key crate + validation |
| Website SSoT | Generate `tiers.json` from DB | API-driven build-time fetch |
| Enforcement audit | Manual grep + SQL | Automated CI check |

---

## References

- Design 016: Licensing strategy (AGPL + dual-license)
- Design 019: Website & tier consistency (3-phase fix)
- Design 021: Multi-tenant platform offering (full roadmap)
- ADR 022: Tier features database-driven
- Sprint 014: User journeys (individual, clinic, white-label)
