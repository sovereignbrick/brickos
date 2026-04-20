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
- In `buildNavItems()`, after ORGANIZATION section, iterate the registry
- For each app:
  - If `visibleWhen === 'installed'`: only render if the org has the app entitlement
  - If `visibleWhen === 'available'`: render greyed-out with "Enable" CTA that links to a future "Install app" flow (stub `/platform/org/apps/enable?app={appKey}` for now -- 404 is fine)
- Role gates from the item's `roles: []` already handled

### 5. Entitlement lookup

Add `useOrgEntitlements()` hook that reads from `/api/v1/org/entitlements` (or extends the existing branding call). Returns a `Set<appKey>`. Cache + refresh on org switch.

If the backend doesn't have an entitlements endpoint yet, emit a minimal one that returns the org's currently active app-license slugs.

## Acceptance

- Adding a new app = one new file under `src/lib/admin-nav/apps/` + optional entitlement flag on the backend. No platform layout edits.
- Org owner on `{slug}.brickos.io/platform` sees:
  - ORGANIZATION section (from #570)
  - APPS section:
    - Sovereign Health (installed; sub-items expanded)
    - Sovereign Link (available, greyed + Enable)
    - Sovereign Voice (available, greyed + Enable)
- Platform admin on `app.brickos.io/platform` sees the same APPS section + PLATFORM section
- No occurrence of "SHI" in the admin nav user-facing strings (grep the locale files)
- Entitlement hook returns a valid set for `test-clinic` on staging
