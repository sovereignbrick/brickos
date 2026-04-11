# Hotfix -- Sprint 041 #527 -- restore legacy product_features + tier_features

**Date applied:** 2026-04-11 ~16:43 CEST
**Environment:** staging (`sh-staging-db` on `72.61.154.115`)
**Issue:** [#527](../../tracker/issues/open/0527-bug-feature-gating-handlers-query-legacy-product-features.md)
**Codified in:** `apps/health/sovereign-health/api/migrations/20260411180000_sprint041_close_out_legacy_feature_tables.sql`

## What broke

The Sprint 041 bootstrap migration `20260411000001_bootstrap_brickos_schema_for_dev.sql` reconciliation block renamed `brickos.product_features` and the legacy `brickos.tier_features` (the `tier_key, feature_id` shape) aside as `*_legacy_sprint040` to free the names for the new `brickos.tier_features (tier_slug, feature_slug)` shape that `brickos-licensing::EmbeddedProvider` reads.

The trap: the SHI feature-gating handlers in `apps/health/sovereign-health/api/src/handlers/{features,license}.rs` and `services/tier.rs` still query the LEGACY shape directly. On staging, after the rename-aside, every feature-gated endpoint 500'd:

```
relation "product_features" does not exist
```

Visible breakage: Smart Import (medications), Dr. Alex chat menus + chat itself, `/measurements/new` validation, any tier check.

## What the hotfix did

Moved the renamed-aside legacy tables back to the `public` schema under their canonical names:

```sql
ALTER TABLE brickos.product_features_legacy_sprint040 SET SCHEMA public;
ALTER TABLE public.product_features_legacy_sprint040 RENAME TO product_features;
ALTER TABLE brickos.tier_features_legacy_sprint040 SET SCHEMA public;
ALTER TABLE public.tier_features_legacy_sprint040 RENAME TO tier_features;
```

After the rename, `search_path = "public, brickos"` resolves the unqualified `FROM product_features` queries to `public.product_features` (legacy shape, 48 rows) and the unqualified `FROM tier_features` queries to `public.tier_features` (legacy shape, 288 rows). The new `brickos.tier_features` (156 rows, new shape) is left untouched because `brickos-licensing::EmbeddedProvider::tier_features()` queries it explicitly with the `brickos.` schema prefix.

## How to re-apply (if staging is rebuilt before the codified migration is in place)

Bash script (run from your laptop):

```bash
#!/bin/bash
set -e
PSQL="docker exec sh-staging-db psql -U sovereign_health -d sovereign_health_staging -v ON_ERROR_STOP=1"

$PSQL -c "ALTER TABLE brickos.product_features_legacy_sprint040 SET SCHEMA public;"
$PSQL -c "ALTER TABLE public.product_features_legacy_sprint040 RENAME TO product_features;"
$PSQL -c "ALTER TABLE brickos.tier_features_legacy_sprint040 SET SCHEMA public;"
$PSQL -c "ALTER TABLE public.tier_features_legacy_sprint040 RENAME TO tier_features;"

# Verify
$PSQL -tAc "
SELECT 'public.product_features' AS rel, COUNT(*) FROM public.product_features
UNION ALL SELECT 'public.tier_features', COUNT(*) FROM public.tier_features
UNION ALL SELECT 'brickos.tier_features (untouched)', COUNT(*) FROM brickos.tier_features;
"
```

Expected output:
```
public.product_features|48
public.tier_features|288
brickos.tier_features (untouched)|156
```

## How to know if you need to apply this

- Frontend shows "Internal server error" on Smart Import or Dr. Alex chat
- Backend logs show `relation "product_features" does not exist` (Postgres 42P01)
- `_sqlx_migrations` does NOT have a row for version `20260411180000` (the codified fix)

If `_sqlx_migrations` does have the `20260411180000` row, the codified migration already ran and there's nothing to hotfix manually -- the bug should not be reproducing.

## How this gets retired

When Sprint 042 Phase A lands the proper schema cleanup (per #527 Option C in the revised plan), the `20260411180000` migration becomes the canonical source of the legacy table names, the bootstrap migration's reconciliation block is updated to do the work directly via `SET SCHEMA public` instead of `RENAME TO *_legacy_sprint040`, and this hotfix runbook can be marked obsolete.

## Related

- Sprint 041 retrospective: `docs/sprint-planning/retrospectives/2026-04-11_sprint-041-retro.md`
- Sprint 042 milestone (Phase A): `docs/tracker/milestones/sprint-042-shi-production-readiness.md`
- Memory: `feedback_never_ship_half_schema_migration.md`, `feedback_dual_schema_fk_cleanup.md`
