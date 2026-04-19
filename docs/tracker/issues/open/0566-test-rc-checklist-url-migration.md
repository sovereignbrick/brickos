---
number: 566
title: "test: migrate Sprint 044 RC checklist URLs to *.demo.sovereignhealth.io + re-run"
milestone: "Sprint 045 -- Domain Realignment"
labels: [test, rc, p0, white-label]
created: 2026-04-19
priority: P0
estimate: 0.5d
blocked_by: [561, 562, 563, 564]
parent: 559
phase: 6
---

Phase 6a of Design 025. The 71-item RC checklist from Sprint 044 uses `test-clinic.demo.brickos.io` throughout. After #561-#564 land on staging, migrate the URLs and re-run the full manual testing session.

## Scope

File: `docs/releases/sovereign-health/v0.42.0/2026-04-19_manual-testing-checklist_sprint-044-rc1.md` (or rename with Sprint 045 / new v in the filename).

Search-and-replace:
- `test-clinic.demo.brickos.io` -> `test-clinic.demo.sovereignhealth.io`
- `nonexistent.demo.brickos.io` -> `nonexistent.demo.sovereignhealth.io`
- `{slug}.demo.brickos.io` generic pattern -> `{slug}.demo.sovereignhealth.io`

Leave `demo.brickos.io` platform URLs unchanged (`demo.brickos.io/login` remains the BrickOS admin login).

Also update the intro note: staging org subdomain pattern is now `{slug}.demo.sovereignhealth.io`.

## Re-run

Run the full 71-item checklist with a fresh test session. Save results incrementally per `feedback_save_rc_state_incrementally.md`.

Any failures -> file as sub-issues, link back to #566.

## Acceptance

- RC markdown fully migrated, no stale `demo.brickos.io` org subdomain URLs remain
- All 71 items re-tested and ticked (or failures filed)
- End-user flow (login, dashboard, measurements, doctor-chat) works on `test-clinic.demo.sovereignhealth.io`
- Platform admin flow (create org, manage org) still works on `demo.brickos.io`
- Org admin flow (manage org settings) still works on `demo.brickos.io/org/*`
