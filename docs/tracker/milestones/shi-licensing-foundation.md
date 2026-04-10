---
name: SHI Licensing Foundation -- Sprint 040
github_number: 35
description: Brickos-licensing platform service, SHI tier.rs refactor, active/preserved markers, 5→3 role consolidation, RS256 org JWT, Stripe-synced manual invoicing, brickos.io email branding, multi-org switcher, dormant accounts review, 4 Playwright E2E journeys, AI chat hard daily ceiling
status: active
sprint: 040
constraint: NO PRODUCTION DEPLOYMENTS DURING THIS SPRINT
---

# SHI Licensing Foundation -- Sprint 040

Implementation of design 022 (BrickOS Licensing Model) as a single focused sprint. Closes the licensing discussion for individual users, organization white-label customers, and the planned self-hosted commercial flavors. Refactors SHI from per-app feature gating to a shared `brickos-licensing` crate that serves all BrickOS apps.

**Design doc:** [022-licensing-model.md](../../design/022-licensing-model.md)
**Sprint doc:** [sprint-040.md](../../sprint-planning/sprints/sprint-040.md)
**Lessons live doc:** [sprint-040-lessons.md](../../sprint-planning/sprints/sprint-040-lessons.md)

## 🚫 Critical constraint

**No `deploy.sh production` runs during this sprint.** All work is on localhost + staging only. The licensing refactor changes the feature gate path on which all paying customers depend; promotion happens in a follow-up validation sprint.

## Sprint 040 issues (30 total)

### Phase A -- Foundation (4 issues, sequential)
- [ ] #460 chore: licensing schema migrations
- [ ] #461 chore: individual pseudo-org migration + lifecycle columns
- [ ] #462 feat: brickos-licensing crate skeleton + RS256 keypair
- [ ] #463 chore: roles 5→3 migration + canonical tier seed

### Phase B -- Service (9 issues, critical path)
- [ ] #464 feat: brickos-licensing crate runtime (embedded + client + 370d cache)
- [ ] #465 feat: effective tier resolver + has_feature API
- [ ] #466 feat: org license JWT generate/validate (RS256) + revocation
- [ ] #467 refactor: SHI tier.rs → brickos-licensing facade
- [ ] #468 feat: active vs preserved markers (schema + UI picker)
- [ ] #469 feat: seat enforcement + admin override enforced + audit log
- [ ] #470 test: tier × feature regression matrix (~60 tests) + Stripe webhook contract
- [ ] #471 test: Playwright E2E -- 4 licensing journeys
- [ ] #472 feat: AI chat hard daily ceiling (M5)

### Phase C -- Lifecycle + Email (4 issues, parallel with D, E)
- [ ] #473 feat: brickos.io email branding + payment failure templates
- [ ] #474 feat: org termination + downgrade + renewal email templates
- [ ] #475 feat: scheduled jobs (payment failure cadence, dormant flag, org grace)
- [ ] #476 feat: in-app subscription banner + manual send flow

### Phase D -- Admin GUI (8 issues, parallel with C, E)
- [ ] #477 feat: platform admin Orgs list view
- [ ] #478 feat: platform admin Org detail (Overview + Members)
- [ ] #479 feat: Org License tab + multi-app feature picker
- [ ] #480 feat: Org Branding tab + role label overrides
- [ ] #481 feat: Stripe sync (Invoices tab + brickos-billing + webhook)
- [ ] #482 feat: platform admin Users + dormant accounts
- [ ] #483 feat: tier config / feature registry / revocation screens
- [ ] #484 feat: multi-org switcher in user profile

### Phase E -- Cross-app + Docs (4 issues, parallel with C, D)
- [ ] #485 docs: T&C retention + tier change + dormant clauses
- [ ] #486 chore: register CRM + Link features in feature_registry
- [ ] #487 docs: developer guide + admin runbook + customer-facing licensing page
- [ ] #488 chore: Sprint 040 retrospective + design 022 final review

### Tracking epic
- [ ] #489 epic: Sprint 040 -- Licensing Foundation (rolls up all phases)

## Out of scope

Deferred to follow-up sprints:
- Self-hosted Core Commercial enforcement (design 022 §5.3)
- Org-level Stripe subscription metering (design 021 Phase 2)
- CLA / dual-licensing decision (design 016)
- Automated dormant-account deletion (manual review only)
- Visual white-label branding (design 021 §13 Phase 1, separate 1-week sprint after this one)
