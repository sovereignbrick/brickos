# Sprint 002 — Launch & Automate

**Started:** 2026-03-18
**Completed:** 2026-03-19
**Goal:** Close all launch blockers (billing UI, deploy alignment), automate the release workflow, merge Dependabot updates, and promote v0.20.0 to production.

## Context

Sprint 001 delivered RC1–RC3 with platform extraction, security hardening, and theme support. The retro identified billing UI gaps as the last blockers and manual deploy friction as the biggest workflow pain point. Sprint 002 focuses on closing those gaps and shipping the first public release.

---

## Phase 1 — Launch Blockers (must complete before production)

| # | Title | Points | Area | Milestone |
|---|-------|--------|------|-----------|
| — | RC4 testing: deploy to staging, run manual checklist, file new issues | 3 | All | Release Workflow |
| [#129](https://github.com/sovereignbrick/brickos/issues/129) | fix: dashboard swipable tiles white-on-white in light theme | 2 | Frontend | UX & Onboarding |
| [#130](https://github.com/sovereignbrick/brickos/issues/130) | fix: zone detail marker tiles missing hover animation | 1 | Frontend | UX & Onboarding |
| [#131](https://github.com/sovereignbrick/brickos/issues/131) | fix: marker reference bar — circle marker, tooltip, red zones | 5 | Frontend | Health Intelligence Graph |
| [#132](https://github.com/sovereignbrick/brickos/issues/132) | feat: audit marker abbreviations & enrich from open databases (LOINC) | 5 | API + Data | Health Intelligence Graph |
| [#133](https://github.com/sovereignbrick/brickos/issues/133) | fix: lab import misidentifies markers from screenshots — improve AI extraction | 5 | API + Frontend | AI & Smart Features |
| [#134](https://github.com/sovereignbrick/brickos/issues/134) | fix: move info tooltip icon to left after marker abbreviation | 1 | Frontend | UX & Onboarding |
| [#135](https://github.com/sovereignbrick/brickos/issues/135) | fix: sleep quality label, lifestyle tooltips, React hydration #418 | 3 | Frontend | UX & Onboarding |
| [#136](https://github.com/sovereignbrick/brickos/issues/136) | fix: device Standard badge not theme-aware in light mode | 1 | Frontend | UX & Onboarding |
| [#137](https://github.com/sovereignbrick/brickos/issues/137) | feat: thresholds table — abbreviation, richer tooltip, zebra rows, better search | 5 | Frontend | UX & Onboarding |
| [#138](https://github.com/sovereignbrick/brickos/issues/138) | fix: influence factors form — Name field too wide, labels misaligned | 2 | Frontend | UX & Onboarding |
| [#140](https://github.com/sovereignbrick/brickos/issues/140) | fix: React hydration #418 on multiple pages + billing/sync failing | 3 | Frontend | Infrastructure & Chores |
| [#141](https://github.com/sovereignbrick/brickos/issues/141) | fix: affiliate referral link not working — auto-generate code on signup | 5 | API + Frontend | Horizon Tier Features |
| [#142](https://github.com/sovereignbrick/brickos/issues/142) | feat: hierarchical affiliate commissions — assess & add parent_referrer_id | 3 | API + Data | Horizon Tier Features |
| [#143](https://github.com/sovereignbrick/brickos/issues/143) | fix: admin panel — light theme audit, hide app navbar, readability | 8 | Frontend | UX & Onboarding |
| [#117](https://github.com/sovereignbrick/brickos/issues/117) / [#139](https://github.com/sovereignbrick/brickos/issues/139) | fix: Stripe upgrade button + plan management on License tab | 3 | Frontend | Platform Extraction |
| [#118](https://github.com/sovereignbrick/brickos/issues/118) | feat: billing address section in Settings for tax compliance | 5 | Frontend | Platform Extraction |
| [#119](https://github.com/sovereignbrick/brickos/issues/119) | fix: signup form doesn't send consent to API | 2 | Frontend | UI: Privacy & Security |
| [#120](https://github.com/sovereignbrick/brickos/issues/120) | fix: deploy.sh image tag mismatch with prod compose | 2 | Ops | Release Workflow |
| **Subtotal** | | **64 pts** (+ RC4 issues TBD) | | |

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

- [x] All Phase 1 issues closed (billing UI complete)
- [x] CI pipeline includes snapshot check (#123)
- [x] Auto-deploy to staging working (#122)
- [x] Post-deploy smoke test passes (#124)
- [x] Staging DB backup runs before migration (#127)
- [x] Dependabot updates merged and CI green (#128)
- [x] Manual testing checklist passed on staging (RC4)
- [x] Rollback mechanism available (#125)
- [x] Error alerting active (#126)
- [x] Production env vars configured (Stripe, Mailgun, encryption key, Cloudflare)
- [x] `bash ops/deploy.sh production --confirm` succeeds — v0.20.0 deployed 2026-03-19

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
