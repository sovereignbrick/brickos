# ADR-005: rustls for TLS — No OpenSSL

**Status:** Accepted
**Date:** 2026-03-08

## Context
The backend Docker image uses `debian:bookworm-slim` which does not include `libssl-dev`. Adding OpenSSL increases image size, introduces a native dependency, and expands the attack surface.

## Decision
Use **rustls** (pure Rust TLS implementation) everywhere. Never add `native-tls` or `openssl` as a dependency.

- SQLx: `runtime-tokio-rustls` feature
- reqwest: `rustls-tls` feature
- All HTTP clients use rustls

## Alternatives Considered
- **OpenSSL (native-tls):** Industry standard but requires system library, increases image size, has had critical CVEs (Heartbleed, etc.).
- **ring + webpki:** Lower-level building blocks that rustls already uses internally.

## Consequences
- **Easier:** No system SSL dependencies, smaller Docker images, statically linked, portable across Linux distributions.
- **Harder:** Some edge cases with exotic TLS configurations or client certificates may require workarounds.
- **Critical rule:** This is a hard constraint. Adding `native-tls` or `openssl` to any crate will break the Docker build.
