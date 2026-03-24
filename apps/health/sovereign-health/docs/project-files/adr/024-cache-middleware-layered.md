# ADR 024: Layered caching — Rust HTTP middleware + Service Worker

**Date:** 2026-03-24
**Status:** Accepted
**Context:** Sprint 011 — PWA Phase 2 (Offline Read + API Caching)

## Decision

Two-layer caching strategy: Rust Actix middleware sets HTTP `Cache-Control` headers, service worker adds client-side caching strategies on top.

## Context

Need both CDN/browser caching (HTTP headers) and offline resilience (SW cache). Single layer insufficient.

## Design

| Route | HTTP Cache-Control | SW Strategy |
|-------|-------------------|-------------|
| Content endpoints | `public, max-age=3600` | Cache-first (1h) |
| User dashboard | `private, max-age=60` | Network-first (10m fallback) |
| User measurements | `private, max-age=300` | Network-first (10m fallback) |
| Health check | `no-cache` | — |
| Mutations | `no-store` | — |
| Auth/billing | `no-store, no-cache` | Network-only |

Middleware is additive — only sets headers if not already set by handler.

## Consequences

- CDN (Cloudflare) respects Cache-Control headers for edge caching
- SW provides offline fallback even when CDN can't help
- Auth-sensitive routes never cached at any layer
- Content updates may take up to 1 hour to propagate (acceptable for reference data)
