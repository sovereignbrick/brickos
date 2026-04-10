---
number: 490
title: "chore: licensing dead code cleanup after #467 stabilization"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-b, chore, cleanup, refactor]
created: 2026-04-10
priority: P2
sprint: 040
phase: B
design: 022
estimate: 0.75d
blocked_by: [467, 468]
---

Dead code cleanup deferred from Sprint 040 #467 part 3 (canonical path
flip in `tier::check_feature`). Each item below is **strict reduction
only** -- no behavior change, just removal of code that's been replaced
by the brickos-licensing crate.

## Pre-flight requirements

Before any of these deletions ships:

1. `LICENSING_USE_NEW_PATH=1` must run clean on staging for at least
   one full smoke checklist cycle (~2-4 hours).
2. The `tier_feature_matrix_test` (both SHI-side and brickos-side)
   must show **zero divergences** between the legacy and new paths.
3. The shadow mode logs (`tracing::error` "LICENSING DIVERGENCE")
   must show zero events over the same window.

If any of those checks fail, the deletion is unsafe -- investigate
the divergence first.

## What to delete (with file:line refs)

### 1. Legacy match-arm in `tier::check_feature`

**File:** `apps/health/sovereign-health/api/src/services/tier.rs`
**Lines:** ~287-310 (the legacy block + the dual-path eval logic)
**Replacement:** `check_feature_via_brickos_tier_features` (already
  shipped in #467 part 3)

After deletion, `check_feature` becomes a thin wrapper around the
brickos.tier_features query plus the upgrade-required error mapping.
The 3-state evaluation collapses to a 1-state evaluation (the new
path is unconditional). The `LICENSING_SHADOW_MODE` and
`LICENSING_USE_NEW_PATH` env vars become no-ops and can be removed.

```rust
// Becomes (~25 lines):
pub async fn check_feature(pool, user_id, feature_name) -> Result<(), AppError> {
    let tier_slug = get_user_tier_slug(pool, user_id).await?;
    let allowed = check_feature_via_brickos_tier_features(pool, &tier_slug, feature_name).await?;
    if allowed { Ok(()) }
    else {
        let required = required_tier_for_feature(feature_name);
        let msg = upgrade_message(feature_name, &required);
        Err(AppError::UpgradeRequired(Box::new(
            TierError::upgrade_required(feature_name, &tier_slug, &required, &msg),
        )))
    }
}
```

### 2. SHI-specific boolean columns on `license_tiers`

**Schema file:** new migration -- e.g.
  `apps/health/sovereign-health/api/migrations/20260415000001_drop_legacy_tier_booleans.sql`
**Columns to drop on `license_tiers`** (currently 11):

- `csv_export`
- `json_export`
- `custom_thresholds`
- `lifestyle_presets`
- `protocol_comparison`
- `body_composition`
- `supplement_marker_impact`
- `ai_dashboard_insights`
- `cohort_comparison`
- `mfa_totp`
- `api_access`

These are the boolean columns from sprint 011's
`20260310000035_batch17_licensing.sql`. After #467 part 3 fully ships
and the legacy match-arm is gone (item 1 above), these columns are
referenced by zero callers. The canonical source is
`brickos.tier_features`.

**Caveat:** the SHI website's pricing page may still query these
columns directly via the `/api/v1/license/tiers` endpoint. Verify
`handlers/license.rs` and the `services/tier.rs::load_tier_features`
function don't reference them before dropping. If they do, migrate
those queries to `brickos.tier_features` first.

### 3. `TierLimits` struct boolean fields

**File:** `apps/health/sovereign-health/api/src/services/tier.rs`
**Lines:** ~25-65 (the `TierLimits` struct definition)

The struct has 11 `pub csv_export: bool` etc. fields that mirror the
license_tiers columns from item 2. After the columns are dropped, the
struct fields can go too. Any callers of `TierLimits` that read these
fields must first migrate to `check_feature(...)` or
`brickos_licensing::has_feature(...)`.

**Verification:** `grep -rn "tier\.\(csv_export\|json_export\|...\)"
apps/health/sovereign-health/api/src/` -- expect zero matches before
deletion.

### 4. Legacy `get_user_tier()` column reads

**File:** `apps/health/sovereign-health/api/src/services/tier.rs`
**Lines:** ~137-220 (the SQL query in `get_user_tier`)

The function reads all 11 boolean columns + the numeric limit columns.
After items 2 and 3 are done, the SQL query simplifies to just reading
`status, grace_period_ends, previous_tier_slug, downgraded_at, admin_override`
(the lifecycle fields, NOT the tier feature flags).

**Note:** `get_user_tier_slug` (the simpler helper that just returns
the tier slug string) is still needed and stays. Don't confuse it
with `get_user_tier`.

### 5. `GLIMPSE_MARKERS` hardcoded const

**File:** `apps/health/sovereign-health/api/src/services/tier.rs`
**Lines:** 12-21

```rust
pub const GLIMPSE_MARKERS: &[&str] = &[
    "glucose", "ketones", "bp_systolic", "bp_diastolic",
    "heart_rate", "weight", "chol_total", "hba1c",
];
```

**Replacement:** the active vs preserved markers system from issue
#468 (`user_markers.is_active` column + UI picker). After #468 ships,
`check_marker_access` reads from `user_markers.is_active` instead of
the hardcoded list, and the const can be deleted.

**This is the bug** that the matrix test caught with the truth-table
mismatch -- the const promises "8 specific markers" but the canonical
seed says Glimpse = 10 markers. #468 closes the gap.

### 6. Deprecated extractors `OrgTechAdmin` and `OrgCommercialAdmin`

**File:** `apps/health/sovereign-health/api/src/middleware/auth.rs`
**Lines:** ~158-220 (both struct definitions + impl FromRequest blocks)

After Sprint 040 #463 (roles 5->3 consolidation), these extractors
match only `"org_owner"` -- functionally identical to `OrgAdmin`. They
were marked `#[deprecated]` and kept for call-site compatibility.

To delete:
1. Find every callsite: `grep -rn "OrgTechAdmin\|OrgCommercialAdmin"
   apps/health/sovereign-health/api/src/handlers/`
2. Replace each with `OrgAdmin`
3. Remove the struct + impl blocks from auth.rs
4. Remove the `#[allow(deprecated)]` annotations
5. Run cargo check + tests

Estimated callsite count from the original audit: ~3-5 handlers use
each extractor. Mechanical replace.

### 7. Legacy SHI `product_features` + `tier_features` tables

**File:** new migration in
  `apps/health/sovereign-health/api/migrations/20260415000002_drop_legacy_product_features.sql`
**Tables to drop in SHI database** (NOT brickos schema):

- `public.product_features` (created in
  `20260312000053_product_and_tier_features.sql`)
- `public.tier_features` (same migration; same name as
  brickos.tier_features but lives in SHI's public schema)
- `public.app_tier_names` (created in `20260408000003_platform_tier_system.sql`)
- The SQL function `check_tier_limit(p_app_key, p_tier_slug, p_feature_key)`
  (also in 20260408000003) -- a helper function that's now redundant

**Caveat:** verify the SHI tier API endpoints (`handlers/license.rs`,
`handlers/tier.rs` if it exists) don't read from these tables before
dropping. The website tier comparison page may still call them; that
needs to be migrated to read from `brickos.tier_features` first.

### 8. Stale `chat_agent_quota` per-tier columns

**File:** `apps/health/sovereign-health/api/src/services/tier.rs`
(the `check_chat_quota` function and the columns it reads)

The migration `20260326000003_ai_credit_pool.sql` introduced a
unified credit pool but kept `chat_agent_quota` "for per-agent
analytics". After Sprint 040 #472 (AI chat hard daily ceiling) and
the planned analytics migration, these per-agent quota tracking
rows may also be reducible. **Out of scope for #490** -- separate
investigation.

## Test plan

After each deletion above, run:

```bash
cargo check --workspace
cargo clippy -p sovereign-health-backend --all-targets -- -D warnings
cargo test -p sovereign-health-backend --lib
cargo test -p sovereign-health-backend --test smoke
cargo test -p sovereign-health-backend --test integration

# With a SHI dev DB available:
TEST_DATABASE_URL=... cargo test -p sovereign-health-backend --test tier_feature_matrix_test
TEST_DATABASE_URL=... cargo test -p brickos-licensing --test embedded_runtime
```

All must remain green. Any divergence is a real regression.

## Sequencing

Items in order of safety (do them in this order):

1. **Item 6** (deprecated extractors) -- mechanical, safest, smallest
   blast radius. Could ship today if desired.
2. **Item 1** (legacy match-arm) -- requires shadow mode validation first.
3. **Item 3** (TierLimits boolean fields) -- requires item 1.
4. **Item 4** (get_user_tier column reads) -- requires item 3.
5. **Item 2** (drop license_tiers boolean columns) -- requires items
   1-4 + verification that no callers read them.
6. **Item 5** (GLIMPSE_MARKERS) -- requires #468 to ship first.
7. **Item 7** (drop SHI public.product_features + tier_features) --
   requires items 1-5 done, verification that no SHI handler reads
   them, AND that the SHI website tier API has been migrated.
8. **Item 8** (chat quota analytics) -- separate investigation, may
   not be reducible.

## Risk

LOW per item. Each deletion is a strict reduction with the safety net
already in place (#470 matrix tests). The risk is in the SEQUENCING --
deleting items out of order can leave dangling references that the
compiler catches but require an extra debug round.

The brickos-side matrix test (in `embedded_runtime.rs`) covers the
canonical truth table independent of SHI's tier.rs, so it stays green
through all deletions and is the regression anchor.

## References

- design 022 §13.5 M1 (facade), §13.5 M2 (shadow mode)
- Sprint 040 #467 part 3 commit message (where deletion was deferred)
- Sprint 040 lessons doc -- entry for the matrix-caught bug on first run
