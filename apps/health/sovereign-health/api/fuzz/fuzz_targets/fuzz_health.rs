//! Fuzz target for future request-parsing endpoints.
//!
//! Requirements: cargo-fuzz + nightly Rust
//!   rustup install nightly
//!   cargo install cargo-fuzz
//!
//! Usage:
//!   cargo +nightly fuzz run fuzz_health
//!
//! NOTE: The current /health and /api/v1/hello endpoints take no input,
//! so this stub is ready for when request bodies / query params are added.

#![no_main]
use libfuzzer_sys::fuzz_target;

fuzz_target!(|_data: &[u8]| {
    // TODO: parse `data` as a request body and call relevant handlers
});
