# Sprint 002 — Launch & Automate

**Started:** 2026-03-19
**Completed:** ongoing
**Goal:** Close all launch blockers (billing UI, deploy alignment), automate the release workflow, merge Dependabot updates, and promote v0.20.0 to production.

## Context

Sprint 001 delivered RC1–RC3 with platform extraction, security hardening, and theme support. The retro identified billing UI gaps as the last blockers and manual deploy friction as the biggest workflow pain point. Sprint 002 focuses on closing those gaps and shipping the first public release.

---

## Phase 1 — Launch Blockers (must complete before production)

| # | Title | Points | Area | Milestone |
|---|-------|--------|------|-----------|
| — | RC4 testing: deploy to staging, run manual checklist, file new issues | 3 | All | Release Workflow |
| [#117](https://github.com/sovereignbrick/brickos/issues/117) | fix: Stripe upgrade button missing on Settings → License tab | 3 | Frontend | Platform Extraction |
| [#118](https://github.com/sovereignbrick/brickos/issues/118) | feat: billing address section in Settings for tax compliance | 5 | Frontend | Platform Extraction |
| [#119](https://github.com/sovereignbrick/brickos/issues/119) | fix: signup form doesn't send consent to API | 2 | Frontend | UI: Privacy & Security |
| [#120](https://github.com/sovereignbrick/brickos/issues/120) | fix: deploy.sh image tag mismatch with prod compose | 2 | Ops | Release Workflow |
| **Subtotal** | | **15 pts** (+ RC4 issues TBD) | | |

## Phase 2 — Release Automation (quick wins from retro)

| # | Title | Points | Area | Milestone |
|---|-------|--------|------|-----------|
| [#122](https://github.com/sovereignbrick/brickos/issues/122) | feat: auto-deploy to staging on push to develop | 3 | Ops | Release Workflow |
| [#123](https://github.com/sovereignbrick/brickos/issues/123) | fix: add cargo insta test --check to CI pipeline | 1 | Ops | Release Workflow |
| [#124](https://github.com/sovereignbrick/brickos/issues/124) | feat: post-deploy smoke test with version assertion | 2 | Ops | Release Workflow |
| [#127](https://github.com/sovereignbrick/brickos/issues/127) | feat: staging database backup before migration | 3 | Ops | Release Workflow |
| **Subtotal** | | **9 pts** | | |

## Phase 3 — Hardening & Hygiene

| # | Title | Points | Area | Milestone |
|---|-------|--------|------|-----------|
| [#128](https://github.com/sovereignbrick/brickos/issues/128) | chore: review and merge Dependabot dependency updates | 3 | Platform | Infrastructure & Chores |
| [#125](https://github.com/sovereignbrick/brickos/issues/125) | feat: deploy.sh rollback command | 5 | Ops | Release Workflow |
| [#126](https://github.com/sovereignbrick/brickos/issues/126) | feat: error alerting (Sentry or equivalent) | 5 | Ops | Release Workflow |
| **Subtotal** | | **13 pts** | | |

## Phase 4 — Go-Live

| # | Title | Points | Area | Milestone |
|---|-------|--------|------|-----------|
| [#121](https://github.com/sovereignbrick/brickos/issues/121) | ops: promote develop to production — v0.20.0 | 5 | Ops | Infrastructure & Chores |
| **Subtotal** | | **5 pts** | | |

---

## Velocity

| Metric | Value |
|---|---|
| Phase 1 (blockers) | 15 pts + RC4 issues TBD |
| Phase 2 (automation) | 9 pts |
| Phase 3 (hardening) | 13 pts |
| Phase 4 (go-live) | 5 pts |
| **Total planned** | **42 pts** + RC4 issues TBD |
| Sprint 001 velocity | ~44 pts completed |

## Execution Order

```
Day 1 (2026-03-19):
  RC4 testing session         → deploy staging, run checklist, file new issues
  Fix RC4 issues              → triage and resolve blockers found

Week 1 (Phase 1 + 2):
  #120 deploy.sh fix          → unblocks all deploys
  #123 insta CI check         → 15 min, prevents snapshot drift
  #124 post-deploy smoke test → 30 min, auto-verify deploys
  #117 Stripe upgrade button  → critical billing path
  #118 billing address UI     → critical billing path
  #119 signup consent fix     → required for GDPR compliance
  #122 auto-deploy to staging → eliminates manual deploy friction
  #127 staging DB backup      → safety net before migrations

Week 2 (Phase 3 + 4):
  #128 Dependabot updates     → batch review + merge
  #125 deploy.sh rollback     → safety for production deploys
  #126 error alerting         → needed before go-live
  #121 promote to production  → final gate: all above closed
```

## Definition of Done for Go-Live (#121)

- [ ] All Phase 1 issues closed (billing UI complete)
- [ ] CI pipeline includes snapshot check (#123)
- [ ] Auto-deploy to staging working (#122)
- [ ] Post-deploy smoke test passes (#124)
- [ ] Staging DB backup runs before migration (#127)
- [ ] Dependabot updates merged and CI green (#128)
- [ ] Manual testing checklist passed on staging (RC4)
- [ ] Rollback mechanism available (#125)
- [ ] Error alerting active (#126)
- [ ] Production env vars configured (Stripe, Mailgun, encryption key, Cloudflare)
- [ ] `bash ops/deploy.sh production --confirm` succeeds

## Backlog (Sprint 003 candidates)

These are explicitly **out of scope** for Sprint 002:

| # | Title | Points | Milestone |
|---|-------|--------|-----------|
| [#116](https://github.com/sovereignbrick/brickos/issues/116) | feat: extend Analysis tab with richer visualizations | 8 | Health Intelligence Graph |
| — | feat: E2E browser tests (Playwright) | 8 | Release Workflow |
| — | feat: data sovereignty — vendor data mirrors | 8 | Data Sovereignty |
| — | feat: OAuth / social login | 5 | Auth Modernization |
| — | feat: version bump automation script | 2 | Release Workflow |
| — | feat: release notes auto-generation from conventional commits | 3 | Release Workflow |

## Notes / Decisions

- Sprint 002 is phased: blockers → automation → hardening → go-live. No phase starts until the previous is complete.
- Error alerting (#126) is a should-have before go-live, not a hard blocker. If it slips, we can launch and add it immediately after.
- Dependabot updates (#128) should be batched in one session with a full CI run after.
- Sprint 001 retro is at `retrospectives/2026-03-18_sprint-001-retro.md` — lessons informed this plan.
