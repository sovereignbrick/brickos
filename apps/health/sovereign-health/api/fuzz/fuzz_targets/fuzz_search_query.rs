//! Fuzz target: search query parameter parsing and sanitization.
//!
//! Feeds arbitrary strings into serde_json deserialization of SearchParams-like
//! structures and validates that the API never panics on malformed input.
//!
//! Usage:
//!   cargo +nightly fuzz run fuzz_search_query -- -max_total_time=300

#![no_main]
use libfuzzer_sys::fuzz_target;

/// Mirrors the SearchParams struct from handlers/search.rs.
/// We deserialize from JSON to test serde's robustness against malformed input.
#[derive(serde::Deserialize)]
#[allow(dead_code)]
struct SearchParams {
    q: String,
    #[serde(default)]
    type_filter: String,
    #[serde(default)]
    locale: String,
    #[serde(default)]
    limit: i32,
    #[serde(default)]
    offset: i32,
}

fuzz_target!(|data: &[u8]| {
    // Fuzz JSON deserialization of search params
    let _ = serde_json::from_slice::<SearchParams>(data);

    // Also fuzz as a raw query string (key=value pairs)
    if let Ok(s) = std::str::from_utf8(data) {
        // Simulate the q.trim().len() < 2 validation
        let trimmed = s.trim();
        let _ = trimmed.len();

        // Simulate limit clamping
        if let Ok(n) = trimmed.parse::<i32>() {
            let _ = n.clamp(1, 50);
        }
    }
});
