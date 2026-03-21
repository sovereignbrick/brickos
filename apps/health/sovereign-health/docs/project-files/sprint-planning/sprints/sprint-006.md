# Sprint 006 - DX Hardening & UX Polish

**Started:** 2026-03-21
**Completed:** ongoing
**Goal:** Fix deployment reliability issues, standardize date controls, improve Dr. Alex UX, and verify production v0.23.0.

## Planned

| # | Title | Points | Area |
|---|-------|--------|------|
| [#153](https://github.com/sovereignbrick/brickos/issues/153) | fix: resolve Projects vs projects path inconsistency | 3 | Ops |
| - | chore: production v0.23.0 spot check (all 18 sections quick pass) | 2 | Ops |
| [#154](https://github.com/sovereignbrick/brickos/issues/154) | feat: Dr. Alex navigation + follow-up responsiveness | 8 | Frontend + API |
| [#155](https://github.com/sovereignbrick/brickos/issues/155) | feat: conversation delete endpoint + frontend wiring | 3 | API + Frontend |
| [#156](https://github.com/sovereignbrick/brickos/issues/156) | fix: replace native date inputs with DateOnlyPicker (3 locations) | 2 | Frontend |
| [#157](https://github.com/sovereignbrick/brickos/issues/157) | fix: React hydration error #418 on measurements page | 2 | Frontend |
| [#158](https://github.com/sovereignbrick/brickos/issues/158) | refactor: extract MultiSelect to shared component | 2 | Frontend |
| [#159](https://github.com/sovereignbrick/brickos/issues/159) | chore: deploy script - staging build numbers + post-deploy verification | 3 | Ops |
| | **Total** | **25** | |

## Scope Notes

- Single-day sprint, 25 pts planned (at guideline cap - P2 items are stretch)
- Date controls: use `DateOnlyPicker` for date-only fields, `DateTimePicker` for date+time fields (both in `src/components/date-time-picker.tsx`)
- Native date inputs found at: `import-review.tsx:130`, `promotions-tab.tsx:368,377` (all date-only)
- Production review: quick pass through all 18 checklist sections on app.sovereignhealth.io, not full retest
- #153 is highest priority - blocks all future deploys from being reliable

## Phase Order

1. **#153:** Fix paths first (unblocks everything)
2. **Spot check:** Production v0.23.0 quick pass
3. **#156:** Date controls (3 native inputs -> DateOnlyPicker, quick wins)
4. **#157:** Hydration error (investigate, may be quick)
5. **#155:** Conversation delete (backend endpoint + frontend wiring)
6. **#154:** Dr. Alex navigation + responsiveness (largest task)
7. **#158, #159:** Stretch goals if time permits

## Completed
_(to be filled during sprint)_

## Carried Over
_(to be filled at sprint close)_

## Unplanned Work
_(to be filled during sprint)_

## Velocity

| Metric | Value |
|--------|-------|
| Planned | 25 pts |
| Completed | - |
| Carried over | - |
| Unplanned | - |

## Notes / Decisions
- Production is at v0.23.0 (deployed 2026-03-21)
- Staging is at v0.23.0 (same code as production)
