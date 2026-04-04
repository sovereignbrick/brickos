# Issue #311: Migration 20260326000001 fails -- encrypted value inserted as double precision

**Type:** bug
**Priority:** critical
**Component:** backend / migrations
**Found during:** staging ntfy alerts (2026-03-27)

## Description

Migration `20260326000001` fails on startup with:

```
error returned from database: invalid input syntax for type double precision:
"v1:xegj5FQ5hytLnzc9:gYCfJqpCFT36/iM1evy1fs5F5r1OUA=="
```

An encrypted value string (AES ciphertext with `v1:` prefix) is being inserted into or cast as a `double precision` column. This crashes the backend on every restart, triggering the watchdog auto-restart loop.

## Impact

- Staging backend crash loop (down → watchdog restart → migration fails → down)
- Blocks any deploy that includes this migration

## Root Cause

Migration `20260326000001_seed_calculated_markers_avg_atrisk.sql` seeds computed GKI, Dr. Boz, BMI, WHtR, and HOMA-IR values for the `average` and `at_risk` demo profiles. It queries `measurements.value_canonical` and casts to `::float8` (lines 42, 87, 129, 163, 199). But `value_canonical` contains AES-encrypted ciphertext (`v1:xegj5F...`), not raw numbers. Demo data is encrypted identically to production data.

## Fix

Replace all `ms.value_canonical::float8` LATERAL subqueries with hardcoded known demo values. The demo seed data is deterministic — the exact glucose, ketone, weight, waist circumference, and insulin values were set in earlier seed migrations. Compute the calculated markers from those known constants directly in SQL.

**Migration strategy:**
1. Delete the failed row from `_sqlx_migrations` on staging (migration never succeeded — crash loop means it was never marked as applied)
2. Replace the migration file content with hardcoded-value version
3. Re-deploy — migration applies cleanly

## Location

- Migration: `apps/health/sovereign-health/api/migrations/20260326000001_seed_calculated_markers_avg_atrisk.sql`
- Related: encrypted value storage in measurements table (`value_canonical` is TEXT containing AES ciphertext)
- Demo seed data: earlier seed migrations contain the known values to hardcode
