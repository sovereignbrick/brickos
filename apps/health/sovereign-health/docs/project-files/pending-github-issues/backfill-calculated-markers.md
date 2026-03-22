---
title: "feat: Admin endpoint to backfill calculated markers from existing measurements"
milestone: "Infrastructure & Chores"
milestone_number: 20
status: pending
issue_number: null
---

## Context

Calculated markers (GKI, Dr. Boz Ratio, BMI, WHtR, HOMA-IR, TG/HDL, HCT/HB) are only computed when measurements are submitted via the API (`POST /measurements`). Data seeded directly into the DB (demo profiles, migrations, imports that bypass the calculation step) will have missing calculated values.

## Requirements

- `POST /admin/backfill-calculated-markers` endpoint (admin only)
- Scans all measurements for matching input pairs (e.g., glucose+ketones at same timestamp)
- Computes calculated marker values using `services/calculated.rs`
- Inserts missing values into `calculated_marker_values` (ON CONFLICT DO NOTHING)
- Returns count of values created per marker
- Should handle encrypted values (decrypt before computation)

## Current Workaround

Manual SQL backfill as postgres superuser for unencrypted demo data only.

## Files

- `api/src/services/calculated.rs` — computation logic
- `api/src/handlers/measurements.rs` — current trigger point (line 220)
