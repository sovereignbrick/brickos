# Issue #322: Temporal consistency checks for imported values

**Type:** feature
**Priority:** medium
**Component:** backend / import pipeline
**Sprint:** 020

## Description

No check exists for unrealistic changes between measurements. A user imports "Weight: 70 kg Monday" and "Weight: 120 kg Tuesday" with no warning. Add temporal consistency checks that compare imported values against the user's historical data.

## Proposed Approach

After extraction and marker matching, before review:

1. Fetch the user's most recent value for each matched marker
2. Compare the imported value against the historical value
3. Flag large deltas relative to time elapsed

```rust
struct ConsistencyWarning {
    marker_slug: String,
    imported_value: f64,
    previous_value: f64,
    previous_date: NaiveDate,
    delta_pct: f64,
    delta_days: i64,
    message: String,
}

fn check_temporal_consistency(
    slug: &str, value: f64, date: NaiveDate,
    prev_value: f64, prev_date: NaiveDate,
) -> Option<ConsistencyWarning> {
    let delta_pct = ((value - prev_value) / prev_value).abs() * 100.0;
    let delta_days = (date - prev_date).num_days().abs().max(1);
    
    // Threshold: >30% change in < 7 days is suspicious for most biomarkers
    // Weight/body comp: >10% in < 7 days
    // Glucose/BP: can legitimately vary 50%+ day-to-day → no flag
    let threshold = match slug {
        "weight" | "body_fat_pct" | "muscle_pct" | "bone_mass_kg" => (10.0, 7),
        "glucose" | "bp_systolic" | "bp_diastolic" | "heart_rate" => (100.0, 1), // high variability
        _ => (50.0, 7), // default
    };
    
    if delta_pct > threshold.0 && delta_days < threshold.1 as i64 {
        Some(ConsistencyWarning {
            marker_slug: slug.to_string(),
            imported_value: value,
            previous_value: prev_value,
            previous_date: prev_date,
            delta_pct,
            delta_days,
            message: format!(
                "{:.0}% change in {} days (previous: {:.1} on {})",
                delta_pct, delta_days, prev_value, prev_date
            ),
        })
    } else {
        None
    }
}
```

## Frontend Display

Show warning below the value in the review table:
- Orange text: "Weight changed 71% in 1 day (previous: 70.0 kg on 2026-04-01)"
- User can still confirm the import

## Acceptance Criteria

- [ ] Consistency check runs for all matched markers with historical data
- [ ] Warnings shown in review UI
- [ ] High-variability markers (glucose, BP) have relaxed thresholds
- [ ] Stable markers (weight, body comp) have strict thresholds
- [ ] No warnings if user has no prior data for a marker

## Tests

- [ ] test_weight_50pct_jump_1day: 70 → 105 in 1 day → warning
- [ ] test_weight_normal_change: 70 → 69.5 in 1 day → no warning
- [ ] test_glucose_high_variability: 80 → 150 mg/dL same day → no warning (normal glucose variability)
- [ ] test_no_history: first-ever measurement → no warning

## Location

- New: `apps/health/sovereign-health/api/src/services/validation.rs` (alongside #321)
- Updated: import handlers (fetch previous values, run checks)
- Updated: frontend review component (display consistency warnings)
