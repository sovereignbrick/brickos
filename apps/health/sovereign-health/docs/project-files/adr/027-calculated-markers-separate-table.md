# ADR 027: Calculated markers stored in separate table from measurements

**Status:** Accepted
**Date:** 2026-03-08 (documented 2026-04-05)
**Context:** Original architecture decision, reinforced by Sprint 023 bug discovery

## Context
The platform has two types of markers: standard markers (glucose, ketones, weight, etc.) measured by devices or labs, and calculated markers (GKI, BMI, WHtR, HOMA-IR, etc.) derived from formulas over standard markers. The question was whether to store calculated values in the same `measurements` table or a separate `calculated_marker_values` table.

## Decision
Calculated marker values are stored in a **separate table** `calculated_marker_values` with its own schema:
- Links to `calculated_markers` table (not `markers`)
- Stores computed `value`, `status`, `protocol_tag`, `fasting_protocol`
- No device/lab/lifestyle fields (calculated values have no device)
- Separate `is_demo` and `demo_profile` columns for demo data

Any endpoint that looks up a marker by slug MUST check BOTH tables using `UNION ALL` or an `is_calculated` branch.

## Alternatives Considered
- **Single measurements table**: Rejected -- calculated values have no device, no unit conversion, no lifestyle context. Forcing them into the measurements schema would require nullable FK to either `markers` or `calculated_markers`, creating ambiguity
- **Computed views (no storage)**: Rejected -- calculating GKI/BMI on every dashboard load is expensive. Caching computed values enables fast zone status summaries

## Consequences
- Clean separation: measurements table stays focused on raw device/lab data
- Every handler that displays marker data must handle both tables -- this is the main maintenance cost
- **Sprint 023 bug**: `marker_measurements` endpoint only queried `measurements`, returning empty for all 8 calculated markers. The `marker_trend` and `demo_marker_measurements` endpoints correctly handled both tables. Inconsistency went unnoticed because trend charts worked while "Recent Measurements" was empty.
- **Rule**: When adding any marker-related endpoint, always grep for existing patterns that handle `is_calculated` and follow the same pattern. The CLAUDE.md documents this: "Calculated markers use a SEPARATE table. Any endpoint that looks up a marker by slug MUST check BOTH tables."
