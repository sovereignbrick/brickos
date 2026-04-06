# ADR 034: Staging uses Docker cache, production uses --no-cache

**Status:** Accepted
**Date:** 2026-04-05
**Context:** Sprint 023 -- deploy speed optimization

## Context
Each staging deploy took ~14 minutes due to `--no-cache` on the Docker build. During Sprint 023, 8 staging deploys were needed for iterative search fixes, wasting ~2 hours on builds. The `--no-cache` flag was originally added for production reliability after a Sprint 014 incident where cached layers masked a dependency change.

## Decision
Split the build strategy by environment:

- **Staging**: Docker build WITH layer caching (no `--no-cache` flag). cargo-chef in the Dockerfile separates dependency compilation from source compilation. Only source changes trigger recompilation (~2-3 min instead of ~10 min).
- **Production**: Docker build with `--no-cache` for full reproducibility. Every production build starts from scratch to ensure no stale layers.

## Alternatives Considered
- **--no-cache everywhere**: Rejected -- 14 min per staging deploy is unacceptable for iterative development
- **Cache everywhere**: Rejected -- production needs full reproducibility to catch dependency issues
- **Build on VPS**: Considered for Sprint 024 (#307) -- would eliminate the image transfer step (~3 min) entirely
- **Container registry (ghcr.io)**: Considered -- push once, pull from VPS. Adds registry dependency.

## Consequences
- Staging deploys: ~4-6 min (was ~14 min). 3x faster iteration.
- Production deploys: unchanged (~18 min). Full rebuild ensures no stale layers.
- Risk: staging could theoretically have a stale dependency layer. Mitigated by: production deploy always catches this, and `cargo update` in the sprint forces dependency refresh.
- Component-only deploys (`staging backend`, `staging frontend`) were already supported -- combined with caching, a frontend-only staging deploy takes ~3 min.
