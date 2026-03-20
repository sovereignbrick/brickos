# ADR-008: Local CI/CD — No External CI Provider

**Status:** Accepted
**Date:** 2026-03-08

## Context
Most SaaS platforms use GitHub Actions, GitLab CI, or similar hosted CI/CD. However, our builds involve transferring Docker images to a VPS via SSH, and we want full control over the deployment pipeline without third-party dependencies.

## Decision
All builds and deployments run on the **developer's local machine** via `ops/deploy.sh`. No GitHub Actions, no GitLab CI, no external build service.

**Pipeline:** `cargo build` → `docker build` → `docker save | ssh docker load` → `docker compose up -d` → verify.

**Monitoring** (separate concern): Gatus + ntfy + Telegram for post-deploy observability.

## Alternatives Considered
- **GitHub Actions:** Free for public repos but requires secrets in GitHub, adds vendor dependency, slower feedback loop (wait for runner).
- **GitLab CI:** Self-hosted option but adds infrastructure burden (GitLab Runner on VPS).
- **Drone CI:** Lightweight self-hosted CI but another service to maintain.

## Consequences
- **Easier:** Full control, no secrets in third-party systems, instant feedback (local builds), no CI minutes limits, works offline.
- **Harder:** No automated PR checks, no branch protection via CI, manual discipline required for pre-deploy checks.
- **Mitigation:** Pre-flight checks in `deploy.sh` (lint, tests, lockfile sync) serve as the CI gate. Version assertion after deploy catches mismatches.
