---
github_number: 373
title: "chore: complete Playwright E2E tests for platform admin"
milestone: platform-admin-gui
labels: [chore, P2]
---

## Problem

Playwright E2E test skeleton exists (`e2e/platform-session.spec.ts`) but fails due to rate limiter blocking automated login. Need to:

1. Bypass or increase rate limit for test accounts
2. Complete test coverage: login -> dashboard -> services -> analytics -> users
3. Add tests for SHI features via brickos.io domain
4. Add tests for vanity code edit + link edit UI
5. Run in CI pipeline

## Files

- `apps/health/sovereign-health/frontend/e2e/platform-session.spec.ts`
- `apps/health/sovereign-health/frontend/playwright.config.ts`
