# Sprint 006 - DX Hardening & UX Polish

**Started:** 2026-03-21
**Completed:** ongoing
**Goal:** Fix deployment reliability issues, standardize date controls, improve Dr. Alex UX, and verify production v0.23.0.

## Planned

| # | Title | Points | Area |
|---|-------|--------|------|
| P0-1 | fix: resolve Projects vs projects path inconsistency (#153) | 3 | Ops |
| P0-2 | chore: production v0.23.0 spot check (all 18 sections quick pass) | 2 | Ops |
| P1-1 | feat: Dr. Alex navigation - back to start screen, clickable header (#154) | 3 | Frontend |
| P1-2 | feat: Dr. Alex - improve follow-up question responsiveness (#154) | 5 | API |
| P1-3 | feat: conversation delete backend endpoint + frontend wiring | 3 | API + Frontend |
| P1-4 | fix: replace native date inputs with DateOnlyPicker (3 locations) | 2 | Frontend |
| P1-5 | fix: import review date control - use DateOnlyPicker with locale | 2 | Frontend |
| P1-6 | fix: React hydration error #418 on measurements page | 2 | Frontend |
| P2-1 | refactor: extract MultiSelect to shared component | 2 | Frontend |
| P2-2 | chore: deploy script - staging build numbers + post-deploy verification | 3 | Ops |
| | **Total** | **27** | |

## Scope Notes

- Single-day sprint, 27 pts planned (slightly over 25 pt guideline - P2 items are stretch)
- Date controls: use `DateOnlyPicker` for date-only fields, `DateTimePicker` for date+time fields (both in `src/components/date-time-picker.tsx`)
- Native date inputs found at: `import-review.tsx:130`, `promotions-tab.tsx:368,377` (all date-only)
- Production review: quick pass through all 18 checklist sections on app.sovereignhealth.io, not full retest
- #153 is highest priority - blocks all future deploys from being reliable

## Phase Order

1. **P0-1:** Fix paths first (unblocks everything)
2. **P0-2:** Production spot check (verify v0.23.0 is healthy)
3. **P1-4, P1-5:** Date controls (small, quick wins)
4. **P1-6:** Hydration error (investigate, may be quick)
5. **P1-1, P1-3:** Dr. Alex navigation + delete (frontend work)
6. **P1-2:** Dr. Alex responsiveness (prompt engineering, needs testing)
7. **P2-1, P2-2:** Stretch goals if time permits

## Completed
_(to be filled during sprint)_

## Carried Over
_(to be filled at sprint close)_

## Unplanned Work
_(to be filled during sprint)_

## Velocity

| Metric | Value |
|--------|-------|
| Planned | 27 pts |
| Completed | - |
| Carried over | - |
| Unplanned | - |

## Notes / Decisions
- Production is at v0.23.0 (deployed 2026-03-21)
- Staging is at v0.23.0 (same code as production)
