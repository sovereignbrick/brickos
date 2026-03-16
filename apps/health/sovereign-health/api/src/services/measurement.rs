// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

/// Returns Err with message if value is outside allowed physiological range.
pub fn validate_marker_value(marker_slug: &str, value: f64) -> Result<(), String> {
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
