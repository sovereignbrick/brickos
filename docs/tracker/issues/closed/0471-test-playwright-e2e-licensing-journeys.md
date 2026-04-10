---
number: 471
github_number: 412
title: "test: Playwright E2E -- 4 licensing journeys"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-b, test, e2e]
created: 2026-04-10
priority: P0
sprint: 040
phase: B
design: 022
estimate: 1d
blocked_by: [467, 468, 469]
---

End-to-end test coverage for the highest-risk customer-facing journeys. Adopted from M12 in design 022 §13.5.

Per saved memory `feedback_e2e_tests_first.md` -- write Playwright E2E tests **alongside** the feature, not as an afterthought.

## Scope

### Journey 1: Stripe payment journey
- [ ] Sign up new account → land on Glimpse
- [ ] Try CSV export → blocked with upgrade CTA
- [ ] Click upgrade → Stripe Checkout (test mode card 4242 4242 4242 4242)
- [ ] Webhook simulation: `customer.subscription.created`
- [ ] Reload → tier shows Focus
- [ ] CSV export now succeeds

### Journey 2: Downgrade with preserved markers
- [ ] Login as user on Focus with 30 markers tracked
- [ ] Cancel subscription via Stripe billing portal
- [ ] Webhook simulation: `customer.subscription.deleted`
- [ ] Verify grace period banner appears
- [ ] Fast-forward time (test fixture): grace expires
- [ ] Verify tier downgraded to Glimpse
- [ ] Verify 10 markers active, 20 preserved
- [ ] Verify preserved markers visible read-only with charts
- [ ] Verify cannot enter new measurements on preserved markers

### Journey 3: Admin override
- [ ] Login as brickos admin
- [ ] Open user detail page for a Glimpse user
- [ ] Apply admin override: tier=Insight, expires in 30 days
- [ ] Login as that user → tier shows Insight, all features unlocked
- [ ] Fast-forward time: override expires
- [ ] Reload → tier reverts to Glimpse

### Journey 4: Org member seat enforcement
- [ ] Brickos admin creates org with `max_practitioners=2, max_members=5`
- [ ] Add 2 practitioners → success
- [ ] Add 3rd practitioner → 422 SeatLimitExceeded
- [ ] Add 5 members → success
- [ ] Add 6th member → 422 SeatLimitExceeded
- [ ] Brickos admin issues new license with `max_members=10`
- [ ] Add 6th member → success

## Verification

- [ ] All 4 journeys pass on `npm run test:e2e` against staging
- [ ] CI runs them on PR (if CI gets re-enabled per `feedback_ci_actions_disabled.md`)
- [ ] Each journey runs < 30s

## References

- design 022 §13.5 M12
- Memory: `feedback_e2e_tests_first.md`
- Memory: `feedback_test_target_domain_early.md`
