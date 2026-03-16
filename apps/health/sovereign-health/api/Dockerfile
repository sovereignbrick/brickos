# syntax=docker/dockerfile:1
# ============================================================================
#  SOVEREIGN HEALTH INTELLIGENCE
#  BLOOD · BIOMARKERS · INSIGHT
#  https://sovereignhealth.io/ -- AGPL-3.0
# ============================================================================

# ── Build stage ────────────────────────────────────────────────────────────────
FROM rust:bookworm AS builder
WORKDIR /app

# pkg-config for linking; no libssl-dev needed (crate uses rustls, not openssl)
RUN apt-get update && apt-get install -y --no-install-recommends pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests first for dependency layer caching
COPY Cargo.toml Cargo.lock ./

# Build deps only with dummy stubs for all declared targets
RUN mkdir -p src src/bin benches fuzz/fuzz_targets migrations \
    && echo 'fn main(){}' > src/main.rs \
    && echo 'fn main(){}' > src/lib.rs \
    && echo 'fn main(){}' > src/bin/encrypt_existing_data.rs \
    && echo 'fn main(){}' > src/bin/migrate_early_access.rs \
    && echo 'fn main(){}' > benches/endpoints.rs \
    && echo 'fn main(){}' > fuzz/fuzz_targets/fuzz_health.rs \
    && cargo build --release \
    && rm -rf src benches fuzz migrations \
       target/release/sovereign-health-backend \
       target/release/deps/sovereign_health_backend-* \
       target/release/deps/libsovereign_health_backend-* \
       target/release/.fingerprint/sovereign-health-backend-* \
       target/release/build/sovereign-health-backend-*

# Copy full source and rebuild (clean rebuild of main crate to embed migrations)
COPY src ./src
COPY migrations ./migrations
COPY benches ./benches
COPY assets ./assets
RUN mkdir -p fuzz/fuzz_targets \
    && echo 'fn main(){}' > fuzz/fuzz_targets/fuzz_health.rs \
    && cargo build --release

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM debian:bookworm-slim
WORKDIR /app

# Only TLS roots for outbound HTTPS; rustls is statically linked
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Binary + migrations (sqlx::migrate! embeds at compile-time, runtime copy for reference)
COPY --from=builder /app/target/release/sovereign-health-backend ./sovereign-health-backend
COPY --from=builder /app/target/release/encrypt-existing-data ./encrypt-existing-data
COPY --from=builder /app/target/release/migrate-early-access ./migrate-early-access
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/src/config ./src/config
COPY --from=builder /app/assets ./assets

EXPOSE 8080
ENV RUST_LOG=info
CMD ["./sovereign-health-backend"]
