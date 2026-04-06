//! Fuzz target: measurement creation request JSON parsing.
//!
//! Feeds arbitrary bytes into serde_json deserialization of
//! CreateMeasurementRequest to ensure no panics on malformed input.
//!
//! Usage:
//!   cargo +nightly fuzz run fuzz_measurement_json -- -max_total_time=300

#![no_main]
use libfuzzer_sys::fuzz_target;

/// Mirrors CreateMeasurementRequest from models/measurement.rs
#[derive(serde::Deserialize)]
#[allow(dead_code)]
struct MeasurementValue {
    marker_slug: String,
    value: f64,
}

#[derive(serde::Deserialize)]
#[allow(dead_code)]
struct CreateMeasurementRequest {
    measured_at: chrono::DateTime<chrono::Utc>,
    values: Vec<MeasurementValue>,
    device_id: Option<uuid::Uuid>,
    protocol_tag: Option<String>,
    fasting_protocol: Option<String>,
    fast_start_datetime: Option<chrono::DateTime<chrono::Utc>>,
    diet_protocol: Option<String>,
    meal_timing_tag: Option<String>,
    exercise_activity: Option<String>,
    sleep_hours: Option<f64>,
    sleep_quality: Option<String>,
    stress_level: Option<i32>,
    lifestyle_note: Option<String>,
    client_id: Option<String>,
    idempotency_key: Option<String>,
}

fuzz_target!(|data: &[u8]| {
    // Fuzz JSON deserialization -- should never panic
    let _ = serde_json::from_slice::<CreateMeasurementRequest>(data);

    // Also try to parse individual f64 values from the bytes
    if let Ok(s) = std::str::from_utf8(data) {
        let _ = s.parse::<f64>();
    }
});
