# Sprint 009 - Build Optimization & GDPR Compliance

**Started:** 2026-03-24
**Goal:** Cut deploy times with cargo-chef, fix remaining marker gaps, and ship GDPR compliance (privacy tab, consent UI, email unsubscribe).

## Planned

| # | Title | Points | Area |
|---|-------|--------|------|
| [#208](https://github.com/sovereignbrick/brickos/issues/208) | feat: cargo-chef + component-level deploy | 5 | Ops |
| [#207](https://github.com/sovereignbrick/brickos/issues/207) | fix: FSH alias (no hyphen) + Total Fatty Acids marker | 2 | API |
| [#176](https://github.com/sovereignbrick/brickos/issues/176) | feat: GDPR privacy tab — access log UI (Art. 15) | 5 | Full-stack |
| [#177](https://github.com/sovereignbrick/brickos/issues/177) | feat: GDPR consent management UI — newsletter + partner offers | 5 | Full-stack |
| [#178](https://github.com/sovereignbrick/brickos/issues/178) | feat: GDPR email unsubscribe wiring (CAN-SPAM) | 5 | Full-stack |
| | **Total** | **22** | |

## Completed

| # | Title | Points | Commits |
|---|-------|--------|---------|
| #208 | feat: cargo-chef + component-level deploy | 5 | 9642289 |
| #207 | fix: FSH alias + Total Fatty Acids marker | 2 | 9642289 |
| #176 | feat: GDPR privacy tab — access log UI | 5 | 1238984 |
| #177 | feat: GDPR consent management UI | 5 | 1238984 |
| #178 | feat: GDPR email unsubscribe | 5 | 1238984 |

## Carried Over

None

## Unplanned Work

| Title | Points | Commits |
|-------|--------|---------|
| refactor: settings page split (3599→198 lines + 7 components) | 3 | 7439bc3 |
| fix: translate access log action/resource values (EN + DE) | 0 | 424c3f0 |

## Velocity

| Metric | Value |
|--------|-------|
| Planned | 22 pts |
| Completed (planned) | 22 pts |
| Completed (unplanned) | 3 pts |
| Carried over | 0 |
| Total delivered | 25 pts |

## Notes / Decisions

- Multi-day sprint (2-3 days), follows v0.26.0 production release
- #208 first — faster deploys benefit all subsequent work
- #207 quick fix before GDPR deep work
- GDPR cluster (#176-178) from design doc 018 (settings tab restructure)
- Privacy tab needs: data_access_log table already exists (migration 085), needs frontend UI
- Consent UI needs: newsletter_subscribers + user_settings backend ready, needs frontend toggles
- Unsubscribe needs: backend endpoint exists, needs email footer link + one-click flow
- Sprint 008 retro action items: bench test fix, website TS types — defer to P1 if time permits
