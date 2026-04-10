---
number: 279
github_number: 494
title: "fix: backfill must only create calculated markers at timestamps where BOTH direct inputs were measured"
labels: [fix, backend, calculated-markers, priority-high, sprint-016]
milestone: health-intelligence
---

## Description

The backfill endpoint creates calculated marker values at timestamps where ANY calc input marker was measured. Combined with `enrich_with_latest_values()`, this produces phantom entries.

Example: Dr. Boz Ratio requires BOTH glucose AND ketones. If weight was measured at 14:14, the backfill enriches with glucose+ketones from 05:00 and creates a Dr. Boz entry at 14:14 -- a timestamp where no glucose or ketones were actually measured.

## Root Cause

The backfill iterates timestamps with ANY calc input slug, then calls `enrich_with_latest_values()` which pulls missing inputs from other dates/times. Every formula that CAN compute with enriched values DOES compute, regardless of whether the direct inputs were in the current session.

## Required Fix

After `compute_calculated_markers()` returns results, filter them: only insert a calculated value if at least one of that marker's REQUIRED inputs was directly measured in the current session (not just enriched).

Input requirements per marker:
- GKI: glucose OR ketones (at least one must be in session)
- Dr. Boz: glucose OR ketones
- BMI: weight (height is from profile, always enriched)
- WHtR: waist_circumference (height from profile)
- HCT/HB: hematocrit OR hemoglobin
- TG/HDL: triglycerides OR hdl
- HOMA-IR: glucose OR insulin
- TyG: triglycerides OR glucose

## Implementation

In the backfill endpoint, after computing:
```rust
// Track which slugs were directly measured in this session
let session_slugs: HashSet<String> = values_before_enrichment.keys().cloned().collect();

for (cm_id, value, status) in &computed {
    let marker_slug = // look up slug from cm_id
    let required_inputs = match marker_slug {
        "gki" | "dr_boz_ratio" => &["glucose", "ketones"],
        "bmi" => &["weight"],
        "whtr" => &["waist_circumference"],
        "hct_hb_ratio" => &["hematocrit", "hemoglobin"],
        "tg_hdl_ratio" => &["triglycerides", "hdl"],
        "homa_ir" => &["glucose", "insulin"],
        "tyg_index" => &["triglycerides", "glucose"],
        _ => &[],
    };
    // Only insert if at least one required input was in the session
    if required_inputs.iter().any(|s| session_slugs.contains(*s)) {
        // upsert...
    }
}
```

Also apply the same logic to the normal measurement submission in `measurements.rs` to prevent enrichment-driven phantom values during regular use.
