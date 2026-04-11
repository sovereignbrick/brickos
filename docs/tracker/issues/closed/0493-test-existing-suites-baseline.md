---
number: 493
title: "test: [automated] run all existing test suites, capture baseline"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-a, automated]
created: 2026-04-11
priority: P1
sprint: 041
phase: A
estimate: 0.25d
blocked_by: [492]
---

Establish the Sprint 041 baseline by running every existing test suite and capturing pass counts.

## Scope

- [ ] `cargo test -p sovereign-health-backend --lib` (expected: 136+ passing)
- [ ] `cargo test -p sovereign-health-backend --test smoke` (expected: 2 passing)
- [ ] `cargo test -p sovereign-health-backend --test integration` (expected: 10 passing)
- [ ] `cargo test -p brickos-licensing --lib`
- [ ] `cargo test -p brickos-licensing --test embedded_runtime` (needs TEST_DATABASE_URL)
- [ ] `cargo clippy --workspace --all-targets -- -D warnings` (expected: clean)
- [ ] `cargo fmt --all -- --check` (expected: clean)
- [ ] `cd apps/health/sovereign-health/frontend && npx tsc --noEmit` (expected: clean)
- [ ] `cd apps/health/sovereign-health/frontend && pnpm build` (expected: clean)
- [ ] `cd apps/health/sovereign-health/frontend && E2E_BASE_URL=http://localhost:3001 JWT_SECRET=... npx playwright test e2e/sprint-040-smoke.spec.ts` (expected: 7/7 passing)

Capture the exact counts in `sprint-041-lessons.md` as the sprint baseline.

## Who

Claude (automated).

## Verification

- Every suite listed has a pass count recorded in the lessons doc
- Any regression from the Sprint 040 baseline gets a bug issue filed immediately with P0
