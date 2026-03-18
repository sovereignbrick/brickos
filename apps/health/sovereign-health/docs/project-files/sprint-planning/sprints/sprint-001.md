# Sprint 001 — Go-Live

**Started:** 2026-03-18
**Completed:** ongoing
**Goal:** Fix all blockers and launch-critical issues so users can register, purchase, and use the product.

## Blockers (can't launch)
| # | Title | Points | Milestone |
|---|-------|--------|-----------|
| #85 | bug: Stripe upgrade button missing on Settings → License tab | 3 | Platform Extraction — BrickOS Core |
| #28 | fix: signup form doesn't send newsletter/product update consent to API | 3 | UI: Privacy & Security Features |
| #88 | bug: deploy.sh builds local image tag but prod compose references GitLab registry | 2 | Release Workflow Improvements |
| #18 | Promote develop to production (v0.20.0-rc1) | 5 | Infrastructure & Chores |
| #100 | feat: collect customer type (private/org) and country for tax compliance + Stripe | 8 | Platform Extraction — BrickOS Core |

## Launch Quality (should-fix before go-live)
| # | Title | Points | Milestone |
|---|-------|--------|-----------|
| #87 | feat: migrate production PostgreSQL to custom Dockerfile with pgaudit | 5 | Release Workflow Improvements |
| #41 | GDPR-F004: Contact form stores email and name in plaintext | 3 | Security Hardening |
| #19 | In-app onboarding flow (6-step checklist) | 8 | User Experience & Onboarding |
| #22 | App screenshots + Learn page videos | 5 | User Experience & Onboarding |
| #84 | feat: add dark/light theme toggle | 5 | User Experience & Onboarding |
| #99 | feat: WCAG 2.1 Level AA accessibility compliance (partial — contrast + keyboard) | 5 | User Experience & Onboarding |

## Shortly After Launch (Sprint 002 candidates)
| # | Title | Points | Milestone |
|---|-------|--------|-----------|
| #76 | feat: automated rollback mechanism in deploy.sh | 5 | Release Workflow Improvements |
| #77 | feat: error alerting integration (Sentry or Datadog) | 5 | Release Workflow Improvements |
| #72 | feat: automated E2E browser tests (Playwright) | 8 | Release Workflow Improvements |
| #74 | feat: staging database backup before migration | 3 | Release Workflow Improvements |
| #92 | feat: data sovereignty — local mirror of all vendor data (Stripe, Mailgun) | 8 | Data Sovereignty & Vendor Independence |

## Velocity
| Metric | Value |
|--------|-------|
| Planned (blockers) | 21 pts |
| Planned (launch quality) | 31 pts |
| Total planned | 52 pts |
| Completed | — |
| Carried over | — |

## Notes / Decisions
- OAuth (#91) deferred to a later sprint — not needed for initial launch
- WCAG #99 scoped to partial: contrast fixes + keyboard navigation only for this sprint
- Sprint 002 candidates listed here for visibility — will be planned after go-live
