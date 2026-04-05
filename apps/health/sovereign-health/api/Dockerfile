# syntax=docker/dockerfile:1
# ============================================================================
#  SOVEREIGN HEALTH INTELLIGENCE
#  BLOOD · BIOMARKERS · INSIGHT
#  https://sovereignhealth.io/ -- AGPL-3.0
# ============================================================================
#
# Build context: monorepo root (../../../../)
# Set via docker-compose or: docker build -f apps/health/sovereign-health/api/Dockerfile .
#
# Uses cargo-chef for dependency caching. On code-only changes, dependencies
# are served from cache and only app code recompiles (~30s vs 3-4 min).

# ── Chef: install cargo-chef ─────────────────────────────────────────────────
FROM rust:bookworm AS chef
RUN cargo install cargo-chef
WORKDIR /app

# ── Planner: analyze dependencies ────────────────────────────────────────────
FROM chef AS planner
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
COPY platform ./platform
COPY apps/health/sovereign-health/api/Cargo.toml apps/health/sovereign-health/api/Cargo.toml
COPY apps/health/sovereign-health/api/src ./apps/health/sovereign-health/api/src
COPY apps/health/sovereign-health/api/benches ./apps/health/sovereign-health/api/benches
COPY apps/technology/sovereign-link ./apps/technology/sovereign-link
# Stub fuzz target (not in normal builds but referenced in Cargo.toml)
RUN mkdir -p apps/health/sovereign-health/api/fuzz/fuzz_targets \
    && echo 'fn main(){}' > apps/health/sovereign-health/api/fuzz/fuzz_targets/fuzz_health.rs
RUN cargo chef prepare --recipe-path recipe.json

# ── Builder: compile dependencies (cached), then app code ────────────────────
FROM chef AS builder

# pkg-config for linking; no libssl-dev needed (rustls, not openssl)
RUN apt-get update && apt-get install -y --no-install-recommends pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Cook dependencies from recipe (this layer is cached until Cargo.toml/Cargo.lock change)
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json

# Copy full source and build (only app code compiles — deps are cached)
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
COPY platform ./platform
COPY apps/health/sovereign-health/api ./apps/health/sovereign-health/api
COPY apps/technology/sovereign-link ./apps/technology/sovereign-link
# Stub fuzz target
RUN mkdir -p apps/health/sovereign-health/api/fuzz/fuzz_targets \
    && echo 'fn main(){}' > apps/health/sovereign-health/api/fuzz/fuzz_targets/fuzz_health.rs
RUN cargo build --release -p sovereign-health-backend

# ── Runtime stage ────────────────────────────────────────────────────────────
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
