# Stage 1: Build
FROM rust:1.86-slim AS builder
WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy workspace root files for dependency resolution
COPY Cargo.toml Cargo.lock ./

# Copy workspace members needed for the build
COPY crates ./crates
COPY platform ./platform
COPY apps/technology/sovereign-link ./apps/technology/sovereign-link

# Build standalone binary
RUN cargo build --release -p sovereign-link --no-default-features --features standalone

# Stage 2: Runtime
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /build/target/release/sovereign-link ./sovereign-link

# Create data directory
RUN mkdir -p /data

ENV SOVEREIGN_LINK_DB_PATH=/data/data.db
ENV SOVEREIGN_LINK_HOST=0.0.0.0
ENV SOVEREIGN_LINK_PORT=8080

EXPOSE 8080
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["./sovereign-link"]
