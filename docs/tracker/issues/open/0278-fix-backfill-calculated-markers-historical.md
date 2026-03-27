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

## Proposed Fix

Create an admin endpoint that re-processes calculated markers for a user:

```
POST /admin/backfill-calculated-markers?user_id={uuid}
```

Logic:
1. Fetch all measurement sessions (distinct timestamps) for the user
2. For each session: collect all marker values, decrypt them
3. Call `enrich_with_latest_values()` + `compute_calculated_markers()`
4. Insert results into `calculated_marker_values` (skip if already exists)
5. Return count of new computed values

## Also Fix

- [ ] Add UNIQUE constraint or upsert logic to prevent duplicate calculated_marker_values
  (same user + same calculated_marker_id + same measured_at should not have duplicates)
- [ ] Add deduplication on insert: `ON CONFLICT (user_id, calculated_marker_id, measured_at) DO UPDATE`

## Requirements

- [ ] Admin endpoint for backfill
- [ ] Handles encrypted values via Encryptor
- [ ] Idempotent (safe to run multiple times)
- [ ] Test with production user data
- [ ] Prevent future duplicates with DB constraint
