# Sprint 003 — Stabilize & Strengthen

**Started:** 2026-03-20
**Completed:** ongoing
**Goal:** Harden the production deployment pipeline, fix remaining deploy tooling gaps, and shift focus toward product quality and feature depth now that v0.20.0 is live.

## Context

Sprint 002 shipped v0.20.0 to production — the first public release. During the production deploy, we discovered that the VPS compose file had stale GitLab registry image names, causing deploys to silently use old images. The retro also identified version bump coordination (5 files), missing deploy verification, and uncontrolled scope expansion as key areas to improve. Sprint 003 focuses on closing those gaps, then investing in product quality.

---

## Phase 1 — Deploy Pipeline Fixes (retro actions)

| # | Title | Points | Area |
|---|-------|--------|------|
| — | feat: `bump-version.sh` — update all 5 version files in one command | 2 | Ops |
| — | fix: version-control compose files in repo, deploy them alongside images | 2 | Ops |
| — | feat: post-deploy image ID verification in deploy.sh | 1 | Ops |
| — | fix: Cloudflare credentials in deploy .env path | 1 | Ops |
| — | fix: audit all COALESCE-based update handlers for missing INSERT | 2 | API |
| **Subtotal** | | **8 pts** | |

## Phase 2 — Dependabot & Hygiene

| # | Title | Points | Area |
|---|-------|--------|------|
| [#37](https://github.com/sovereignbrick/brickos/issues/37) | build(deps): bump @base-ui/react 1.2.0 → 1.3.0 | 1 | Frontend |
| [#36](https://github.com/sovereignbrick/brickos/issues/36) | build(deps-dev): bump @types/node 20.x → 25.x | 1 | Frontend |
| [#35](https://github.com/sovereignbrick/brickos/issues/35) | build(deps): bump actix-governor 0.5.0 → 0.10.0 | 2 | API |
| [#34](https://github.com/sovereignbrick/brickos/issues/34) | build(deps): bump rand 0.8.5 → 0.9.2 | 2 | API |
| [#33](https://github.com/sovereignbrick/brickos/issues/33) | build(deps): bump criterion 0.5.1 → 0.8.2 | 1 | API |
| [#4](https://github.com/sovereignbrick/brickos/issues/4) | build(deps): update thiserror 1 → 2 | 2 | API |
| — | chore: clean up crash-report files from repo root | 1 | Hygiene |
| **Subtotal** | | **10 pts** | |

## Phase 3 — Product Quality & Features

| # | Title | Points | Area |
|---|-------|--------|------|
| [#116](https://github.com/sovereignbrick/brickos/issues/116) | feat: extend Analysis tab with richer visualizations | 8 | Frontend |
| — | feat: E2E browser tests (Playwright) — critical paths | 8 | Testing |
| — | feat: release notes auto-generation from conventional commits | 3 | Ops |
| **Subtotal** | | **19 pts** | |

---

## Velocity

| Metric | Value |
|---|---|
| Phase 1 (deploy fixes) | 8 pts |
| Phase 2 (deps & hygiene) | 10 pts |
| Phase 3 (product quality) | 19 pts |
| **Total planned** | **37 pts** |
| **Unplanned buffer (20%)** | 7 pts |
| Sprint 002 velocity | ~91 pts (2 days, exceptional) |
| Sprint 001 velocity | ~44 pts (8 days) |

## Execution Order

```
Day 1 (2026-03-20):
  Phase 1: Deploy pipeline fixes
    bump-version.sh                → 30 min, prevents version drift
    Compose files in repo          → 30 min, prevents VPS drift
    Post-deploy image ID check     → 15 min, catches stale container
    CF credentials fix             → 10 min, enables auto cache purge
    COALESCE audit                 → 1 hr, prevents silent data loss

  Phase 2: Dependabot batch
    Review + merge all 6 PRs       → batch session, full CI run after
    Clean up crash-report files    → 5 min

Week 1 (Phase 3):
  #116 Analysis tab               → major feature work
  E2E tests (Playwright)          → critical path coverage
  Release notes generation        → nice-to-have if time permits
```

## Definition of Done for Sprint 003

- [ ] `bump-version.sh` exists and updates all 5 files
- [ ] Production compose file is version-controlled and deployed by deploy.sh
- [ ] Post-deploy verification checks container image SHA
- [ ] Cloudflare cache purge works automatically on production deploy
- [ ] All COALESCE update handlers have INSERT ON CONFLICT guards
- [ ] All Dependabot PRs merged or closed with reason
- [ ] CI green on develop after dep updates
- [ ] Analysis tab has at least 2 new visualization types
- [ ] Playwright E2E covers: login → add measurement → view trend

## Backlog (Sprint 004 candidates)

| # | Title | Points | Milestone |
|---|-------|--------|-----------|
| — | feat: data sovereignty — vendor data mirrors | 8 | Data Sovereignty |
| — | feat: OAuth / social login | 5 | Auth Modernization |
| — | feat: mobile-responsive PWA improvements | 5 | UX & Onboarding |
| — | feat: multi-language expansion (FR, ES) | 5 | Internationalization |
| — | feat: doctor-patient data sharing portal | 8 | Health Intelligence |

## Notes / Decisions

- Sprint 003 has a **20% unplanned buffer** (7 pts) based on Sprint 002 retro lesson. Issues found during the sprint consume this buffer before expanding scope.
- Phase 1 is all retro action items — these are non-negotiable and must complete before feature work.
- Dependabot PRs (#4, #33–#37) should be reviewed and merged in one batch session with a full CI run afterward. Breaking changes (thiserror 1→2, rand 0.8→0.9, actix-governor 0.5→0.10) need careful review.
- E2E tests are a stretch goal — if they don't fit, they carry to Sprint 004.
- Sprint 002 retro is at `retrospectives/2026-03-19_sprint-002-retro.md`.
