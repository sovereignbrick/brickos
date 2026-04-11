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

## Proper fix (Sprint 042)

Two paths, with strong preference for option A:

**Option A -- update the handlers to query the new shape (correct, scales).**
- Replace `JOIN product_features pf ON pf.id = tf.feature_id` with
  `... tf.feature_slug` (no join needed; the slug *is* the identifier)
- Replace `feature_id` UUID parameters with `feature_slug` String parameters
- Drop `product_features` from the schema entirely (it no longer has a
  reason to exist; the slug is the canonical identifier)
- Update any seed migrations that still write to `product_features`
- The new `brickos.tier_features` already has the right rows (156) -- it's
  just unused
- Touches ~11 SQL sites + their type signatures + their callers
- After this lands, drop the staging hotfix tables (`public.product_features`,
  `public.tier_features`)

**Option B -- restore the legacy schema as the canonical (regressive).**
- Make the bootstrap migration NOT rename product_features/tier_features
- Find another way to create `brickos.tier_features` without conflict (use
  a different name, or delete the legacy first)
- Keep the Rust handlers as-is
- Carries technical debt forward; loses the work in Sprint 040 #467

Recommend **Option A** because it completes the Sprint 040 #467 work that
was left half-finished, deletes a confusing legacy table, and removes the
"this works on dev but not staging" trap that bit us in Sprint 041.

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
