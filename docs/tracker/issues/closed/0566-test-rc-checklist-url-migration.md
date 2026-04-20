---
number: 566
title: "test: edit RC checklist in place -- add admin-plane (*.brickos.io) + end-user-plane (*.sovereignhealth.io) sections"
milestone: "Sprint 045 -- Domain Realignment"
labels: [test, rc, p0, white-label]
created: 2026-04-19
priority: P0
estimate: 0.5d
blocked_by: [561, 562, 563, 564, 565]
parent: 559
phase: 6
---

Phase 6a of Design 025. The 71-item RC checklist from Sprint 044 uses `test-clinic.demo.brickos.io` throughout, assuming that's where end users log in. After Sprint 045, each tenant has TWO subdomains. Edit the checklist in place (no rename) to cover both planes.

## Scope

File: `docs/releases/sovereign-health/v0.42.0/2026-04-19_manual-testing-checklist_sprint-044-rc1.md`

Transform the structure:

- **Section A: Admin plane (`*.demo.brickos.io`)** -- everything related to org admin UI, platform admin, org creation, branding upload, members, billing, domains, affiliate, app toggles. Keep the current `test-clinic.demo.brickos.io` URLs.
- **Section B: End-user plane (`*.demo.sovereignhealth.io`)** -- everything related to end-user login, dashboard, measurements, doctor-chat, settings, markers, trends, zones. Change URLs to `test-clinic.demo.sovereignhealth.io`.
- **Section C: Cross-plane** -- visiting end-user path on admin subdomain redirects, and vice versa. Verify plane gating from #564.
- **Section D: Platform (`demo.brickos.io`, `app.sovereignhealth.io`)** -- existing platform admin + default SHI fallback checks.

## Re-run

Run the full checklist with a fresh test session per `feedback_save_rc_state_incrementally.md`.

Version string in the checklist intro -- update from v0.42.0 to v0.43.0.

## Acceptance

- RC markdown split into A/B/C/D sections as above, no stale URLs
- Version label reflects v0.43.0
- All items tested, pass or failure documented
- Admin plane works on `test-clinic.demo.brickos.io`
- End-user plane works on `test-clinic.demo.sovereignhealth.io`
- Cross-plane redirects work as specified in #564
