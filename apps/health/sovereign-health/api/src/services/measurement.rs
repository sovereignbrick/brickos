// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use serde::Serialize;

/// Validation warning for a marker value.
#[derive(Debug, Clone, Serialize)]
pub struct ValidationWarning {
    pub level: &'static str, // "warning" or "error"
    pub code: &'static str,
    pub message: String,
}

/// Comprehensive validation result.
#[derive(Debug, Clone, Serialize)]
pub struct ValidationResult {
    pub warnings: Vec<ValidationWarning>,
}

impl ValidationResult {
    pub fn ok() -> Self {
        Self {
            warnings: Vec::new(),
        }
    }

    pub fn has_warnings(&self) -> bool {
        !self.warnings.is_empty()
    }
}

/// Returns Err with message if value is outside allowed physiological range.
///
/// Sprint 042 #531: now takes an optional `unit` so the validator can
/// range-check in the user's input unit (mg/dL vs mmol/L for glucose, %
/// vs mmol/mol for HbA1c) and produce error messages with the user's
/// actual numbers instead of the converted-to-canonical value. Clients
/// that don't pass a unit (mobile, lab import) fall back to the
/// canonical-unit ranges, matching pre-Sprint-042 behaviour.
///
/// The bug this closes: a user typing `4.7` for glucose with the form
/// set to mg/dL had the frontend silently convert to `0.26` mmol/L, the
/// backend rejected with `value 0.26 outside range 1-30` -- a number the
/// user never typed in a unit they didn't know was being used. Now the
/// error reads `value 4.7 mg/dL is outside the mg/dL range 18-540 -- did
/// you mean 4.7 mmol/L? (normal: 3.9-7.8 mmol/L)`.
pub fn validate_marker_value(
    marker_slug: &str,
    value: f64,
    unit: Option<&str>,
) -> Result<(), String> {
    // Sprint 042 #531: per-(marker, unit) range table. Returns the
    // physiological range in the user's input unit if known, or None
    // if the marker is unknown / the unit is unrecognised. Bounds are
    // calibrated to the same physiological window as the canonical
    // ranges below, just expressed in the alternative unit (e.g. for
    // glucose, mmol/L (1, 30) corresponds to mg/dL (18, 540) via the
    // 18.0182 conversion factor; we round to integers for clarity).
    fn unit_specific_range(slug: &str, unit_lower: &str) -> Option<(f64, f64, &'static str)> {
        match slug {
            "glucose" => {
                if unit_lower.contains("mmol") {
                    Some((1.0, 30.0, "mmol/L"))
                } else if unit_lower.contains("mg") {
                    Some((18.0, 540.0, "mg/dL"))
                } else {
                    None
                }
            }
            "ketones" => {
                if unit_lower.contains("mmol") {
                    Some((0.0, 10.0, "mmol/L"))
                } else if unit_lower.contains("mg") {
                    Some((0.0, 180.0, "mg/dL"))
                } else {
                    None
                }
            }
            "total_cholesterol" | "ldl_c" | "hdl_c" => {
                if unit_lower.contains("mmol") {
                    Some((1.0, 15.0, "mmol/L"))
                } else if unit_lower.contains("mg") {
                    Some((40.0, 580.0, "mg/dL"))
                } else {
                    None
                }
            }
            "hba1c" => {
                if unit_lower.contains('%') {
                    Some((3.0, 15.0, "%"))
                } else if unit_lower.contains("mmol") {
                    Some((10.0, 140.0, "mmol/mol"))
                } else {
                    None
                }
            }
            _ => None,
        }
    }

    // If a unit was provided AND the marker has a unit-specific range,
    // use that. Otherwise fall back to the canonical-unit ranges below.
    if let Some(u) = unit {
        let unit_lower = u.to_lowercase();
        if let Some((min, max, label)) = unit_specific_range(marker_slug, &unit_lower) {
            if value < min || value > max {
                // Compute the converted value in the OTHER unit and
                // include it in the message so the user immediately
                // sees the unit confusion if that's what's happening.
                let hint = unit_confusion_hint(marker_slug, value, &unit_lower);
                return Err(format!(
                    "{marker_slug} value {value} {label} is outside the {label} range {min}–{max}{hint}"
                ));
            }
            return Ok(());
        }
    }

    // Fallback: canonical-unit ranges (pre-Sprint-042 behaviour).
    let (min, max) = match marker_slug {
        "glucose" => (1.0, 30.0),
        "ketones" => (0.0, 10.0),
        "total_cholesterol" => (1.0, 15.0),
        "uric_acid" => (50.0, 1000.0),
        "hemoglobin" => (4.0, 14.0),
        "hematocrit" => (20.0, 65.0),
        "bp_systolic" => (50.0, 250.0),
        "bp_diastolic" => (30.0, 150.0),
        "heart_rate" => (30.0, 220.0),
        "weight" => (20.0, 300.0),
        "waist_circumference" => (40.0, 200.0),
        "insulin" => (0.0, 300.0),
        "body_fat_pct" => (1.0, 70.0),
        "body_water_pct" => (20.0, 80.0),
        "muscle_pct" => (10.0, 70.0),
        "bone_mass_pct" => (1.0, 15.0),
        _ => return Ok(()), // unknown marker -> skip validation
    };
    if value < min || value > max {
        return Err(format!(
            "{marker_slug} value {value} is outside allowed range {min}–{max}"
        ));
    }
    Ok(())
}

/// Sprint 042 #531: if the user's value is way out of range for their
/// stated unit, suggest the alternative unit. Returns either an empty
/// string (no useful hint) or " -- did you mean X UNIT?".
fn unit_confusion_hint(slug: &str, value: f64, unit_lower: &str) -> String {
    match slug {
        "glucose" => {
            if unit_lower.contains("mg") && (1.0..15.0).contains(&value) {
                // 4.7 mg/dL hypoglycemic-coma -- almost certainly mmol/L
                format!(" -- did you mean {value} mmol/L? (normal: 3.9-7.8 mmol/L)")
            } else if unit_lower.contains("mmol") && (50.0..600.0).contains(&value) {
                format!(" -- did you mean {value} mg/dL? (normal: 70-140 mg/dL)")
            } else {
                String::new()
            }
        }
        "total_cholesterol" | "ldl_c" | "hdl_c" => {
            if unit_lower.contains("mg") && (1.0..15.0).contains(&value) {
                format!(" -- did you mean {value} mmol/L? (normal total: <5.2 mmol/L)")
            } else if unit_lower.contains("mmol") && (40.0..400.0).contains(&value) {
                format!(" -- did you mean {value} mg/dL? (normal total: <200 mg/dL)")
            } else {
                String::new()
            }
        }
        "hba1c" => {
            if unit_lower.contains('%') && (15.0..80.0).contains(&value) {
                format!(" -- did you mean {value} mmol/mol (IFCC)? (normal: 20-42 mmol/mol)")
            } else if !unit_lower.contains('%') && (3.0..15.0).contains(&value) {
                format!(" -- did you mean {value}%? (normal: 4-6%)")
            } else {
                String::new()
            }
        }
        _ => String::new(),
    }
}

/// Comprehensive physiological validation with unit confusion detection.
/// Warns but never blocks — user is always the final authority.
pub fn validate_marker_comprehensive(
    marker_slug: &str,
    value: f64,
    unit: &str,
) -> ValidationResult {
    let mut warnings = Vec::new();
    let unit_lower = unit.to_lowercase();

    // Negative values are never valid for biomarkers
    if value < 0.0 {
        warnings.push(ValidationWarning {
            level: "error",
            code: "negative_value",
            message: format!("Negative value ({}) is not valid for biomarkers", value),
        });
        return ValidationResult { warnings };
    }

    // Unit confusion detection
    match marker_slug {
        "glucose" => {
            if unit_lower.contains("mmol") && value > 40.0 {
                warnings.push(ValidationWarning {
                    level: "warning",
                    code: "unit_confusion",
                    message: format!(
                        "Glucose {} mmol/L seems too high — likely mg/dL? (normal: 3.9-7.8 mmol/L)",
                        value
                    ),
                });
            } else if unit_lower.contains("mg") && value > 600.0 {
                warnings.push(ValidationWarning {
                    level: "error",
                    code: "extreme_value",
                    message: format!("Glucose {} mg/dL is physiologically extreme", value),
                });
            }
        }
        "total_cholesterol" | "ldl_c" | "hdl_c" => {
            if unit_lower.contains("mmol") && value > 15.0 {
                warnings.push(ValidationWarning {
                    level: "warning",
                    code: "unit_confusion",
                    message: format!(
                        "Cholesterol {} mmol/L seems too high — likely mg/dL?",
                        value
                    ),
                });
            }
        }
        "hba1c" => {
            if unit_lower.contains('%') && value > 15.0 {
                // HbA1c > 15% is physiologically impossible — likely mmol/mol (IFCC) mislabeled as %
                // Normal DCCT: 4-6%, max survivable ~14%. IFCC range: 20-42 mmol/mol.
                warnings.push(ValidationWarning {
                    level: "warning",
                    code: "unit_confusion",
                    message: format!(
                        "HbA1c {}% seems too high — likely mmol/mol (IFCC)? Normal: 4-6% or 20-42 mmol/mol",
                        value
                    ),
                });
            } else if !unit_lower.contains('%') && value > 140.0 {
                warnings.push(ValidationWarning {
                    level: "warning",
                    code: "unit_confusion",
                    message: format!(
                        "HbA1c {} mmol/mol seems high — verify unit (normal: 20-42 mmol/mol)",
                        value
                    ),
                });
            }
        }
        _ => {}
    }

    // General physiological range checks (only if no unit confusion detected)
    if warnings.is_empty() {
        let range = match marker_slug {
            "weight" => Some((15.0, 350.0)),
            "heart_rate" => Some((15.0, 300.0)),
            "bp_systolic" => Some((50.0, 300.0)),
            "bp_diastolic" => Some((20.0, 200.0)),
            "body_fat_pct" | "subcutaneous_fat_pct" => Some((1.0, 70.0)),
            "skeletal_muscle_pct" | "muscle_pct" => Some((5.0, 70.0)),
            "bone_mass_pct" => Some((1.0, 15.0)),
            "bone_mass_kg" => Some((0.5, 8.0)),
            "muscle_mass_kg" => Some((10.0, 100.0)),
            "fat_free_mass" => Some((20.0, 150.0)),
            "visceral_fat" => Some((1.0, 59.0)),
            "bmr" => Some((500.0, 4000.0)),
            "metabolic_age" => Some((10.0, 120.0)),
            "body_protein_pct" => Some((5.0, 30.0)),
            "body_water_pct" => Some((20.0, 80.0)),
            "hemoglobin" => Some((3.0, 25.0)),
            "hematocrit" => Some((15.0, 70.0)),
            "creatinine" => Some((10.0, 2000.0)),
            "ferritin" => Some((1.0, 5000.0)),
            "vitamin_d" => Some((5.0, 500.0)),
            "tsh" => Some((0.01, 100.0)),
            "calprotectin" => Some((0.0, 5000.0)),
            _ => None,
        };

        if let Some((min, max)) = range {
            if value < min || value > max {
                warnings.push(ValidationWarning {
                    level: "warning",
                    code: "extreme_value",
                    message: format!(
                        "{} value {} is outside expected range ({}-{})",
                        marker_slug, value, min, max
                    ),
                });
            }
        }
    }

    ValidationResult { warnings }
}

/// Check temporal consistency against a user's most recent measurement.
/// Returns a warning if the value changed dramatically in a short time.
pub fn check_temporal_consistency(
    marker_slug: &str,
    new_value: f64,
    prev_value: f64,
    days_between: i64,
) -> Option<ValidationWarning> {
    if days_between < 0 || prev_value == 0.0 {
        return None;
    }

    let delta_pct = ((new_value - prev_value) / prev_value).abs() * 100.0;
    let days = days_between.max(1);

    // Threshold: how much change is suspicious over how many days
    let (pct_threshold, day_threshold) = match marker_slug {
        // Stable markers: flag > 10% change in < 7 days
        "weight"
        | "body_fat_pct"
        | "muscle_pct"
        | "bone_mass_kg"
        | "bone_mass_pct"
        | "muscle_mass_kg"
        | "fat_free_mass"
        | "skeletal_muscle_pct" => (10.0, 7),
        // High-variability markers: don't flag (glucose, BP, heart rate vary a lot day-to-day)
        "glucose" | "ketones" | "bp_systolic" | "bp_diastolic" | "heart_rate" | "insulin" => {
            return None;
        }
        // Default: flag > 50% in < 7 days
        _ => (50.0, 7),
    };

    if delta_pct > pct_threshold && days < day_threshold {
        Some(ValidationWarning {
            level: "warning",
            code: "temporal_jump",
            message: format!(
                "{:.0}% change in {} day(s) (previous: {:.1})",
                delta_pct, days, prev_value
            ),
        })
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── Physiological range validation ──

    #[test]
    fn test_negative_value_always_error() {
        let result = validate_marker_comprehensive("glucose", -5.0, "mmol/L");
        assert!(result.has_warnings());
        assert_eq!(result.warnings[0].code, "negative_value");
        assert_eq!(result.warnings[0].level, "error");
    }

    #[test]
    fn test_glucose_unit_confusion_mmol() {
        let result = validate_marker_comprehensive("glucose", 95.0, "mmol/L");
        assert!(result.has_warnings());
        assert_eq!(result.warnings[0].code, "unit_confusion");
    }

    #[test]
    fn test_glucose_valid_mmol() {
        let result = validate_marker_comprehensive("glucose", 5.5, "mmol/L");
        assert!(!result.has_warnings());
    }

    #[test]
    fn test_glucose_valid_mgdl() {
        let result = validate_marker_comprehensive("glucose", 95.0, "mg/dL");
        assert!(!result.has_warnings());
    }

    #[test]
    fn test_glucose_extreme_mgdl() {
        let result = validate_marker_comprehensive("glucose", 700.0, "mg/dL");
        assert!(result.has_warnings());
        assert_eq!(result.warnings[0].code, "extreme_value");
    }

    #[test]
    fn test_cholesterol_unit_confusion() {
        let result = validate_marker_comprehensive("total_cholesterol", 200.0, "mmol/L");
        assert!(result.has_warnings());
        assert_eq!(result.warnings[0].code, "unit_confusion");
    }

    #[test]
    fn test_hba1c_extreme() {
        let result = validate_marker_comprehensive("hba1c", 25.0, "%");
        assert!(result.has_warnings());
    }

    #[test]
    fn test_hba1c_mmol_mol_as_percent() {
        // 37 mmol/mol (IFCC) mislabeled as 37% — should flag unit confusion
        let result = validate_marker_comprehensive("hba1c", 37.0, "%");
        assert!(result.has_warnings());
        assert_eq!(result.warnings[0].code, "unit_confusion");
    }

    #[test]
    fn test_hba1c_valid() {
        let result = validate_marker_comprehensive("hba1c", 5.7, "%");
        assert!(!result.has_warnings());
    }

    #[test]
    fn test_weight_extreme() {
        let result = validate_marker_comprehensive("weight", 500.0, "kg");
        assert!(result.has_warnings());
        assert_eq!(result.warnings[0].code, "extreme_value");
    }

    #[test]
    fn test_weight_valid() {
        let result = validate_marker_comprehensive("weight", 75.0, "kg");
        assert!(!result.has_warnings());
    }

    #[test]
    fn test_visceral_fat_valid() {
        let result = validate_marker_comprehensive("visceral_fat", 8.0, "level");
        assert!(!result.has_warnings());
    }

    #[test]
    fn test_unknown_marker_no_validation() {
        let result = validate_marker_comprehensive("some_new_marker", 99999.0, "units");
        assert!(!result.has_warnings());
    }

    // ── Temporal consistency ──

    #[test]
    fn test_weight_50pct_jump_1day() {
        let w = check_temporal_consistency("weight", 105.0, 70.0, 1);
        assert!(w.is_some());
        assert_eq!(w.unwrap().code, "temporal_jump");
    }

    #[test]
    fn test_weight_normal_change() {
        let w = check_temporal_consistency("weight", 69.5, 70.0, 1);
        assert!(w.is_none());
    }

    #[test]
    fn test_glucose_high_variability_no_flag() {
        // Glucose can legitimately vary 100%+ in a day — no flag
        let w = check_temporal_consistency("glucose", 180.0, 80.0, 1);
        assert!(w.is_none());
    }

    #[test]
    fn test_no_previous_value() {
        let w = check_temporal_consistency("weight", 70.0, 0.0, 1);
        assert!(w.is_none());
    }

    #[test]
    fn test_cholesterol_moderate_change_ok() {
        // 20% change over 30 days is fine
        let w = check_temporal_consistency("total_cholesterol", 6.0, 5.0, 30);
        assert!(w.is_none());
    }

    #[test]
    fn test_cholesterol_extreme_change() {
        // 100% change in 1 day is suspicious
        let w = check_temporal_consistency("total_cholesterol", 10.0, 5.0, 1);
        assert!(w.is_some());
    }

    // ── Legacy validate_marker_value ──

    #[test]
    fn test_legacy_validate_glucose_valid() {
        // Backward-compatible call: no unit -> falls back to canonical mmol/L range.
        assert!(validate_marker_value("glucose", 5.5, None).is_ok());
    }

    #[test]
    fn test_legacy_validate_glucose_out_of_range() {
        assert!(validate_marker_value("glucose", 50.0, None).is_err());
    }

    // ── Sprint 042 #531: unit-aware validation ──

    #[test]
    fn test_glucose_47_in_mgdl_is_rejected_with_hint() {
        // The bug from Sprint 041 manual testing: user types 4.7 thinking
        // mmol/L, form is on mg/dL, frontend converts to 0.26 mmol/L,
        // backend rejects with a meaningless number. Now the backend
        // sees the user's actual 4.7 mg/dL, rejects it as physiologically
        // implausible for mg/dL, AND suggests "did you mean 4.7 mmol/L?".
        let err = validate_marker_value("glucose", 4.7, Some("mg/dL")).unwrap_err();
        assert!(err.contains("4.7"), "error should reference user's value: {err}");
        assert!(err.contains("mg/dL"), "error should reference user's unit: {err}");
        assert!(err.contains("mmol/L"), "error should suggest mmol/L: {err}");
    }

    #[test]
    fn test_glucose_85_mgdl_is_accepted() {
        // Normal fasting glucose in mg/dL = ~85; should pass when unit is provided.
        assert!(validate_marker_value("glucose", 85.0, Some("mg/dL")).is_ok());
    }

    #[test]
    fn test_glucose_47_mmoll_is_accepted() {
        // The same value (4.7) is normal in mmol/L.
        assert!(validate_marker_value("glucose", 4.7, Some("mmol/L")).is_ok());
    }

    #[test]
    fn test_glucose_300_mmoll_suggests_mgdl() {
        // 300 mmol/L is way too high for mmol/L; suggest the user meant mg/dL.
        let err = validate_marker_value("glucose", 300.0, Some("mmol/L")).unwrap_err();
        assert!(err.contains("mg/dL"), "should suggest mg/dL: {err}");
    }

    #[test]
    fn test_hba1c_unit_confusion_both_directions() {
        // 5.5% is normal; 5.5 mmol/mol is way below normal -> hint mmol/mol.
        assert!(validate_marker_value("hba1c", 5.5, Some("%")).is_ok());
        let err = validate_marker_value("hba1c", 5.5, Some("mmol/mol")).unwrap_err();
        assert!(err.contains("%"), "should suggest %: {err}");
        // 30 mmol/mol is normal; 30% is way too high -> hint mmol/mol.
        assert!(validate_marker_value("hba1c", 30.0, Some("mmol/mol")).is_ok());
        let err = validate_marker_value("hba1c", 30.0, Some("%")).unwrap_err();
        assert!(err.contains("mmol/mol"), "should suggest mmol/mol: {err}");
    }

    // ── Sprint 020 regression: comprehensive validation coverage ──

    #[test]
    fn test_validation_all_body_comp_markers() {
        // All new body comp markers should validate in normal ranges
        let valid_cases = [
            ("skeletal_muscle_pct", 38.0, "%"),
            ("muscle_mass_kg", 30.0, "kg"),
            ("subcutaneous_fat_pct", 15.0, "%"),
            ("visceral_fat", 8.0, "level"),
            ("fat_free_mass", 60.0, "kg"),
            ("bmr", 1600.0, "kcal"),
            ("metabolic_age", 35.0, "years"),
            ("body_protein_pct", 18.0, "%"),
            ("bone_mass_kg", 3.0, "kg"),
        ];
        for (slug, val, unit) in &valid_cases {
            let result = validate_marker_comprehensive(slug, *val, unit);
            assert!(
                !result.has_warnings(),
                "{} value {} {} should be valid",
                slug,
                val,
                unit
            );
        }
    }

    #[test]
    fn test_validation_body_comp_extreme_values() {
        let result = validate_marker_comprehensive("visceral_fat", 100.0, "level");
        assert!(result.has_warnings());
        let result = validate_marker_comprehensive("bmr", 50.0, "kcal");
        assert!(result.has_warnings());
        let result = validate_marker_comprehensive("metabolic_age", 150.0, "years");
        assert!(result.has_warnings());
    }

    #[test]
    fn test_validation_zero_value() {
        // Zero glucose is extreme (below min range)
        let result = validate_marker_comprehensive("hemoglobin", 0.0, "mmol/L");
        assert!(result.has_warnings());
    }

    #[test]
    fn test_temporal_body_fat_jump() {
        let w = check_temporal_consistency("body_fat_pct", 30.0, 20.0, 1);
        assert!(w.is_some()); // 50% jump in 1 day
    }

    #[test]
    fn test_temporal_body_fat_gradual_ok() {
        let w = check_temporal_consistency("body_fat_pct", 21.0, 20.0, 7);
        assert!(w.is_none()); // 5% change over 7 days is fine
    }

    #[test]
    fn test_temporal_insulin_no_flag() {
        // Insulin is high-variability
        let w = check_temporal_consistency("insulin", 50.0, 10.0, 1);
        assert!(w.is_none());
    }

    #[test]
    fn test_temporal_bp_no_flag() {
        let w = check_temporal_consistency("bp_systolic", 180.0, 120.0, 1);
        assert!(w.is_none());
    }

    #[test]
    fn test_temporal_ferritin_large_jump() {
        let w = check_temporal_consistency("ferritin", 500.0, 100.0, 1);
        assert!(w.is_some()); // 400% jump
    }

    #[test]
    fn test_temporal_long_period_ok() {
        // 50% change over 30 days is ok for most markers
        let w = check_temporal_consistency("total_cholesterol", 7.5, 5.0, 30);
        assert!(w.is_none());
    }

    #[test]
    fn test_validation_ldl_unit_confusion() {
        let result = validate_marker_comprehensive("ldl_c", 130.0, "mmol/L");
        assert!(result.has_warnings());
        assert_eq!(result.warnings[0].code, "unit_confusion");
    }

    #[test]
    fn test_validation_hdl_valid() {
        let result = validate_marker_comprehensive("hdl_c", 1.5, "mmol/L");
        assert!(!result.has_warnings());
    }

    #[test]
    fn test_validation_calprotectin_valid() {
        let result = validate_marker_comprehensive("calprotectin", 25.0, "µg/g");
        assert!(!result.has_warnings());
    }

    #[test]
    fn test_validation_calprotectin_extreme() {
        let result = validate_marker_comprehensive("calprotectin", 10000.0, "µg/g");
        assert!(result.has_warnings());
    }
}
