---
number: 573
title: "feat: profile-menu cross-plane entries (Phase D)"
milestone: "Sprint 046 -- Unified Admin Home"
labels: [feat, frontend, p1, admin, ux]
created: 2026-04-20
priority: P1
estimate: 0.5d
blocked_by: [571]
parent: design-026
phase: D
---

Phase D of Design 026. Profile-dropdown entries to jump between planes without typing the other hostname.

## Scope

### On the END-USER plane (`{slug}.sovereignhealth.io`)

Profile dropdown gets an "Admin" entry ABOVE "Sign out":
- Label: "Admin"
- Visible when: JWT has any admin role (`org_owner || tech_admin || commercial_admin || platform_admin`)
- Action: opens `{slug}.brickos.io/platform` in a NEW TAB (because cookie domains differ, same tab would drop the session)

### On the ADMIN plane (`{slug}.brickos.io`)

Profile dropdown gets an "Open SHI App" "Open Sovereign Health App" entry:
- Label: "Open Sovereign Health" (matches #571 naming)
- Visible when: the org has the Sovereign Health app entitlement (reuses the entitlement hook from #571)
- Action: opens `{slug}.sovereignhealth.io/dashboard` in a NEW TAB

Future: other installed apps can contribute their own "Open ..." entries via the same registry. Stub this by reading from `src/lib/admin-nav/` and filtering items whose parent app has `visibleWhen === 'installed'`.

### Implementation

Modify `src/components/layout/navbar.tsx` profile menu:
- Import `getPlane` from `@/lib/plane` and `useOrg` for JWT claims
- Branch on `getPlane(window.location.hostname)`
- Render the appropriate entry
- Use `<a target="_blank" rel="noopener noreferrer">`

## Acceptance

- Org admin on `{slug}.demo.sovereignhealth.io` sees "Admin" in profile menu; clicking opens admin plane in new tab
- Org admin on `{slug}.demo.brickos.io` sees "Open Sovereign Health" in profile menu; clicking opens end-user plane in new tab
- Regular end user (not admin) on sovereignhealth.io does NOT see the Admin link
- On the platform landing (`app.brickos.io` / `app.sovereignhealth.io`, not an org subdomain), the cross-plane entry is hidden (there's no `{slug}` to swap)
- Links open in new tab, not current (prevents session loss)
