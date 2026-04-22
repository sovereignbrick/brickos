# 0593 -- bug: /demo/zones summary under-reports "markers with data" for calc markers

**Type:** bug (counting logic)
**Priority:** P3 (cosmetic; no data corruption; zone detail still correct)
**Found:** Sprint 050 RC layer 6.1-6.3, 2026-04-22 by helmut
**Sprint target:** 051

## Observed

On `https://eval.sovereignhealth.io/` dashboard, the "energy_metabolic" zone card
reads 9/13 markers with data, even though three calculated markers (GKI,
Dr Boz Ratio, HOMA-IR) can be computed from glucose + ketones + insulin
values which ARE present in the demo seed.

Drilling into the zone detail page (`/demo/zones/energy_metabolic?profile=optimized`)
correctly shows the computed values:
  - gki         = 2.857   (red)
  - dr_boz_ratio = 51.43  (orange)
  - homa_ir     = 0.997   (green)
  - tyg_index   = None    (correctly, missing triglycerides)

So detail view is correct; summary view is wrong.

## Root cause

`src/handlers/demo.rs::demo_zones` SQL:

```sql
LEFT JOIN zone_markers zm ON zm.zone_slug = z.zone_slug
LEFT JOIN markers mk ON mk.marker_slug = zm.marker_slug    -- standard only
LEFT JOIN LATERAL (
    SELECT value_canonical as value, status FROM measurements
    WHERE user_id = $1 AND marker_id = mk.id ...
) latest ...
```

For calculated markers, `zm.marker_type = 'calculated'` but they live in the
`calculated_markers` table, not `markers`. The `LEFT JOIN markers mk` misses
them, `mk.id IS NULL`, the LATERAL measurement join returns nothing, and they
register as "no data" in `COUNT(DISTINCT CASE WHEN latest.value IS NOT NULL ...)`.

The counts in the dashboard zone cards are therefore a lower bound on what the
user could actually see, not the full picture.

## Fix

Option A (simplest): UNION the markers lookup with `calculated_markers`:

```sql
FROM zones z
LEFT JOIN zone_markers zm ON zm.zone_slug = z.zone_slug
LEFT JOIN (
    SELECT id, marker_slug FROM markers
    UNION ALL
    SELECT id, marker_slug FROM calculated_markers
) mk ON mk.marker_slug = zm.marker_slug
...
```

Plus run `compute_calculated_markers()` once for the demo user and join results
via a temp CTE for the value/status lookup (so summary counts reflect computed
values).

Option B: swap `demo_zones` to call `demo_zone_detail` internally per zone and
aggregate counts. More correct but more expensive (~6 queries instead of 1).

Prefer A.

## Notes

- Not a v0.48.0 regression -- the bug ships with eval launch in Sprint 049.
- Same bug class likely exists for authed users on `/zones` summary endpoint if
  the production flow shares the SQL pattern. Worth grepping for "LEFT JOIN
  markers mk ON mk.marker_slug = zm.marker_slug" during fix.
