---
number: 278
title: "fix: backfill calculated markers for historical measurements"
labels: [fix, backend, calculated-markers, priority-high, sprint-016]
milestone: health-intelligence
---

## Description

Calculated markers (Dr. Boz, GKI, BMI, WHtR, HOMA-IR, etc.) are only computed when new measurements are submitted via the API. Historical measurements imported or entered before the calculated marker system was deployed have no computed values.

Example: user helmut@schindlwick.com has 43 glucose and 27 ketone measurements, but only 9 Dr. Boz ratio values. 21 dates with both inputs have no computed Dr. Boz.

## Root Cause

`compute_calculated_markers()` is only called from `handlers/measurements.rs` during new measurement submission. Historical data was never processed.

## Complication

Measurement values are **encrypted** (AES-256-GCM) in `value_canonical`. A SQL-only backfill cannot read the values -- it must go through the application layer's `Encryptor`.

## Proposed Fix: Two-Part Strategy

### Part 1: Compute on import (proactive)

When a user imports data (lab PDF, CSV, manual entry), after storing the new measurements:

1. Collect ALL distinct timestamps for the user that include CALC_INPUT_SLUGS
2. For each timestamp: check if calculated_marker_values already exist
3. If not: run `enrich_with_latest_values()` + `compute_calculated_markers()`
4. Insert new computed values (upsert to avoid duplicates)

This means: importing ketone data today will retroactively compute Dr. Boz/GKI for all dates where glucose already existed.

Modify in `handlers/measurements.rs` (line ~259):
- After inserting new measurements, scan for ANY timestamps where new calc markers can now fire
- Not just the current submission timestamp, but any historical date that gained a new input

### Part 2: Admin backfill endpoint (one-time catch-up)

For users with existing historical data that was never processed:

```
POST /admin/backfill-calculated-markers?user_id={uuid}
```

Logic:
1. Fetch all distinct measurement timestamps for the user
2. For each: collect all marker values, decrypt via Encryptor
3. Call `enrich_with_latest_values()` + `compute_calculated_markers()`
4. Upsert into calculated_marker_values
5. Return count of new computed values

### Part 3: Prevent duplicates

- [ ] Add UNIQUE constraint: `(user_id, calculated_marker_id, measured_at)` on calculated_marker_values
- [ ] Change INSERT to upsert: `ON CONFLICT (user_id, calculated_marker_id, measured_at) DO UPDATE SET value = EXCLUDED.value, status = EXCLUDED.status`
- [ ] This makes all computation idempotent (safe to re-run)

## Requirements

- [ ] Part 1: Import triggers calc for all eligible historical timestamps
- [ ] Part 2: Admin backfill endpoint for catch-up
- [ ] Part 3: UNIQUE constraint + upsert logic
- [ ] Handles encrypted values via Encryptor
- [ ] Test: import ketones, verify Dr. Boz computed for old glucose dates
- [ ] Test: run backfill twice, verify no duplicates
