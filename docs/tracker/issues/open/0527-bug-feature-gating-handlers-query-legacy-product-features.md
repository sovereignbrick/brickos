---
number: 527
title: "bug: [P0] feature-gating handlers still query legacy product_features/tier_features shape"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [bug, p0, sprint-041, sprint-042, technical-debt]
created: 2026-04-11
priority: P0
discovered_by: 526
related: [460, 463, 467, 568]
---

## Summary

Sprint 040 #467 redesigned the licensing schema, replacing the legacy
`product_features` (UUID `id`, `feature_key`) + `tier_features` (`tier_key`, `feature_id` UUID FK)
with a new `brickos.tier_features` (`tier_slug`, `feature_slug`) shape that
no longer has a `product_features` table at all. **The Rust handlers were
never updated.** They still query the legacy shape at 11 sites:

- `apps/health/sovereign-health/api/src/handlers/features.rs:125,147,232,283,427,544`
- `apps/health/sovereign-health/api/src/handlers/license.rs:56,349,361`
- `apps/health/sovereign-health/api/src/services/tier.rs:1065,1223`

On dev this kept working invisibly because dev still has the legacy tables
in the public schema (seeded by old migrations + the bootstrap migration's
reconciliation block). On **staging** the bootstrap migration renamed the
legacy tables aside to `*_legacy_sprint040` to avoid CREATE TABLE conflicts
with the new `brickos.tier_features`, which left the handlers querying a
table that no longer existed under its canonical name.

Result: every feature-gated endpoint 500'd on staging during Sprint 041
manual testing, including:

- **Smart Import for Medications** (and presumably all "smart" import flows)
- **Dr. Alex chat** (menus and chat itself)
- Probably more -- any flow that runs `is_feature_enabled(...)` or `get_tier_features(...)` before doing its work

## Reproduction

1. Cold-boot staging post the brickos-db migration 001 SET SCHEMA + the
   Sprint 041 bootstrap reconciliation block
2. Log in as `demo@sovereignhealth.io / SovereignDemo1` on
   `https://demo.sovereignhealth.io`
3. Navigate to `/medications` -> Smart Import -> any smart action
4. Result: `{"data":null,"error":{"code":"internal_error","message":"Internal server error"}}`
5. Backend log shows `relation "product_features" does not exist` (Postgres 42P01)

## Staging hotfix already applied (2026-04-11)

Direct DB hotfix to unblock manual testing while the proper fix is scheduled:

```sql
ALTER TABLE brickos.product_features_legacy_sprint040 SET SCHEMA public;
ALTER TABLE public.product_features_legacy_sprint040 RENAME TO product_features;
ALTER TABLE brickos.tier_features_legacy_sprint040 SET SCHEMA public;
ALTER TABLE public.tier_features_legacy_sprint040 RENAME TO tier_features;
```

After the hotfix:
- `public.product_features` 48 rows
- `public.tier_features` 288 rows
- `brickos.tier_features` 156 rows (the new shape, untouched, waiting for the proper fix)

`search_path` is `public, brickos` so unqualified `FROM product_features` /
`FROM tier_features` resolves to `public.*` (legacy shape) and the 11 handler
sites work again. Verified: 0 fresh errors in `sh-staging-backend` logs after
the rename.

This hotfix is **staging-only**. It is not in any migration file. The proper
fix is to update the Rust handlers (option A below) and let the bootstrap
migration's rename-aside continue to be the dev/staging story.

## Proper fix (Sprint 042) -- REVISED 2026-04-11 after reading the code

The original plan was "update handlers to query the new
`brickos.tier_features` (tier_slug, feature_slug) shape". **That plan was
wrong.** Reading the actual handlers in features.rs / license.rs / tier.rs
shows they query columns the new shape doesn't have:

`product_features.feature_key`, `.name_en`, `.name_de`, `.description_en`,
`.description_de`, `.tooltip_en`, `.tooltip_de`, `.category`, `.sort_order`,
`.status`, `.icon`

The new `brickos.tier_features` schema has only `tier_slug` + `feature_slug`
+ `included` + `limit_value` + `limit_label_en/de` + timestamps. **No
feature metadata at all.** It's a tier-feature *mapping* table, not a
feature *catalog* table.

So the new shape is **incomplete** -- it can't replace the legacy. The
Sprint 040 #467 redesign migrated half the data model and stopped. The
new `brickos.tier_features` is unused dead code (156 rows seeded but
nothing queries it).

### Revised fix path

**Option C (correct) -- the legacy is canonical. Drop the dead new shape,
update the bootstrap migration to leave the legacy alone.**

1. Update `migrations/20260411000001_bootstrap_brickos_schema_for_dev.sql`
   reconciliation block: instead of `RENAME TO *_legacy_sprint040`, use
   `SET SCHEMA public` so the legacy tables move to where the search_path
   resolves them.
2. Remove the new-shape `CREATE TABLE brickos.tier_features` from the
   bootstrap migration entirely -- nothing queries it.
3. Drop the existing dead `brickos.tier_features` (new shape, 156 rows)
   on both dev and staging.
4. Drop the renamed-aside `*_legacy_sprint040` tables on staging once
   the SET SCHEMA approach replaces them.
5. **Touch zero Rust files.**
6. Re-run the bootstrap migration on staging (delete the
   `_sqlx_migrations` row first -- the same pattern used for the four
   modified migrations earlier in the sprint). On dev, since the legacy
   already lives in public, the SET SCHEMA blocks become no-ops via
   IF EXISTS guards.

This is **the smaller fix and the correct one**. Sprint 040 #467's
intent (move tier→feature mapping to slug-based) is good, but the work
to also migrate `product_features` to a slug-based catalog was never
done, so the new shape is half-built and unsafe to ship until that work
also lands.

### Original Option A (rejected)

Originally I thought "update the 11 handler sites to query the new
shape". This is wrong because the new shape is missing the feature
metadata columns. To make it work, we'd ALSO need to migrate
`product_features` to a new table (`feature_registry` or similar) with
slug-based identity, *and* migrate all the seed data, *and* migrate the
existing `tier_features` rows from feature_id UUID → feature_slug
namespaced. That's a multi-week piece of work, not a Sprint 042 chore.

### Why C is safe

- Dev never broke (legacy was always in public schema)
- Staging is currently working via the manual hotfix that does exactly
  what option C codifies
- Zero Rust changes -> zero risk of regressions in feature gating logic
- Sprint 040 #467's slug-based design is preserved as a future-work
  reference; nothing is deleted from history

### What option C does NOT solve

- The slug-based feature identifier *is* the right long-term direction.
  Option C explicitly defers that work. When it gets picked up
  (Sprint 04N+), the right approach is a coordinated migration that
  ships handler changes + schema changes + seed data + a backfill
  script in one PR, not piecemeal.

## Acceptance criteria

- [ ] All 11 handler sites updated to query `brickos.tier_features` directly
      (no `product_features` join)
- [ ] `cargo test --lib -p sovereign-health-backend` green
- [ ] Smart Import flow works on staging (medications + any other "smart" entry points)
- [ ] Dr. Alex chat menus + chat itself work on staging
- [ ] `/health` endpoint hit a feature-gated route 100x: 0 errors
- [ ] Staging hotfix tables (`public.product_features`, `public.tier_features`)
      dropped after the handlers no longer reference them
- [ ] Bootstrap migration's reconciliation block updated: it can now safely
      rename without leaving the system broken
- [ ] Memory `feedback_grep_schema_before_migration.md` updated with the
      "always grep handlers when renaming a table aside" lesson

## Why P0

Two visible customer-facing flows broken on staging immediately after
deploy. Any clinic operator walking the demo would hit this within 5 minutes.

## Related

- #460, #463, #467 (Sprint 040 licensing redesign that introduced the new shape)
- #568 (the bootstrap migration with the reconciliation block)
- memory `feedback_grep_schema_before_migration.md` (the rule that should have caught this)
- memory `feedback_dual_schema_fk_cleanup.md` (sibling lesson about dev vs staging schema divergence)
