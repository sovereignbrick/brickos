# ADR 023: Playwright E2E tests run against production

**Date:** 2026-03-24
**Status:** Accepted
**Context:** Sprint 013 — Playwright E2E setup

## Decision

Playwright E2E tests run against the live production/staging URLs, not a local dev server. Auth credentials passed via environment variables.

## Context

Options:
1. E2E against local dev server — requires full stack running locally
2. E2E against staging — tests real infrastructure, catches deploy issues
3. E2E against production — tests what users actually see

## Design

- Default: `E2E_BASE_URL=https://app.sovereignhealth.io` (production)
- Auth tests require `E2E_USER_EMAIL` + `E2E_USER_PASSWORD` env vars
- Without credentials: 12 public tests pass, 3 auth tests skip
- With credentials: 15/15 pass
- Single login shared across auth tests (avoids rate limiting)
- Retries: 1 (catches flaky network issues)

## Consequences

- Tests validate real deployment, not just code
- Rate limiting can interfere — auth tests consolidated into single login
- Demo account password must be known and consistent across environments
- Tests take ~11s (network latency), not instant like unit tests
