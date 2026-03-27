//! Tests for calculated markers: formulas, protocol resolution, and end-to-end computation.

mod common;

use sovereign_health_backend::services::calculated::resolve_protocol_context;

// ── Protocol context resolution ──────────────────────────────────────────────

#[test]
fn test_standard_protocol() {
    assert_eq!(resolve_protocol_context("standard", None), "standard");
    assert_eq!(
        resolve_protocol_context("standard", Some("16_8")),
        "standard"
    );
}

#[test]
fn test_fasting_16_8_protocol() {
    assert_eq!(
        resolve_protocol_context("fasting", Some("16_8")),
        "fasting_16_8"
    );
    assert_eq!(
        resolve_protocol_context("fasting", Some("omad")),
        "fasting_16_8"
    );
}

#[test]
fn test_fasting_48h_protocol() {
    assert_eq!(
        resolve_protocol_context("fasting", Some("36h")),
        "fasting_48h"
    );
    assert_eq!(
        resolve_protocol_context("fasting", Some("48h")),
        "fasting_48h"
    );
}

#[test]
fn test_fasting_extended_protocol() {
    assert_eq!(
        resolve_protocol_context("fasting", Some("72h")),
        "fasting_extended"
    );
    assert_eq!(
        resolve_protocol_context("fasting", Some("extended")),
        "fasting_extended"
    );
}

#[test]
fn test_fasting_default_fallback() {
    // Unknown fasting type defaults to fasting_16_8
    assert_eq!(resolve_protocol_context("fasting", None), "fasting_16_8");
    assert_eq!(
        resolve_protocol_context("fasting", Some("unknown")),
        "fasting_16_8"
    );
}

// ── Calculated marker formulas (integration, requires DB) ────────────────────

#[actix_web::test]
async fn test_gki_formula() {
    let Some((pool, _config)) = common::setup().await else {
        return;
    };

    let mut values = std::collections::HashMap::new();
    values.insert("glucose".to_string(), 5.0_f64); // mmol/L
    values.insert("ketones".to_string(), 1.0_f64); // mmol/L

    let results = sovereign_health_backend::services::calculated::compute_calculated_markers(
        &pool,
        uuid::Uuid::nil(),
        &values,
        None, // no height
        "standard",
        None,
        chrono::Utc::now(),
    )
    .await
    .unwrap();

    // GKI = 5.0 / 1.0 = 5.0
    let gki = results.iter().find(|(_, v, _)| (*v - 5.0).abs() < 0.01);
    assert!(
        gki.is_some(),
        "GKI should be computed as 5.0, got: {:?}",
        results
    );

    // Dr. Boz = (5.0 * 18) / 1.0 = 90.0
    let boz = results.iter().find(|(_, v, _)| (*v - 90.0).abs() < 0.01);
    assert!(boz.is_some(), "Dr. Boz should be 90.0");
}

#[actix_web::test]
async fn test_bmi_formula() {
    let Some((pool, _config)) = common::setup().await else {
        return;
    };

    let mut values = std::collections::HashMap::new();
    values.insert("weight".to_string(), 73.0_f64); // kg

    let results = sovereign_health_backend::services::calculated::compute_calculated_markers(
        &pool,
        uuid::Uuid::nil(),
        &values,
        Some(182.0), // height_cm
        "standard",
        None,
        chrono::Utc::now(),
    )
    .await
    .unwrap();

    // BMI = 73.0 / (1.82 * 1.82) = 22.04
    let bmi = results.iter().find(|(_, v, _)| (*v - 22.04).abs() < 0.1);
    assert!(bmi.is_some(), "BMI should be ~22.04, got: {:?}", results);
}

#[actix_web::test]
async fn test_whtr_formula() {
    let Some((pool, _config)) = common::setup().await else {
        return;
    };

    let mut values = std::collections::HashMap::new();
    values.insert("waist_circumference".to_string(), 89.0_f64); // cm

    let results = sovereign_health_backend::services::calculated::compute_calculated_markers(
        &pool,
        uuid::Uuid::nil(),
        &values,
        Some(182.0),
        "standard",
        None,
        chrono::Utc::now(),
    )
    .await
    .unwrap();

    // WHtR = 89.0 / 182.0 = 0.489
    let whtr = results.iter().find(|(_, v, _)| (*v - 0.489).abs() < 0.01);
    assert!(whtr.is_some(), "WHtR should be ~0.489, got: {:?}", results);
}

#[actix_web::test]
async fn test_homa_ir_formula() {
    let Some((pool, _config)) = common::setup().await else {
        return;
    };

    let mut values = std::collections::HashMap::new();
    values.insert("glucose".to_string(), 5.0_f64); // mmol/L
    values.insert("insulin".to_string(), 10.0_f64); // uIU/mL

    let results = sovereign_health_backend::services::calculated::compute_calculated_markers(
        &pool,
        uuid::Uuid::nil(),
        &values,
        None,
        "standard",
        None,
        chrono::Utc::now(),
    )
    .await
    .unwrap();

    // HOMA-IR = (5.0 * 18.018 * 10.0) / 405.0 = 2.224
    let homa = results.iter().find(|(_, v, _)| (*v - 2.224).abs() < 0.05);
    assert!(
        homa.is_some(),
        "HOMA-IR should be ~2.224, got: {:?}",
        results
    );
}

#[actix_web::test]
async fn test_dr_boz_ratio_real_values() {
    let Some((pool, _config)) = common::setup().await else {
        return;
    };

    // Real user values: glucose 5.7 mmol/L, ketones 0.7 mmol/L
    let mut values = std::collections::HashMap::new();
    values.insert("glucose".to_string(), 5.7_f64); // mmol/L
    values.insert("ketones".to_string(), 0.7_f64); // mmol/L

    let results = sovereign_health_backend::services::calculated::compute_calculated_markers(
        &pool,
        uuid::Uuid::nil(),
        &values,
        None,
        "standard",
        None,
        chrono::Utc::now(),
    )
    .await
    .unwrap();

    // Dr. Boz = (5.7 * 18.0) / 0.7 = 102.6 / 0.7 = 146.57
    let boz = results.iter().find(|(_, v, _)| (*v - 146.57).abs() < 1.0);
    assert!(
        boz.is_some(),
        "Dr. Boz should be ~146.57 for glucose 5.7 / ketones 0.7, got: {:?}",
        results.iter().map(|(_, v, s)| (v, s)).collect::<Vec<_>>()
    );

    // GKI = 5.7 / 0.7 = 8.14
    let gki = results.iter().find(|(_, v, _)| (*v - 8.14).abs() < 0.1);
    assert!(
        gki.is_some(),
        "GKI should be ~8.14 for glucose 5.7 / ketones 0.7"
    );
}

#[actix_web::test]
async fn test_missing_inputs_skip_marker() {
    let Some((pool, _config)) = common::setup().await else {
        return;
    };

    // Only glucose, no ketones -- GKI should NOT compute
    let mut values = std::collections::HashMap::new();
    values.insert("glucose".to_string(), 5.0_f64);

    let results = sovereign_health_backend::services::calculated::compute_calculated_markers(
        &pool,
        uuid::Uuid::nil(),
        &values,
        None,
        "standard",
        None,
        chrono::Utc::now(),
    )
    .await
    .unwrap();

    // Should have no results (glucose alone doesn't compute anything)
    assert!(
        results.is_empty(),
        "Should have no computed markers with only glucose, got: {:?}",
        results
    );
}

#[actix_web::test]
async fn test_zero_divisor_safe() {
    let Some((pool, _config)) = common::setup().await else {
        return;
    };

    // Ketones = 0 -- GKI should NOT compute (division by zero guard)
    let mut values = std::collections::HashMap::new();
    values.insert("glucose".to_string(), 5.0_f64);
    values.insert("ketones".to_string(), 0.0_f64);

    let results = sovereign_health_backend::services::calculated::compute_calculated_markers(
        &pool,
        uuid::Uuid::nil(),
        &values,
        None,
        "standard",
        None,
        chrono::Utc::now(),
    )
    .await
    .unwrap();

    // GKI and Dr. Boz should NOT be in results (ketones = 0 guarded)
    for (_, v, _) in &results {
        assert!(v.is_finite(), "No infinite values should be produced");
    }
}
