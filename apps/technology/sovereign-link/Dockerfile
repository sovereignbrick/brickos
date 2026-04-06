# Sovereign Link - Standalone Docker Image
# Part of the brickos.io platform
#
# Build from monorepo root:
#   docker build -f apps/technology/sovereign-link/Dockerfile -t brickos/sovereign-link .
#
# Run:
#   docker run -d -p 8080:8080 -v sl-data:/data brickos/sovereign-link

# Stage 1: Build
FROM rust:1.88-slim AS builder
WORKDIR /build

# Install build dependencies (rustls, no openssl)
RUN apt-get update && apt-get install -y pkg-config && rm -rf /var/lib/apt/lists/*

# Copy workspace files for dependency resolution
COPY Cargo.toml Cargo.lock ./

# Copy all workspace members referenced in Cargo.toml
# (cargo needs them to resolve the workspace, even if we only build sovereign-link)
COPY crates ./crates
COPY platform ./platform
COPY apps/technology/sovereign-link ./apps/technology/sovereign-link

# Create stub directories for other workspace members so cargo can resolve
RUN mkdir -p apps/health/sovereign-health/api/src && \
    echo "" > apps/health/sovereign-health/api/src/lib.rs && \
    cp apps/technology/sovereign-link/Cargo.toml apps/health/sovereign-health/api/Cargo.toml && \
    sed -i 's/name = "sovereign-link"/name = "sovereign-health-backend"/' apps/health/sovereign-health/api/Cargo.toml && \
    sed -i 's/standalone.*\]//' apps/health/sovereign-health/api/Cargo.toml

# Build only sovereign-link standalone
RUN cargo build --release -p sovereign-link --no-default-features --features standalone 2>&1 || \
    (echo "Build failed. Trying with workspace member exclusion..." && \
     cd apps/technology/sovereign-link && \
     cargo build --release --no-default-features --features standalone)

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
