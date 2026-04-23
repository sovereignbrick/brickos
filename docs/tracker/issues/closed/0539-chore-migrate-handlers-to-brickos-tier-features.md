---
number: 539
title: "chore: migrate SHI handlers from public.tier_features to brickos.tier_features"
milestone: "Sprint 043 -- SHI Production Push"
labels: [licensing, chore, refactor, architecture]
created: 2026-04-18
priority: P2
estimate: 1d
blocked_by: []
---

## Context

Sprint 043 Phase A investigation (2026-04-18) revealed that the SHI
handler feature gating uses a different code path than the Sprint 040
#467 shadow refactor targeted:

| Path | Function | Table | Status |
|---|---|---|---|
| **Live (handlers)** | `check_tier_feature` (tier.rs:1168) | `public.product_features` + `public.tier_features` (via `load_tier_features` at tier.rs:1050) | Active, all handlers use this |
| **Dead (shadow)** | `check_feature` (tier.rs:277) | `brickos.tier_features` (via `check_feature_via_brickos_tier_features` at tier.rs:358) | Zero callers, dead code |

The `brickos.tier_features` table (156 rows, namespaced `shi.*` slugs)
was seeded in Sprint 040 #463/#467 and is queried by
`brickos-licensing::EmbeddedProvider::tier_features()` at
`crates/brickos-licensing/src/embedded.rs:81`. It is the intended
long-term SSoT for cross-app feature gating.

However, no SHI handler currently consumes it. The handlers go through
`check_tier_feature` -> `load_user_features` -> `load_tier_features`,
which queries `public.product_features` JOIN `public.tier_features`
(the codified migration tables from Sprint 042 #527).

## What needs to happen

Migrate `load_tier_features` (tier.rs:1050) to query
`brickos.tier_features` instead of `public.product_features` JOIN
`public.tier_features`. This is the real cutover that Sprint 040 #467
was building toward.

### Key differences between the two tables

| Aspect | `public.tier_features` | `brickos.tier_features` |
|---|---|---|
| Feature key format | `csv_export` (short) | `shi.csv_export` (namespaced) |
| Join required | Yes (`product_features.id = tier_features.feature_id`) | No (flat `tier_slug + feature_slug`) |
| Tier key column | `tier_key` (string) | `tier_slug` (string) |
| Limit support | `limit_value` column | `limit_value` column |
| Cross-app ready | No (SHI-specific) | Yes (namespace prefix) |
| Row count | ~80 | 156 |

### Migration steps

1. **Verify data parity**: compare `public.tier_features` JOIN
   `public.product_features` against `brickos.tier_features` for all
   SHI tiers. Every `feature_key` in public must have a matching
   `shi.{feature_key}` in brickos with the same `included` and
   `limit_value`.

2. **Update `load_tier_features`** (tier.rs:1050): change the SQL from
   the JOIN query to a direct query against `brickos.tier_features`
   with `WHERE tier_slug = $1 AND feature_slug LIKE 'shi.%'`. Strip
   the `shi.` prefix when building the HashMap keys so downstream
   callers (which use short keys like `csv_export`) continue to work.

3. **Update `find_required_tier`** if it queries `public.tier_features`.

4. **Shadow-mode validation**: add a temporary comparison (log
   divergences between old and new query results) before flipping.

5. **After validation**: drop `public.product_features` and
   `public.tier_features` (the codified migration's tables).

### Callers that must keep working

```
handlers/export.rs:31      -- check_tier_feature(pool, uid, "csv_export")
handlers/export.rs:380     -- check_tier_feature(pool, uid, "csv_export")
handlers/settings.rs:847   -- check_tier_feature(pool, uid, "custom_thresholds")
handlers/settings.rs:927   -- check_tier_feature(pool, uid, "custom_thresholds")
handlers/reports.rs:665    -- check_tier_feature(pool, uid, "json_export")
handlers/license.rs:39-41  -- direct SQL reading boolean columns
handlers/license.rs:121-131 -- building JSON response with feature booleans
```

### What NOT to change

- `brickos.tier_features` table shape -- it's also consumed by
  `brickos-licensing::EmbeddedProvider`
- `licensing_facade::legacy_to_namespaced` -- still useful for the
  mapping and can be reused in `load_tier_features`
- `handlers/license.rs` tier listing endpoint -- may need its own
  migration to read from `brickos.tier_features` instead of direct
  `license_tiers` column reads

## Acceptance criteria

- [ ] `load_tier_features` queries `brickos.tier_features`
- [ ] All `check_tier_feature` callers pass with no behavior change
- [ ] `check_tier_limit` callers pass with no behavior change
- [ ] Shadow comparison shows zero divergences on staging over 1h
- [ ] `public.product_features` + `public.tier_features` dropped
- [ ] 141+ backend lib tests pass
- [ ] cargo clippy clean

## Risk

MEDIUM. The `public.*` tables and `brickos.*` table may have data
drift (features added to one but not the other). Step 1 (data parity
check) catches this before any code change.

## References

- Sprint 040 #467 (shadow refactor setup)
- Sprint 042 #527 (codified migration keeping public tables alive)
- `crates/brickos-licensing/src/embedded.rs:81` (EmbeddedProvider consumer)
- `apps/health/sovereign-health/api/src/services/tier.rs:1050` (load_tier_features)
