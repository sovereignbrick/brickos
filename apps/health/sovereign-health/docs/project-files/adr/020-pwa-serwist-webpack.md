# ADR 020: PWA via @serwist/next with webpack build

**Date:** 2026-03-24
**Status:** Accepted
**Context:** Sprint 011 — Progressive Web App

## Decision

Use `@serwist/next` v9.5.7 for service worker management with `next build --webpack` flag.

## Context

Next.js 16 defaults to Turbopack, but `@serwist/next` only supports webpack. Options considered:
1. `next-pwa` — unmaintained since 2023
2. `@serwist/next` — active successor, App Router support, Workbox under the hood
3. Manual service worker — too much boilerplate

## Consequences

- Build script changed from `next build` to `next build --webpack`
- `tsconfig.json` adds `webworker` lib for SW types
- Generated `sw.js` added to `.gitignore` (build artifact)
- Will migrate to `@serwist/turbopack` when Turbopack support stabilizes (tracking: serwist/serwist#54)
