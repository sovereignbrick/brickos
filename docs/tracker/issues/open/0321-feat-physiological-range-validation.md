# Issue #321: Physiological range validation before import review

**Type:** feature
**Priority:** high
**Component:** backend / import pipeline
**Sprint:** 020

## Description

No sanity check exists on extracted values. A glucose of 400 mmol/L (clearly should be mg/dL) is accepted silently. Add a validation layer between extraction and review that flags physiologically implausible values.

## Proposed Validation Rules

```rust
enum ValidationLevel {
    Ok,
    Warning(String),   // shown as orange badge in review
    Error(String),     // shown as red badge, requires explicit confirm
}

fn validate_value(slug: &str, value: f64, unit: &str) -> ValidationLevel {
    match slug {
        // Unit confusion detection
        "glucose" if unit.contains("mmol") && value > 50.0 =>
            Warning("Value {value} mmol/L seems too high — likely mg/dL?"),
        "glucose" if unit.contains("mg") && value > 600.0 =>
            Error("Glucose > 600 mg/dL is physiologically extreme"),
        
        // Impossible values
        "weight" if value > 350.0 || value < 15.0 =>
            Warning("Weight outside plausible range (15-350 kg)"),
        "heart_rate" if value > 300.0 || value < 15.0 =>
            Warning("Heart rate outside plausible range"),
        "body_fat_pct" if value > 70.0 || value < 2.0 =>
            Warning("Body fat % outside plausible range"),
        "bp_systolic" if value > 300.0 || value < 50.0 =>
            Warning("Systolic BP outside plausible range"),
        "hba1c" if unit.contains("%") && value > 20.0 =>
            Warning("HbA1c > 20% is physiologically extreme"),
        "hemoglobin" if value > 25.0 =>
            Warning("Hemoglobin > 25 g/dL is physiologically extreme"),
        
        // Negative values (never valid for biomarkers)
        _ if value < 0.0 => Error("Negative values not valid for biomarkers"),
        
        _ => Ok,
    }
}
```

## Frontend Display

- `Ok` — normal display
- `Warning` — orange badge with tooltip: "Weight 450 kg seems unusually high — verify"
- `Error` — red badge, value field highlighted, must click "confirm anyway" to proceed

## Acceptance Criteria

- [ ] Validation runs after extraction, before review display
- [ ] Warning/error badges shown in review UI per marker
- [ ] Unit confusion detected (mmol/L vs mg/dL for glucose, cholesterol)
- [ ] Negative values always flagged
- [ ] Validation does NOT block import — user can override all warnings

## Tests

- [ ] test_glucose_unit_confusion: 400 mmol/L → warning
- [ ] test_glucose_valid: 5.5 mmol/L → ok, 95 mg/dL → ok
- [ ] test_negative_value: -5 anything → error
- [ ] test_weight_extreme: 500 kg → warning, 80 kg → ok
- [ ] test_hba1c_extreme: 25% → warning, 6.5% → ok

## Location

- New: `apps/health/sovereign-health/api/src/services/validation.rs`
- Updated: `apps/health/sovereign-health/api/src/handlers/import.rs` (add validation to matched results)
- Updated: frontend import review component (display badges)
