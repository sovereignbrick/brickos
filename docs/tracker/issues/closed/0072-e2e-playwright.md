---
github_number: 305
title: "test: E2E Playwright tests -- full user lifecycle"
milestone: release-workflow
labels: [test, sprint-023, app:health]
points: 5
---

## Description
Comprehensive E2E test suite covering the full user lifecycle from registration to account deletion. Sprint 023 foundation (Suites 1, 2, 12 partial); full coverage spans multiple sprints (12 suites total).

## Design Doc
`apps/health/sovereign-health/docs/project-files/design/036-e2e-playwright-tests.md`

## Sprint 023 Foundation
- [ ] Test infrastructure: auth helper, test user factory, API client, fixtures
- [ ] Suite 1: Registration & Auth
- [ ] Suite 2: Onboarding & Profile
- [ ] Suite 12 partial: cleanup verification

## Future Sprints
- [ ] Suite 3: Devices & Labs
- [ ] Suite 4: Measurements & Data Entry
- [ ] Suite 5: Smart Import (sample images in e2e/fixtures/)
- [ ] Suite 6: Dr. Alex
- [ ] Suite 7: Privacy & Data Export
- [ ] Suite 8: GDPR Compliance (data export, deletion, trace verification)
- [ ] Suite 9: Billing & Subscription (Stripe, BTC, tier gating)
- [ ] Suite 10: Admin Panel
- [ ] Suite 11: Infrastructure (health, metrics, rate limiting, CORS, webhooks, ntfy)
- [ ] Suite 12 full: Cleanup & Data Integrity
