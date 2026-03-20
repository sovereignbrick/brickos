# ADR-009: Docker-Only Development

**Status:** Accepted
**Date:** 2026-03-08

## Context
"Works on my machine" problems waste time. The backend requires PostgreSQL with pgaudit, Redis, and specific environment variables. The frontend requires specific Node/pnpm versions and build-time environment variables.

## Decision
All development, testing, and deployment must use **Docker containers**. Never run `cargo run` or `pnpm dev` directly on the host. Docker Compose files provide identical environments locally, on staging, and in production.

| File | Purpose |
|------|---------|
| `docker-compose.dev.yml` | Local development |
| `docker-compose.staging.yml` | Staging (VPS) |
| `docker-compose.prod.yml` | Production (VPS) |
| `docker-compose.selfhosted.yml` | OSS self-hosted |

## Alternatives Considered
- **Direct execution:** Faster dev loop but requires local PostgreSQL + pgaudit + Redis setup. Different developers get different behavior.
- **Nix/devenv:** Reproducible but steep learning curve and poor Docker interop.

## Consequences
- **Easier:** Reproducible environments, onboarding is `docker compose up`, staging mirrors production exactly.
- **Harder:** Slightly slower dev loop (container rebuild), Docker Desktop resource usage on Mac/Windows.
- **Convention:** Dockerfiles use multi-stage builds. Backend: `rust:1.83-slim` build stage → `debian:bookworm-slim` runtime. Frontend: `node:22-alpine` build → `node:22-alpine` runtime with `standalone` output.
