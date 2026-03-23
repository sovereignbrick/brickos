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
| | | | |

## Carried Over

TBD

## Unplanned Work

| Title | Points | Commits |
|-------|--------|---------|
| | | |

## Velocity

| Metric | Value |
|--------|-------|
| Planned | 22 pts |
| Completed (planned) | - |
| Completed (unplanned) | - |
| Carried over | - |
| Total delivered | - |

## Notes / Decisions

- Multi-day sprint (2-3 days), follows v0.26.0 production release
- #208 first — faster deploys benefit all subsequent work
- #207 quick fix before GDPR deep work
- GDPR cluster (#176-178) from design doc 018 (settings tab restructure)
- Privacy tab needs: data_access_log table already exists (migration 085), needs frontend UI
- Consent UI needs: newsletter_subscribers + user_settings backend ready, needs frontend toggles
- Unsubscribe needs: backend endpoint exists, needs email footer link + one-click flow
- Sprint 008 retro action items: bench test fix, website TS types — defer to P1 if time permits
