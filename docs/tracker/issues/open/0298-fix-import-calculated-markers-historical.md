# Issue #298: Import does not compute calculated markers for historical dates

**Type:** bug
**Priority:** high
**Component:** backend / import / calculated markers
**Found during:** v0.30.0 production testing (2026-03-28)

## Root Cause

When importing tabular data (CSV/ODS) with historical measurements, the import handler:

1. **Only computes calculated markers at `Utc::now()`** instead of at each imported measurement's timestamp. A user importing 6 months of glucose+ketone data gets exactly ONE GKI/Dr. Boz entry (at current time), instead of one per measurement date.

2. **Uses plain INSERT without ON CONFLICT** (import.rs:1857), so repeated imports or backfills create duplicate entries at slightly different millisecond timestamps. The single-measurement handler (measurements.rs:280) correctly uses `ON CONFLICT DO UPDATE`.

3. **`enrich_with_latest_values` is date-unaware** -- it fetches the single latest value per marker across all time, not the value at a specific date. This means the calculated marker computation uses the wrong input values for historical dates.

## Impact

- Calculated marker trend charts show only today's data point instead of full history
- Users must manually trigger admin backfill after every import
- Duplicate entries appear if import + backfill both run

## Location

- `apps/health/sovereign-health/api/src/handlers/import.rs` lines 1843-1870 (tabular import)
- `apps/health/sovereign-health/api/src/handlers/import.rs` lines 575-600 (lab import)

## Fix

After inserting all measurements, iterate through unique dates where calculated marker inputs exist (glucose+ketones, glucose+insulin, weight+height, etc.) and compute calculated markers per-date:

```
for each unique_date in imported_measurements:
    values_at_date = fetch values for all markers at this date
    computed = compute_calculated_markers(..., measured_at=unique_date)
    upsert each computed value with ON CONFLICT DO UPDATE
```

Also: change the INSERT to use `ON CONFLICT (user_id, calculated_marker_id, measured_at) WHERE is_deleted = false DO UPDATE SET value = EXCLUDED.value, status = EXCLUDED.status` to prevent duplicates.

## Workaround

Run admin backfill after import: `POST /admin/backfill-calculated-markers`
