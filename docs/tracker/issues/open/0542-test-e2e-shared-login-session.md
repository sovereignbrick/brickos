---
number: 542
title: "test: E2E shared login session to avoid rate limiter cascade"
milestone: "Sprint 044 -- White-Label Go-Live"
labels: [test, e2e, p2]
created: 2026-04-18
priority: P2
estimate: 0.4d
blocked_by: []
---

8/11 Playwright tests fail on staging because each test performs its own
login, triggering the auth rate limiter after ~5 attempts.

## Implementation

Use `globalSetup` to authenticate once, store JWT in a shared state file.
Each test reuses the stored token via `storageState`.

## Acceptance

- All 11 platform-session tests pass in a single staging run
- Login occurs exactly once per suite run
- Rate limiter not triggered
