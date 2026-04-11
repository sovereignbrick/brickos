---
number: 525
title: "feat: [P1] audit /platform/* admin pages for missing CRUD buttons"
milestone: "BrickOS Platform Admin GUI"
labels: [feature, platform-admin-gui, audit, p1]
created: 2026-04-11
priority: P1
discovered_by: 568
related: [523]
---

## Summary

Discovery from #568 + #523: the `/platform/orgs` page has no "New Organization" button. This is unlikely to be the only such gap. Several `/platform/*` pages may be read-only when they should support full CRUD.

We need a systematic audit before further Sprint 041 manual tests fail at the same wall.

## Pages to audit

For each, check whether the page supports the listed operations and whether each operation is reachable from the GUI (button, link, modal, drag-drop, etc.):

| Page | Expected operations | Audit result | Issue ref |
|---|---|---|---|
| `/platform/orgs` | Create, view, edit, deactivate | ❌ No Create | #523 |
| `/platform/orgs/[id]` (Overview tab) | Edit name, slug, billing email, type | ? | |
| `/platform/orgs/[id]` (Members tab) | Add member, change role, remove member | ? | |
| `/platform/orgs/[id]` (License tab) | Issue license, change tier, revoke | ? | |
| `/platform/orgs/[id]` (Branding tab) | Edit logo, colors, domain, role labels | ? | |
| `/platform/orgs/[id]` (Invoices tab) | View invoices, mark paid, refund | ? | |
| `/platform/users` | Create, deactivate, role change | ? | |
| `/platform/users/dormant` | Reactivate, hard-delete | ? | |
| `/platform/licensing` | Edit tier, change limits, save changes | ? | |
| `/platform/features` | Add feature to registry, deactivate | ? | |
| `/platform/licensing/revocations` | Restore revoked license, revoke license | ? | |
| `/platform/services` | Restart service, view logs | ? | |
| `/platform/branding` | Set platform-wide logo, colors | ? | |
| `/platform/compliance` | Edit framework, mark assessment complete | ? | |
| `/platform/content/{app,web,strings}` | Edit i18n strings, save | ? | |
| `/platform/deploy` | Trigger deploy, view history | ? | |
| `/platform/domains` | Add domain, verify, attach to org | ? | |
| `/platform/links` | Create short link, edit, delete | ? | |
| `/platform/promotions` | Create code, set rules, deactivate | ? | |
| `/platform/revenue` | Read-only is OK (analytics) | ? | |
| `/platform/settings` | Edit platform-wide settings | ? | |

## Process

1. Cold-boot dev stack
2. Sign in as `dev@sovereignhealth.io / SovereignDev1`
3. For each page in the table:
   a. Open the page
   b. Check the header for primary action buttons
   c. Check rows/items for inline edit/delete/menu buttons
   d. Note which expected operations are missing
4. For each gap: file an individual `feat:` issue against `BrickOS Platform Admin GUI` milestone with a clear AC
5. Update this issue's table with the issue ref column

## Acceptance criteria

- [ ] Every row in the table above has its audit result column filled
- [ ] Every gap has its own follow-up issue filed against `BrickOS Platform Admin GUI`
- [ ] Issue refs back-linked in the table column

## Why this matters

Sprint 041 is testing the platform admin GUI as the first real customer onboarding tool. If pages are read-only that should be CRUD, the entire customer journey breaks at the first interaction. This audit produces a complete punch list for the platform admin GUI work that needs to land before any white-label customer is onboarded for real.

## Related

- #523 (the first such gap, found while attempting #496)
- #568 (the schema fix that made cold-boot work and surfaced this)
- design 014 BrickOS Platform GUI
