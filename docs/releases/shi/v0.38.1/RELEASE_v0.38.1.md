# Sovereign Health Intelligence v0.38.1

**Date:** 2026-04-07
**Sprint:** 029 (Day 10 - staging verification + hotfixes)
**Type:** Bugfix release

## Summary

Hotfix release from Sprint 029 staging verification. Fixed 4 bugs found during manual testing, added affiliate API tests to the test suite, and raised 8 new tracker issues.

## Bug Fixes

### 1. Reference Range Double Unit Conversion (#0330) - P1

When a user's preferred unit differed from canonical (e.g., glucose mg/dL vs mmol/L), the trend chart reference range bands displayed at wildly incorrect values (Y-axis scaling to ~2156 instead of ~150).

**Root cause:** Settings > Reference Ranges saved converted values to the DB. The API returned them tagged as canonical, causing double conversion.

**Fix:**
- `thresholds-tab.tsx`: DB always stores canonical; display/edit converts on the fly
- `markers/[markerId]/page.tsx`: RangeBar converts to preferred unit
- Migration `20260407000001`: reverses corrupted custom ranges on staging/dev

### 2. Stats Min/Avg/Max Not Converting Units

The Min/Avg/Max tiles on marker detail and trends pages displayed canonical values (mmol/L) instead of the user's preferred unit (mg/dL).

**Fix:** Both Statistics component and trends page stats now use `displayValue`/`formatDisplay`.

### 3. Measurement Values Not Converting Units

Recent measurements list on marker detail page and measurement detail page showed raw canonical values.

**Fix:** All measurement value displays now use `formatDisplay` for consistent unit conversion.

### 4. Demo Zone Detail 500 Error

Clicking any health zone in demo mode returned "Zone not found" due to a 500 error.

**Root cause:** `demo_zone_detail` handler cast encrypted `height_cm` column to `float8` in SQL, which failed on AES-encrypted values. Additionally, average/at_risk profiles had NULL `height_cm`, causing `UnexpectedNullError`.

**Fix:** Read as string, decrypt in Rust, handle NULL gracefully.

### 5. Demo Profile Trends Empty (#0335)

All demo profiles showed "No data in this range" on trend charts and empty Min/Avg/Max.

**Root cause:** Bulk demo measurements were tagged with `demo_profile` on the original `demo@sovereignhealth.io` user but never copied to the dedicated profile accounts (`optimized@`, `average@`, `atrisk@`).

**Fix:** Migration `20260407000002` copies measurements to the correct user accounts.

## Database Migrations

| Migration | Description |
|---|---|
| 20260407000001 | Fix reference range unit corruption (staging/dev only) |
| 20260407000002 | Reassign demo profile measurements to dedicated user accounts |

## Other Changes

- `cargo fmt` across workspace (sovereign-link, brickos-auth, brickos-db, brickos-crypto)
- Clippy fixes: needless borrow in branding.rs, unnecessary to_owned in crypto test
- Added 4 affiliate API tests to `tests/cross-app-integration.sh` (affiliate info, conversions, vanity check, PII audit)
- Updated test plan measurement count from incorrect ~3,436 to ~305 per profile
- Manual test plan fully signed off: PASS across all 5 areas

## Tests

| Suite | Result |
|---|---|
| Platform smoke (staging) | 17/17 passed |
| Platform DB integrity (staging) | 23/23 passed |
| Cross-app integration (staging) | All passed |
| Frontend TypeScript | Clean |
| Frontend build (next build) | Clean |
| cargo fmt + clippy | Clean |

## New Issues Filed

| # | Title | Priority |
|---|-------|----------|
| 0330 | fix: trend chart reference range double unit conversion | P1 (fixed) |
| 0331 | feat: QR code beautification with BrickOS brick logo | P2 |
| 0332 | fix: user-facing /api/v1/links missing click counts | P2 |
| 0333 | fix: click tracking empty country_code and referrer | P2 |
| 0334 | feat: admin service dashboard with health monitoring | P1 |
| 0335 | fix: demo profile trends no data | P1 (fixed) |
| 0336 | chore: fix Dependabot vulnerabilities | P2 |
| 0337 | feat: AI-agnostic provider settings | P2 |

## Files Changed

| File | Change |
|---|---|
| `frontend/src/app/settings/components/thresholds-tab.tsx` | Store canonical, convert for display only |
| `frontend/src/app/markers/[markerId]/page.tsx` | RangeBar + measurements + stats unit conversion |
| `frontend/src/app/trends/page.tsx` | Stats min/avg/max unit conversion |
| `frontend/src/app/measurements/[id]/page.tsx` | Measurement detail unit conversion |
| `api/src/handlers/demo.rs` | Decrypt height_cm, handle NULL |
| `api/src/lib.rs` | Version bump 0.38.0 -> 0.38.1 |
| `api/Cargo.toml` | Version bump 0.38.0 -> 0.38.1 |
| `api/migrations/20260407000001_*` | Fix corrupted reference ranges |
| `api/migrations/20260407000002_*` | Reassign demo profile measurements |
| `tests/cross-app-integration.sh` | Added affiliate API tests |
| `sovereign-link/src/handlers/branding.rs` | Clippy fix |
| `crates/brickos-crypto/src/lib.rs` | Clippy fix |
| `docs/sprint-planning/sprints/sprint-029-manual-test-plan.md` | Full sign-off |
| `docs/tracker/issues/open/0330-0337` | 8 new tracker issues |
