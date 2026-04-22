# 0590 -- bug: platform admin "Members" sidebar link breaks without org context

**Type:** bug
**Priority:** P3 (UX -- not user-facing data corruption, but looks broken)
**Found:** Sprint 050 RC manual test, 2026-04-22
**Sprint target:** 051
**Reporter:** helmut (manual RC test layer 3.6)

## Observed

On `demo.brickos.io` (platform admin plane), navigate to `/platform/org/members` as `demo@sovereignhealth.io` without first selecting a specific org from the top-right "All Orgs" dropdown.

Result: page renders the Members table shell with "0 members" and a red error toast "Could not load members".

Screenshot: `docs/releases/sovereign-health/v0.48.0-rc/screenshots/layer-3-6-could-not-load-members.png` (TBD -- user screenshot attached in RC review chat).

## Root cause (hypothesized)

- All `/platform/org/*` routes scope their queries using the `X-Org-Domain` nginx header, which is derived from the request hostname.
- `demo.brickos.io` is the admin/aggregate plane hostname; nginx passes it through verbatim as `X-Org-Domain: demo.brickos.io`.
- Backend resolves `demo.brickos.io` to the "demo" platform org, which has zero members (demo is platform-level, not a customer org).
- Result: the org-members handler legitimately returns 0 rows, but the frontend's error surface renders a red "Could not load members" toast instead of a friendly empty state, because the handler may also be returning a non-2xx status when the resolved org is a "platform" tier org rather than a customer org.

## Expected

Either:
a) **Hide the "Members" / "Branding" / etc. items from the ORGANIZATION section of the sidebar until the admin picks a specific customer org from the top-right dropdown.** Preferred -- the menu structure is currently misleading.
b) Show an empty state ("No members yet -- select an organization above to manage its members") instead of an error toast.
c) Redirect `/platform/org/*` to `/platform/orgs` (the org picker) when the resolved org is a platform-tier org with no team members.

## Repro steps

1. Log in on https://demo.brickos.io/login as `demo@sovereignhealth.io` / `SovereignDemo1`
2. Click "Members" under ORGANIZATION in the left sidebar (navigates to `/platform/org/members`)
3. Observe red "Could not load members." toast + empty table
4. Open the top-right "All Orgs" dropdown and pick `test-clinic`
5. Observe the table now loads correctly

## Notes

- Not a v0.48.0 regression -- the behavior predates Sprint 050 and was just unmasked by a thorough RC walk-through.
- Related to #0582 (org-redirect-no-members-displayed) but that one is the reverse case (org selected but list empty).
