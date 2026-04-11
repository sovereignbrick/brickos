---
number: 496
title: "test: [manual] Life Algorithm -- create org via admin GUI on dev"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-c, manual]
created: 2026-04-11
priority: P1
sprint: 041
phase: C
estimate: 0.2d
blocked_by: [492]
---

First manual step of the Life Algorithm onboarding walkthrough. Creates the org on the dev stack using the admin GUI.

## Prerequisites

- Dev stack running (#492)
- Logged in as admin at `http://localhost:3001/platform`

## Steps

1. Navigate to `/platform/orgs`
2. Click "New organization" button
3. Fill the form:
   - **Name:** `Life Algorithm`
   - **Slug:** `life-algorithm`
   - **Type:** `clinic`
   - **Billing email:** `billing@life-algorithm.test`
   - **Admin email:** `admin@life-algorithm.test` (must be an existing SHI user; if not, create via SQL or signup flow first)
4. Click Create
5. Verify the org appears in the list
6. Note the org ID from the URL when you click through

## Expected result

- Org created without errors
- Org visible in `/platform/orgs` list
- Clicking the org name navigates to `/platform/orgs/{id}`
- All 5 tabs (Overview, Members, License, Branding, Invoices) are clickable

## Who

User (manual).

## Verification

- Report in `sprint-041-lessons.md`: green / bug found
- Any bug -> new issue with P0 label, blocks Phase C
- Any feature request -> issue against `platform-admin-gui` milestone
