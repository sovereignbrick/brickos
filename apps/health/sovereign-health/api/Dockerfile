# syntax=docker/dockerfile:1
# ============================================================================
#  SOVEREIGN HEALTH INTELLIGENCE
#  BLOOD · BIOMARKERS · INSIGHT
#  https://sovereignhealth.io/ -- AGPL-3.0
# ============================================================================
#
# Build context: monorepo root (../../../../)
# Set via docker-compose or: docker build -f apps/health/sovereign-health/api/Dockerfile .

# ── Build stage ────────────────────────────────────────────────────────────────
FROM rust:bookworm AS builder
WORKDIR /app

# pkg-config for linking; no libssl-dev needed (crate uses rustls, not openssl)
RUN apt-get update && apt-get install -y --no-install-recommends pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace manifests + crate manifests for dependency layer caching
COPY Cargo.toml Cargo.lock ./
COPY crates/brickos-auth/Cargo.toml crates/brickos-auth/Cargo.toml
COPY crates/brickos-crypto/Cargo.toml crates/brickos-crypto/Cargo.toml
COPY crates/brickos-db/Cargo.toml crates/brickos-db/Cargo.toml
COPY crates/brickos-billing/Cargo.toml crates/brickos-billing/Cargo.toml
COPY crates/brickos-email/Cargo.toml crates/brickos-email/Cargo.toml
COPY crates/brickos-backup/Cargo.toml crates/brickos-backup/Cargo.toml
COPY crates/brickos-startos/Cargo.toml crates/brickos-startos/Cargo.toml
COPY platform/core-api/Cargo.toml platform/core-api/Cargo.toml
COPY apps/health/sovereign-health/api/Cargo.toml apps/health/sovereign-health/api/Cargo.toml

# Dummy stubs for all workspace members so cargo can resolve deps
RUN for crate in \
      crates/brickos-auth \
      crates/brickos-crypto \
      crates/brickos-db \
      crates/brickos-billing \
      crates/brickos-email \
      crates/brickos-backup \
      crates/brickos-startos \
      platform/core-api; do \
        mkdir -p "$crate/src" && echo 'fn main(){}' > "$crate/src/lib.rs"; \
    done \
    && mkdir -p apps/health/sovereign-health/api/src \
               apps/health/sovereign-health/api/src/bin \
               apps/health/sovereign-health/api/benches \
               apps/health/sovereign-health/api/fuzz/fuzz_targets \
               apps/health/sovereign-health/api/migrations \
    && echo 'fn main(){}' > apps/health/sovereign-health/api/src/main.rs \
    && echo 'fn main(){}' > apps/health/sovereign-health/api/src/lib.rs \
    && echo 'fn main(){}' > apps/health/sovereign-health/api/src/bin/encrypt_existing_data.rs \
    && echo 'fn main(){}' > apps/health/sovereign-health/api/src/bin/migrate_early_access.rs \
    && echo 'fn main(){}' > apps/health/sovereign-health/api/benches/endpoints.rs \
    && echo 'fn main(){}' > apps/health/sovereign-health/api/fuzz/fuzz_targets/fuzz_health.rs \
    && echo 'fn main(){}' > platform/core-api/src/main.rs \
    && cargo build --release -p sovereign-health-backend \
    && rm -rf crates platform apps \
       target/release/sovereign-health-backend \
       target/release/deps/sovereign_health_backend-* \
       target/release/deps/libsovereign_health_backend-* \
       target/release/.fingerprint/sovereign-health-backend-* \
       target/release/build/sovereign-health-backend-* \
       target/release/deps/brickos_* \
       target/release/.fingerprint/brickos-*

# Copy full source for all crates + app and rebuild
# Re-copy all Cargo.toml files (removed in cleanup above)
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
COPY platform ./platform
COPY apps/health/sovereign-health/api/Cargo.toml apps/health/sovereign-health/api/Cargo.toml
COPY apps/health/sovereign-health/api/src ./apps/health/sovereign-health/api/src
COPY apps/health/sovereign-health/api/migrations ./apps/health/sovereign-health/api/migrations
COPY apps/health/sovereign-health/api/benches ./apps/health/sovereign-health/api/benches
COPY apps/health/sovereign-health/api/assets ./apps/health/sovereign-health/api/assets
RUN mkdir -p apps/health/sovereign-health/api/fuzz/fuzz_targets \
    && echo 'fn main(){}' > apps/health/sovereign-health/api/fuzz/fuzz_targets/fuzz_health.rs \
    && cargo build --release -p sovereign-health-backend

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM debian:bookworm-slim
WORKDIR /app

# Only TLS roots for outbound HTTPS; rustls is statically linked
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates fonts-liberation libreoffice-calc \
    && rm -rf /var/lib/apt/lists/*

# Binary + migrations (sqlx::migrate! embeds at compile-time, runtime copy for reference)
COPY --from=builder /app/target/release/sovereign-health-backend ./sovereign-health-backend
COPY --from=builder /app/target/release/encrypt-existing-data ./encrypt-existing-data
COPY --from=builder /app/target/release/migrate-early-access ./migrate-early-access
COPY --from=builder /app/apps/health/sovereign-health/api/migrations ./migrations
COPY --from=builder /app/apps/health/sovereign-health/api/src/config ./src/config
COPY --from=builder /app/apps/health/sovereign-health/api/assets ./assets

EXPOSE 8080
ENV RUST_LOG=info
CMD ["./sovereign-health-backend"]
