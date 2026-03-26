---
number: 264
github_number: 262
title: "feat: demo mode should compute calculated markers at runtime, not from pre-seeded values"
labels: [feat, backend, demo, data-integrity]
milestone: health-intelligence
---

## Problem

Demo mode uses pre-seeded values in `calculated_marker_values` for computed markers (GKI, BMI, WHtR, HOMA-IR, etc.). This differs from production behavior where calculated markers are computed at runtime via `enrich_with_latest_values()` + `compute_calculated_markers()` when measurements are submitted.

This discrepancy means:
1. Demo doesn't exercise the same code path as real users
2. If calculation formulas change, demo shows stale values until someone manually re-seeds
3. Bugs in the computation pipeline won't surface in demo testing
4. Demo can't be used to reliably validate calculated marker behavior

## Current Behavior

- Production: user submits measurements -> `measurements.rs` calls `enrich_with_latest_values()` -> `compute_calculated_markers()` -> inserts into `calculated_marker_values`
- Demo: SQL migration pre-computes values and inserts them directly into `calculated_marker_values` with `is_demo = true`

## Desired Behavior

Demo computed markers should use the same runtime pipeline as production:

1. `demo_zone_detail()` handler fetches raw demo measurements
2. Calls `enrich_with_latest_values()` with demo user context
3. Calls `compute_calculated_markers()` with the enriched values
4. Returns computed results (no pre-seeded `calculated_marker_values` needed for demo)

OR: add an admin endpoint to re-compute demo calculated markers on demand.

## Proposed Solutions

### Option A: Compute on the fly in demo handlers
- `demo_zone_detail()` reads raw demo measurements, runs formulas, returns results
- No storage needed -- compute fresh every request
- Pro: always up to date, same formulas as production
- Con: slightly more computation per request (acceptable for demo)

### Option B: Admin recalculation endpoint
- `POST /admin/demo/recalculate` -- runs the production computation pipeline against demo data
- Stores results in `calculated_marker_values` (same as production)
- Run after every seed migration or formula change
- Pro: stored values = fast reads, same storage pattern as production
- Con: still a separate code path, can go stale

### Option C: Seed via application code, not SQL
- Instead of SQL INSERT, seed demo data by calling the API endpoints
- Register demo user -> submit measurements via API -> app computes markers
- Pro: exercises the full stack end-to-end
- Con: requires running application during seeding, slower

## Recommendation

**Option A** for zone detail display (lightweight, always current) + **Option B** for admin tooling (re-seed on demand after formula changes).

## Requirements

- [ ] Demo zone detail computes calculated markers at runtime using production formulas
- [ ] Add `POST /admin/demo/recalculate` endpoint
- [ ] Remove pre-seeded `calculated_marker_values` for demo profiles (or keep as fallback)
- [ ] Verify: change a formula -> demo immediately reflects the change
- [ ] Test all 3 profiles: optimized, average, at_risk
