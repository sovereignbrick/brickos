# ADR-001: Rust + Actix-web for Backend API

**Status:** Accepted
**Date:** 2026-03-08

## Context
We needed a backend framework for a health data platform that processes sensitive biomarker data, runs on a single VPS, and must handle concurrent requests efficiently with minimal resource usage.

## Decision
Use **Rust** with **Actix-web 4** as the HTTP framework and **Tokio** as the async runtime.

## Alternatives Considered
- **Node.js (Express/Fastify):** Faster to prototype but higher memory usage for long-running services. GC pauses undesirable for health data processing.
- **Python (FastAPI):** Excellent DX but significantly slower at scale. Would require more VPS resources.
- **Go (Gin/Echo):** Strong concurrency model but weaker type system. No compile-time query validation equivalent to SQLx.

## Consequences
- **Easier:** Memory safety without GC, compile-time guarantees catch bugs before deployment, excellent performance on a single VPS, small Docker images (~50MB).
- **Harder:** Steeper learning curve, slower compile times, smaller ecosystem for web libraries.
- **Trade-off:** Development speed for runtime reliability — appropriate for a health platform where data correctness is critical.
