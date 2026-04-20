---
number: 571
title: "feat: APPS plugin registry + Sovereign Health registration (Phase B)"
milestone: "Sprint 046 -- Unified Admin Home"
labels: [feat, frontend, p0, admin, extensibility]
created: 2026-04-20
priority: P0
estimate: 1d
blocked_by: [570]
parent: design-026
phase: B
---

Phase B of Design 026. Declarative nav registry so each installed app contributes its org-scoped settings. Sovereign Health is the first registered app; stubs for Sovereign Link + Sovereign Voice confirm the pattern.

## Scope

### 1. Registry types + store

`src/lib/admin-nav/types.ts`:
```ts
export type AdminNavRole = 'platform_admin' | 'org_owner' | 'tech_admin' | 'commercial_admin' | 'member'

export interface AppNavItem {
  key: string
  label: string         // user-facing, e.g. "Email Templates"
  href: string          // absolute under /platform/apps/{appKey}
  icon?: string
  roles: AdminNavRole[] // visible to any of these
}

export interface AppNavContribution {
  appKey: string                         // internal id, e.g. "sovereign-health"
  label: string                          // user-facing, e.g. "Sovereign Health"
  shortLabel?: string                    // fallback for narrow mobile, e.g. "Sov. Health"
  orgSettings: AppNavItem[]
  visibleWhen: 'installed' | 'available' // "available" -> greyed-out with Enable CTA
}
```

### 2. Sovereign Health registration

`src/lib/admin-nav/apps/sovereign-health.ts`:
- Label: `"Sovereign Health"` (NOT "SHI")
- orgSettings:
  - Email Templates -> `/platform/apps/sovereign-health/email`
  - AI Config -> `/platform/apps/sovereign-health/ai`
  - Licensing -> `/platform/apps/sovereign-health/licensing` (platform_admin only)

Rename EXISTING user-facing strings throughout this sub-tree:
- "SHI -- Email" -> "Sovereign Health · Email"
- "SHI -- AI Config" -> "Sovereign Health · AI Config"
- Any other UI string that says "SHI" in the context of this app nav

Internal symbols + package names (`sovereign-health-backend`, `shi-web` Docker tag, `brickos-sh` crate) are NOT renamed in this issue -- they are internal.

### 3. Stub registrations

- `src/lib/admin-nav/apps/sovereign-link.ts` -- label "Sovereign Link", items: Links, Analytics. `visibleWhen: 'available'` for now (not yet installed per-org)
- `src/lib/admin-nav/apps/sovereign-voice.ts` -- label "Sovereign Voice", items: Voice Settings. `visibleWhen: 'available'`

### 4. Wire into platform layout

`platform/layout.tsx`:
- Import the registry
- In `buildNavItems()`, after ORGANIZATION + PEOPLE sections, iterate the registry
- For each registered app, ALWAYS render the app's sub-section (all apps are "available" per decision 2026-04-20)
- Interactive vs greyed-out depends on the org's licensing entitlement:
  - **Licensed** -> items render normally, links active
  - **Not licensed** -> items render greyed + non-clickable, with a "Licensed by BrickOS" tag next to the app label. NO "Enable" button -- licensing is a commercial decision controlled by BrickOS platform admin via `brickos-licensing`, not self-serve.
- Role gates from the item's `roles: []` still apply on top (e.g. a platform-admin-only item stays hidden from org_owners)

### 5. Entitlement lookup

Add `useOrgEntitlements()` hook that reads from `/api/v1/org/entitlements` (or extends the existing branding call). Returns a `Set<appKey>`. Cache + refresh on org switch.

If the backend doesn't have an entitlements endpoint yet, emit a minimal one that returns the org's currently active app-license slugs from `brickos-licensing`. This is the authoritative source -- the frontend must NOT have a secondary "installed flag".

## Acceptance

- Adding a new app = one new file under `src/lib/admin-nav/apps/`. No platform layout edits.
- Org owner on `{slug}.brickos.io/platform` sees:
  - ORGANIZATION + PEOPLE sections (from #570)
  - APPS section listing ALL registered apps:
    - Sovereign Health (licensed; items active)
    - Sovereign Link (not licensed; items greyed; "Licensed by BrickOS" tag)
    - Sovereign Voice (not licensed; items greyed; "Licensed by BrickOS" tag)
- Platform admin on `app.brickos.io/platform` sees the same APPS section + PLATFORM section; on an org subdomain, also sees the branded "BrickOS admin · scope: {OrgName}" banner
- No occurrence of "SHI" in the admin nav user-facing strings (grep locale files)
- Entitlement hook returns a valid set for `test-clinic` on staging
- A user without a valid role for any item in an app's sub-section doesn't see that app's sub-section at all
