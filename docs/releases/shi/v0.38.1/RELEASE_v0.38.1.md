# Sovereign Health Intelligence v0.38.1

**Date:** 2026-04-07
**Sprint:** 029 (hotfix)
**Type:** Bugfix release

## Summary

Hotfix release fixing a unit conversion bug in the reference range display on marker detail and trend chart pages. No new features.

## Bug Fixes

### Reference Range Double Unit Conversion (#0330)

When a user's preferred unit differed from the canonical unit (e.g., glucose in mg/dL vs canonical mmol/L), the trend chart reference range bands displayed at wildly incorrect values (e.g., 1100-1650 instead of 63-126 mg/dL on the Y-axis).

**Root cause:** The Settings > Reference Ranges page's `handleUnitChange` function converted threshold values to the display unit AND saved those converted values to the DB. Since the DB has no unit column, the API always returned them tagged as canonical. The marker detail page then converted them again via `displayValue()`, causing double conversion.

**Fix:**
- `thresholds-tab.tsx`: Removed bulk save of converted values from `handleUnitChange`. DB now always stores canonical units. Updated `displayValue` and `toCanonical` to handle MARKER_UNIT_MAP conversions for display and reverse.
- `markers/[markerId]/page.tsx`: Added `convertRange()` helper so the RangeBar displays values in the user's preferred unit.

### One-time Migration

Migration `20260407000001_fix_reference_ranges_unit_corruption.sql` reverses the double conversion for all user-customized reference ranges on staging/dev. Production was not affected.

## Other Changes

- Clippy fix in `sovereign-link/src/handlers/branding.rs` (needless borrow)
- Clippy fix in `brickos-crypto/src/lib.rs` (unnecessary to_owned)
- Added affiliate API curl tests to `tests/cross-app-integration.sh` (4 new checks: affiliate info, conversions, vanity check, PII audit)
- Updated test plan measurement count from incorrect ~3,436 to ~305 per profile

## Database Migrations

| Migration | Description |
|---|---|
| 20260407000001 | Fix reference range unit corruption (staging/dev only) |

## Tests

| Suite | Result |
|---|---|
| Platform smoke (staging) | 17/17 passed |
| Platform DB integrity (staging) | 23/23 passed |
| Cross-app integration (staging) | All passed |
| Frontend build | Clean (tsc + next build) |
| cargo fmt + clippy | Clean |

## Files Changed

| File | Change |
|---|---|
| `frontend/src/app/settings/components/thresholds-tab.tsx` | Fix: store canonical, convert for display only |
| `frontend/src/app/markers/[markerId]/page.tsx` | Fix: convert RangeBar values to preferred unit |
| `api/src/lib.rs` | Version bump 0.38.0 -> 0.38.1 |
| `api/Cargo.toml` | Version bump 0.38.0 -> 0.38.1 |
| `api/migrations/20260407000001_*` | One-time data fix migration |
| `tests/cross-app-integration.sh` | Added affiliate API tests |
| `sovereign-link/src/handlers/branding.rs` | Clippy fix |
| `brickos-crypto/src/lib.rs` | Clippy fix |

## New Issues Filed

| # | Title | Priority |
|---|-------|----------|
| 0330 | fix: trend chart reference range double unit conversion | P1 (fixed) |
| 0331 | feat: QR code beautification with BrickOS brick logo | P2 |
| 0332 | fix: user-facing /api/v1/links missing click counts | P2 |
| 0333 | fix: click tracking empty country_code and referrer | P2 |
| 0334 | feat: admin service dashboard with health monitoring | P1 |
