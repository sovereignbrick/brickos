# core-backend — Claude Context

## Project
Rust Actix-web REST API for the Sovereign Health platform.
- Binary + library crate (`src/lib.rs` + `src/main.rs`)
- Crate name: `sovereign-health-backend`
- Port: 8080
- Database: PostgreSQL via SQLx (lazy connection — server starts without DB)
- Migrations: `migrations/` auto-applied at startup via `sqlx::migrate!()`

## Tech Stack
| Concern | Crate | Notes |
|---|---|---|
| HTTP | actix-web 4 | |
| Serialization | serde + serde_json | All response types derive Serialize + Deserialize |
| Database | sqlx 0.7 | Feature: `runtime-tokio-rustls` (NOT native-tls — no libssl-dev) |
| Async runtime | tokio 1 | full features |
| Time | chrono 0.4 | serde feature enabled |
| Config | dotenvy | reads `.env` |

## CRITICAL: OpenSSL
This system does NOT have `libssl-dev` installed.
Always use `runtime-tokio-rustls` for sqlx and `rustls-tls` for reqwest.
Never add `native-tls` or `openssl` as a dependency.

## Architecture
```
src/lib.rs         — public API: response types, handlers, configure_routes()
src/main.rs        — binary entry: DB pool, migrations, HttpServer
migrations/        — SQLx SQL migration files
tests/
  integration.rs   — actix_web::test + insta snapshots + proptest
  smoke.rs         — fast sanity checks (run first in CI)
  e2e.rs           — reqwest against live server (gated on E2E_BASE_URL env var)
benches/
  endpoints.rs     — criterion benchmarks
load-tests/
  health.js        — k6 load test script
fuzz/fuzz_targets/ — cargo-fuzz stubs (needs nightly)
```

## Public API (src/lib.rs)
- `pub const VERSION: &str`
- `pub const SERVICE_NAME: &str` → `"sovereign-health-backend"`
- `pub struct HealthResponse { status, service, version, timestamp }`
- `pub struct HelloResponse { message, version }`
- `pub async fn health() -> impl Responder`
- `pub async fn hello() -> impl Responder`
- `pub fn configure_routes(cfg: &mut web::ServiceConfig)`

## Endpoints
| Method | Path | Response |
|---|---|---|
| GET | /health | HealthResponse (status ok, service, version, UTC timestamp) |
| GET | /api/v1/hello | HelloResponse (message, version) |

## Database
```
DB name:  sovereign_health
DB user:  sovereign_health
DATABASE_URL=postgres://sovereign_health:dev_password_only@localhost:5432/sovereign_health
```
```sql
-- migrations/20240101000000_create_health_check.sql
CREATE TABLE IF NOT EXISTS health_check (
    id BIGSERIAL PRIMARY KEY,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
Add new tables as new migration files with incrementing timestamps.

## Testing Commands
```bash
make test              # smoke + integration + property (standard dev loop)
make test-smoke        # fast smoke only
make test-integration  # integration + snapshots + routing
make test-property     # proptest with 1000 cases
make test-e2e          # reqwest E2E (needs running server)
make snapshot-init     # first run: create snapshot files
make snapshot-review   # review changed snapshots with insta
make bench             # criterion benchmarks
make load-smoke        # k6 smoke load test
make load-test         # k6 50vus 2min load test
make lint              # fmt check + clippy -D warnings
make audit             # cargo audit (security advisories)
```

## Testing Strategy
1. **Smoke** (`tests/smoke.rs`): Run first in CI for fast feedback.
2. **Integration** (`tests/integration.rs`): HTTP-level via `actix_web::test`. No real DB needed.
3. **Snapshot** (insta): Pin JSON response shapes. After changes: `make snapshot-review`, commit `.snap`.
4. **Property-based** (proptest): Verify serialization invariants. 1000 cases in CI.
5. **E2E** (`tests/e2e.rs`): reqwest against live server. Set `E2E_BASE_URL`.
6. **Benchmarks** (`benches/endpoints.rs`): criterion, manual only.
7. **Load** (`load-tests/health.js`): k6, manual only.
8. **Security**: `cargo audit` in CI (advisory, non-blocking).

## Snapshot Files
Stored in `tests/snapshots/`. Must be committed to git.
- `integration__test_health_snapshot.snap`
- `integration__test_hello_snapshot.snap`

## CI (.gitlab-ci.yml)
Stages: lint → smoke → test → security → bench (manual)
- `INSTA_UPDATE=no` — fails on unreviewed/changed snapshots
- `PROPTEST_CASES=1000`
- E2E stage uses `services: postgres:16` with `sovereign_health` DB

## Conventions
- Response structs: always `#[derive(Debug, Clone, Serialize, Deserialize)]`
- New endpoints: handler in `src/lib.rs`, register in `configure_routes()`
- New routes need: unit test + snapshot test + smoke test
- Errors: return structured JSON `{ "error": "...", "code": "..." }`
- Versions follow semver; bump `VERSION` constant in `src/lib.rs`

## CRITICAL: Test Patterns (Lessons Learned)

### Integration tests MUST use `build_test_app()`
Route handlers extract `web::Data<T>` for Config, Encryptor, EmailProvider, AuthRateLimiters, etc. If any is missing, the handler returns 500 at runtime (not a compile error). Every test that calls `configure_routes` must build the app with ALL required app_data. Use the `build_test_app()` helper in each test file. Never use bare `App::new().app_data(pool).app_data(config).configure(routes)`.

### Never hardcode version strings
Use `sovereign_health_backend::VERSION` in assertions, not `"0.1.0"`. After version bumps, update snapshot files in `tests/snapshots/` with `cargo insta review`.

### Config changes break all tests
Adding a field to `Config` breaks every test that constructs it directly. Always use `Config::test_default()` and override specific fields.

### Calculated markers use a SEPARATE table
Standard biomarkers are in `markers`. Calculated markers (GKI, BMI, WHtR, etc.) are in `calculated_markers` with values in `calculated_marker_values`. Any endpoint that looks up a marker by slug MUST check BOTH tables (use `UNION ALL`).

### Pre-push checklist
```bash
cargo fmt
cargo clippy --all-targets -- -D warnings
cargo test --test integration
cargo test --test smoke
```
