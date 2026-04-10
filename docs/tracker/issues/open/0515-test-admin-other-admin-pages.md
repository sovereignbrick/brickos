---
number: 515
title: "test: [manual] /platform/{ai,alerts,audit,compliance,contact,newsletter,branding,domains}"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-f, manual]
created: 2026-04-11
priority: P2
sprint: 041
phase: F
estimate: 0.25d
---

Sanity walk of every other brickos.io admin page not covered in #510-#514. These are pre-Sprint-040 pages that may have been affected by the Sprint 040 layout/nav changes.

## Checklist -- one checkbox per page, "loads cleanly without console errors"

- [ ] /platform/ai/config
- [ ] /platform/ai/usage
- [ ] /platform/alerts
- [ ] /platform/audit
- [ ] /platform/compliance
- [ ] /platform/contact
- [ ] /platform/content/app
- [ ] /platform/content/web
- [ ] /platform/content/strings
- [ ] /platform/newsletter
- [ ] /platform/branding
- [ ] /platform/domains
- [ ] /platform/deploy
- [ ] /platform/services
- [ ] /platform/settings
- [ ] /platform/members
- [ ] /platform/apps
- [ ] /platform/links
- [ ] /platform/analytics
- [ ] /platform/promotions
- [ ] /platform/revenue
- [ ] /platform/billing
- [ ] /platform/affiliates

For each page:
- [ ] Loads without 500 or blank screen
- [ ] No console errors in devtools
- [ ] No broken images
- [ ] Navigation from the sidebar works

## Who

User (manual).

## Verification

Per-page green/bug. Any 500 or blank is P0. Feature requests go to platform-admin-gui milestone.
