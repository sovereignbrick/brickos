---
number: 523
title: "feat: [P1] /platform/orgs needs a 'New Organization' button"
milestone: "BrickOS Platform Admin GUI"
labels: [feature, platform-admin-gui, p1]
created: 2026-04-11
priority: P1
discovered_by: 496
related: [491, 568]
---

## Summary

The `/platform/orgs` page in the platform admin GUI has no UI for creating a new organization. The page is read-only -- it lists existing orgs and offers two bulk actions (Export CSV, Send renewal reminders) but no "New Organization" button.

This blocks the entire Sprint 041 #496 Life Algorithm walkthrough at step 2.

## Reproduction

1. Cold-boot dev stack (post #568, 177/177 migrations clean)
2. Sign in to `http://localhost:3000/login` as `dev@sovereignhealth.io / SovereignDev1`
3. Navigate to `/platform/orgs`
4. Look for a button to create a new organization
5. Result: only Export CSV and Send renewal reminders bulk-action buttons exist

Source confirmation: `apps/health/sovereign-health/frontend/src/app/platform/orgs/page.tsx` -- grepped for "New organization", "create org", "orgs/new" -- no match.

## Why this matters

- Blocks the Life Algorithm walkthrough (#496-#511) which is the entire Sprint 041 manual test driver
- Today, org creation requires either signup flow (creates a personal org), direct SQL, or the licensing-issuance API. None of these are usable by a platform admin walking the GUI.
- This is the entry point for any white-label customer onboarding. Without it, brickos.io platform admin cannot self-serve.

## Acceptance criteria

- [ ] "New Organization" button visible on `/platform/orgs` (top-right of header, conventional placement)
- [ ] Button opens a modal or navigates to `/platform/orgs/new`
- [ ] Form fields per the Sprint 041 #496 Life Algorithm test:
  - Name (required)
  - Slug (required, auto-derived from name with override)
  - Type (clinic | personal | platform | system, with sane default = clinic)
  - Billing email (optional)
  - Admin user (existing user lookup OR allow inviting via email)
- [ ] Submission POSTs to a new backend endpoint (e.g. `POST /admin/organizations`) that creates the row in `brickos.organizations`
- [ ] On success, navigate to `/platform/orgs/{newId}` showing the new org
- [ ] Validation errors render inline (slug uniqueness, name required)
- [ ] Audit log entry written to `brickos.admin_audit_log` with action `org.create`
- [ ] e2e test added to `apps/health/sovereign-health/frontend/e2e/sprint-040-smoke.spec.ts` that creates an org and verifies it appears in the list

## Out of scope

- Org deletion (separate issue, separate destructive UX considerations)
- Org slug change (a name-only edit is fine for v1)
- License assignment (already exists via the License tab on `/platform/orgs/[id]`)

## Related

- Sprint 041 #496 (the manual test that surfaced this gap)
- PR #568 (the cold-boot fix that exposed the gap)
- design 014 BrickOS Platform GUI (the umbrella design doc for the admin GUI)
