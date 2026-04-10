---
number: 487
github_number: 468
title: "docs: developer guide + brickos admin runbook + customer-facing licensing page"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-e, docs]
created: 2026-04-10
priority: P2
sprint: 040
phase: E
design: 022
estimate: 1.5d
---

Three pieces of documentation that close out the sprint.

## Scope -- developer guide

- [ ] `docs/dev/licensing.md`
- [ ] How to add a new feature: insert into `feature_registry`, upsert into `tier_features`, call `has_feature("app.feature")` in code
- [ ] How to add a new tier: insert into `tier_definitions`, bulk-insert `tier_features`
- [ ] How to use brickos-licensing in a new BrickOS app (embedded vs client mode)
- [ ] Cache freshness rules + 370-day grace
- [ ] RS256 keypair management + rotation procedure
- [ ] Testing patterns: tier × feature matrix, Stripe webhook contract tests, Playwright E2E

## Scope -- brickos admin runbook

- [ ] `docs/runbooks/issue-org-license.md`
- [ ] Step-by-step: how to onboard a new white-label customer
  - Create org via admin GUI
  - Configure branding (logo, colors, role labels)
  - Generate license JWT (which tier, which features, which seat caps)
  - Create Stripe invoice via sync
  - Send license JWT + invoice email
  - Renewal procedure (30 days before exp)
  - Revocation procedure (mid-period)
- [ ] Common troubleshooting

## Scope -- customer-facing licensing page

- [ ] `https://brickos.io/docs/licensing` (or in-product help page)
- [ ] How licenses work (transparency, plain language)
- [ ] Tier comparison (auto-generated from `/api/v1/licensing/tiers`)
- [ ] Glimpse semantics: 10 active markers, preserved markers, calculated markers unlimited
- [ ] Downgrade behavior: data preservation
- [ ] Inactivity policy
- [ ] Org termination flow
- [ ] AI chat hard daily ceiling explained (M5 / #472)
- [ ] DE + EN

## Verification

- [ ] All three docs exist and reviewed
- [ ] Customer-facing page reads from API not hardcoded
- [ ] Developer guide tested by following it to add a fake feature

## References

- design 022 §11, §12
