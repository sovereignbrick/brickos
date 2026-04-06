//! Fuzz target: general JSON response parsing.
//!
//! Feeds arbitrary bytes through serde_json to verify that response
//! deserialization never panics on unexpected input. Tests the robustness
//! of the API's serialization layer.
//!
//! Requirements: cargo-fuzz + nightly Rust
//!   rustup install nightly
//!   cargo install cargo-fuzz
//!
//! Usage:
//!   cargo +nightly fuzz run fuzz_health -- -max_total_time=300

#![no_main]
use libfuzzer_sys::fuzz_target;

/// Mirrors HealthResponse from lib.rs
#[derive(serde::Deserialize)]
#[allow(dead_code)]
struct HealthResponse {
    status: String,
    service: String,
    version: String,
    timestamp: String,
}

/// Mirrors HelloResponse from lib.rs
#[derive(serde::Deserialize)]
#[allow(dead_code)]
struct HelloResponse {
    message: String,
    version: String,
}

fuzz_target!(|data: &[u8]| {
    // Fuzz response deserialization -- should never panic
    let _ = serde_json::from_slice::<HealthResponse>(data);
    let _ = serde_json::from_slice::<HelloResponse>(data);

    // Fuzz serde_json::Value parsing (catches JSON parser panics)
    let _ = serde_json::from_slice::<serde_json::Value>(data);
});
