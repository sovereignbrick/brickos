//! Fuzz target: auth login request JSON parsing.
//!
//! Feeds arbitrary bytes into serde_json deserialization of LoginRequest
//! to ensure no panics on malformed input.
//!
//! Usage:
//!   cargo +nightly fuzz run fuzz_login_json -- -max_total_time=300

#![no_main]
use libfuzzer_sys::fuzz_target;

/// Mirrors LoginRequest from brickos-db models/user.rs
#[derive(serde::Deserialize)]
#[allow(dead_code)]
struct LoginRequest {
    email: String,
    password: String,
}

/// Mirrors SignupRequest from brickos-db models/user.rs
#[derive(serde::Deserialize)]
#[allow(dead_code)]
struct SignupRequest {
    email: String,
    password: String,
    display_name: Option<String>,
    tos_accepted: Option<bool>,
    referred_by: Option<String>,
    locale: Option<String>,
    consent_newsletter: Option<bool>,
    country: Option<String>,
}

fuzz_target!(|data: &[u8]| {
    // Fuzz login JSON deserialization
    let _ = serde_json::from_slice::<LoginRequest>(data);

    // Fuzz signup JSON deserialization
    let _ = serde_json::from_slice::<SignupRequest>(data);
});
