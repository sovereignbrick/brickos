---
number: 390
title: "feat: Sovereign CRM API crate scaffold (sovereign-crm-api)"
milestone: "Sovereign CRM MVP"
labels: [platform-elevation]
created: 2026-04-08
sprint: 036
points: 5
blocked_by: []
---

Scaffold the Rust API crate for Sovereign CRM at `apps/data/sovereign-crm/api/`.

## Directory Structure

```
apps/data/sovereign-crm/api/
  src/
    main.rs          -- Actix-web server, two-pool init, tracing
    lib.rs           -- VERSION const, route configuration
    config.rs        -- SCR_* env var loading
    error.rs         -- AppError enum + ResponseError impl
    handlers/
      mod.rs         -- route configuration
    models/
      mod.rs         -- request/response types
    middleware/
      mod.rs         -- placeholder for auth
  migrations/        -- SQLx migrations directory
  Cargo.toml
  .env.example
```

## Cargo.toml Dependencies

Workspace deps: actix-web, sqlx (postgres, uuid, chrono), serde, serde_json, chrono, uuid, tokio, tracing, tracing-subscriber, dotenvy, anyhow, thiserror

BrickOS crates: brickos-auth, brickos-crypto, brickos-db, brickos-notify, brickos-i18n

## Two-Pool Architecture (Sprint 035 pattern)

```rust
pub struct PlatformPool(pub PgPool);  // newtype for type safety

// main.rs
let platform_pool = PgPoolOptions::new()
    .max_connections(3)
    .connect(&config.platform_database_url).await?;
let app_pool = PgPoolOptions::new()
    .max_connections(10)
    .connect(&config.database_url).await?;

App::new()
    .app_data(web::Data::new(PlatformPool(platform_pool)))
    .app_data(web::Data::new(app_pool))
```

## Config.rs

Load from environment: `SCR_DATABASE_URL`, `SCR_PLATFORM_DATABASE_URL`, `SCR_JWT_SECRET`, `SCR_ENCRYPTION_KEY`, `SCR_HOST` (default 0.0.0.0), `SCR_PORT` (default 8084/8085)

## Acceptance Criteria

- `cargo build -p sovereign-crm-api` compiles
- `cargo clippy -p sovereign-crm-api -- -D warnings` clean
- Server starts on configured port with health endpoint
- Crate added to workspace Cargo.toml
