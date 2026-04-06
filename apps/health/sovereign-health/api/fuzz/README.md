# API Fuzzing -- cargo-fuzz

Fuzz testing for Sovereign Health API request parsing. Uses libFuzzer via
`cargo-fuzz` to find panics, crashes, and unexpected behavior in
deserialization and validation code.

## Setup

```bash
# Install nightly Rust (required by cargo-fuzz)
rustup install nightly

# Install cargo-fuzz
cargo install cargo-fuzz
```

## Fuzz Targets

| Target | Description |
|---|---|
| `fuzz_health` | HealthResponse / HelloResponse JSON deserialization |
| `fuzz_search_query` | Search query parameter parsing and validation |
| `fuzz_measurement_json` | CreateMeasurementRequest JSON deserialization |
| `fuzz_login_json` | LoginRequest / SignupRequest JSON deserialization |

## Run

```bash
# Run from the api/ directory
cd apps/health/sovereign-health/api

# Quick run (5 minutes)
cargo +nightly fuzz run fuzz_search_query -- -max_total_time=300

# Extended run (10 minutes)
cargo +nightly fuzz run fuzz_measurement_json -- -max_total_time=600

# Run all targets (short)
for target in fuzz_health fuzz_search_query fuzz_measurement_json fuzz_login_json; do
  cargo +nightly fuzz run "$target" -- -max_total_time=120
done

# List all available targets
cargo +nightly fuzz list
```

## Corpus Management

Corpus inputs are stored in `fuzz/corpus/<target_name>/`. To seed the corpus
with valid JSON examples:

```bash
mkdir -p fuzz/corpus/fuzz_login_json
echo '{"email":"test@example.com","password":"Test1234!"}' > fuzz/corpus/fuzz_login_json/seed_valid.json
echo '{}' > fuzz/corpus/fuzz_login_json/seed_empty.json
```

## Crashes

Found crashes are stored in `fuzz/artifacts/<target_name>/`. To reproduce:

```bash
cargo +nightly fuzz run fuzz_search_query fuzz/artifacts/fuzz_search_query/crash-<hash>
```

## Adding New Targets

1. Create `fuzz/fuzz_targets/fuzz_<name>.rs` with `#![no_main]` and `fuzz_target!` macro
2. Add a `[[bin]]` entry to `fuzz/Cargo.toml`
3. Mirror the struct you want to fuzz (avoid importing the full crate if it has heavy deps)
4. Run with `cargo +nightly fuzz run fuzz_<name>`

## Notes

- Fuzz targets mirror API structs locally to avoid pulling in actix-web/sqlx deps
- These targets focus on parsing (serde) -- not database or network I/O
- Add corpus seeds for better coverage: valid JSON, edge cases, empty objects
