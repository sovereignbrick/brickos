# Sprint 006 - DX Hardening & UX Polish

**Started:** 2026-03-21
**Completed:** 2026-03-21
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

## Completed

| # | Title | Points | Commits |
|---|-------|--------|---------|
| #153 | fix: resolve Projects vs projects path inconsistency | 3 | `503c7eb` |
| - | chore: production v0.23.0 spot check (A-L all OK) | 2 | - |
| #154 | feat: Dr. Alex URL routing (/doctor-chat vs /doctor-chat/[id]) + navbar | 8 | `cb92828` |
| #155 | feat: conversation delete endpoint + frontend wiring | 3 | `805531b` |
| #156 | fix: replace 3 native date inputs with DateOnlyPicker | 2 | `805531b` |
| #157 | fix: React hydration error #418 (DatePicker SSR guard) | 2 | `805531b` |
| #158 | refactor: extract MultiSelect to @brickos/ui shared package | 2 | `f99168e` |
| #159 | chore: auto-increment staging build numbers + image verification | 3 | `5cf46dc` |
| | **Planned Total** | **25** | |

## Carried Over

None - all planned items completed.

## Unplanned Work

| Title | Points | Commits |
|-------|--------|---------|
| fix: German BP aliases in marker matcher (Blutdruck syst/diast) | 2 | `cb92828` |
| fix: false-positive AST match (min alias length 3->4) | 1 | `cb92828` |
| fix: ODS multi-sheet import (wrong sheet selected alphabetically) | 2 | `cb92828` |
| fix: ODS first-sheet-only export (LibreOffice flag -1->0) | 1 | `cb92828` |
| fix: German aliases in AI prompt context for foreign-language matching | 1 | `cb92828` |
| fix: source column name priority over AI marker_slug in enrichment | 1 | `cb92828` |
| feat: editable protocol mapping dropdown (7 Messzeitpunkt options) | 2 | `e4c019f`, `263250e` |
| fix: protocol tag i18n (fasting->Nuchtern, postprandial->Nach dem Essen) | 1 | `d8cd411` |
| feat: duplicate row detection + amber highlighting in import review | 1 | `cb92828` |
| fix: em-dash removal across import review screens | 0.5 | `cb92828` |
| fix: locale-aware re-fetch on dashboard + zone detail pages | 1 | `cb92828` |
| fix: newsletter_subscribers sync on signup + settings toggle | 1 | `c3d9ff8` |
| fix: Docker build context for @brickos/ui workspace package | 1 | `f99168e`, `e3bed79` |
| fix: deploy script lockfile check for workspace deps | 0.5 | `e3bed79` |
| docs: v0.24.0-rc1 manual testing checklist (100 items, 16 layers) | 1 | `7b1d125` |
| docs: v0.24.0-rc1 testing strategy report | 1 | `6ef5551` |
| docs: v0.24.0-rc1 test execution report for security review | 1 | `4e39389` |
| chore: created GitHub issue #166 (T&C fair use policy) | 0 | - |
| **Unplanned Total** | **~19** | |

## Velocity

| Metric | Value |
|--------|-------|
| Planned | 25 pts |
| Completed (planned) | 25 pts |
| Completed (unplanned) | ~19 pts |
| Carried over | 0 pts |
| Total delivered | ~44 pts |
| Commits | 23 |
| Staging deploys | 6 |

## Notes / Decisions

- Production was at v0.23.0 at sprint start (deployed earlier same day)
- Staging deployed to v0.23.0-b1 during sprint for verification
- Created `packages/ui` (@brickos/ui) as the shared component library - first component: MultiSelect
- Docker build context changed from frontend dir to monorepo root to support workspace packages
- Dr. Alex now has proper URL routing: `/doctor-chat` (landing) vs `/doctor-chat/[id]` (conversation)
- Marker matcher improved with 22 new German aliases and false-positive prevention
- Import pipeline: first-sheet-only for ODS, source_name priority over AI, editable protocol mapping
- Newsletter subscribers table now synced from signup + settings, fixing empty admin panel
- All 324 automated tests passing (101 BE + 223 FE)
