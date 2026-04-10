---
number: 489
github_number: 470
title: "epic: Sprint 040 -- Licensing Foundation (rolls up all phases)"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, epic]
created: 2026-04-10
priority: P0
sprint: 040
design: 022
---

Tracking epic for Sprint 040. Closes the licensing discussion completely. Implementation of design [022-licensing-model.md](../../design/022-licensing-model.md).

## 🚫 Sprint constraint

**No production deployments during this sprint.** Localhost + staging only. See [sprint-040.md](../../sprint-planning/sprints/sprint-040.md) for full constraints.

## Goal

Ship the brickos-licensing platform service as the single source of truth across all BrickOS apps. Refactor SHI from per-app feature gating to a shared crate. Land active/preserved markers, role consolidation (5→3), org_licenses with RS256 JWT, Stripe-synced manual invoicing, brickos.io-branded billing emails, multi-org switcher, dormant accounts review, and four Playwright E2E journeys.

## Phases (5 phases by dependency)

### Phase A -- Foundation (Day 1, sequential)
- [ ] #460 chore: licensing schema migrations
- [ ] #461 chore: individual pseudo-org migration + lifecycle columns
- [ ] #462 feat: brickos-licensing crate skeleton + RS256 keypair
- [ ] #463 chore: roles 5→3 migration + canonical tier seed

### Phase B -- Service (Days 2-4, critical path)
- [ ] #464 feat: brickos-licensing crate runtime
- [ ] #465 feat: effective tier resolver + has_feature API
- [ ] #466 feat: org license JWT generate/validate (RS256)
- [ ] #467 refactor: SHI tier.rs → brickos-licensing facade ⭐ critical
- [ ] #468 feat: active vs preserved markers
- [ ] #469 feat: seat enforcement + admin override + audit log
- [ ] #470 test: tier × feature regression matrix + Stripe webhook contract
- [ ] #471 test: Playwright E2E -- 4 journeys
- [ ] #472 feat: AI chat hard daily ceiling (M5)

### Phase C -- Lifecycle (Days 5-6, parallel)
- [ ] #473 feat: brickos.io email branding + payment failure templates
- [ ] #474 feat: org termination + downgrade + renewal email templates
- [ ] #475 feat: scheduled jobs (cadence + dormant + grace)
- [ ] #476 feat: in-app banner + manual send flow

### Phase D -- Admin GUI (Days 5-7, parallel)
- [ ] #477 feat: platform admin Orgs list view
- [ ] #478 feat: platform admin Org detail (Overview + Members)
- [ ] #479 feat: Org License tab + multi-app feature picker
- [ ] #480 feat: Org Branding tab
- [ ] #481 feat: Stripe sync (Invoices tab)
- [ ] #482 feat: platform admin Users + dormant
- [ ] #483 feat: tier config / feature registry / revocation screens
- [ ] #484 feat: multi-org switcher in user profile

### Phase E -- Cross-app + Docs (Day 7, parallel)
- [ ] #485 docs: T&C clauses
- [ ] #486 chore: register CRM + Link features
- [ ] #487 docs: developer guide + admin runbook + customer page
- [ ] #488 chore: Sprint 040 retrospective + final review

## Phase gates

See [sprint-040.md](../../sprint-planning/sprints/sprint-040.md) "Phase gates" section.

## Risk register & counter-measures

See [022-licensing-model.md §13](../../design/022-licensing-model.md). Top three:
- F1 Stripe webhook desync → M4 webhook contract tests (#470)
- F2 AI chat fail-open → M5 hard daily ceiling (#472)
- F6 Marker access flips → M1 facade pattern + M2 shadow mode (#467)

## Out of scope

Deferred to follow-up sprints:
- Self-hosted Core Commercial enforcement
- Org-level Stripe subscription metering
- CLA / dual-licensing decision
- Automated dormant-account deletion
- Visual white-label branding (separate 1-week sprint after this one)

## Lessons learned

Tracked live in [sprint-040-lessons.md](../../sprint-planning/sprints/sprint-040-lessons.md). Promoted to memory at sprint end (#488).
