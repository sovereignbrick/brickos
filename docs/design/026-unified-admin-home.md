# Design 026 -- Unified Admin Home: Merge `/org` into `/platform`

**Status:** Draft
**Date:** 2026-04-20
**Related:** 014-brickos-platform-gui, 015-brickos-unified-app-routing (amended), 025-domain-realignment, ADR-049
**Sprint:** 046 (Unified Admin)

## Problem

Today there are **three** admin surfaces with heavy overlap:

| Route | Who | Scope | Status |
|---|---|---|---|
| `/admin` | SHI super-admin (legacy, `user.role === 'admin'`) | SHI app only | Legacy, predates /platform, flat tab list |
| `/platform` | BrickOS platform admin + org roles (role-aware sidebar) | Multi-app, all orgs or filtered to one | Modern, already section-grouped |
| `/org` | Org admin for the current tenant (Sprint 044) | Single org (current subdomain) | New, parallel-universe silo |

Since Sprint 044 landed the two-plane model (Design 025), users reported that logging in on `{slug}.brickos.io` lands on `/org` with a shallow flat sidebar, while `/platform` offers a much richer role-aware nav. The org-admin flows that `/org` re-implements (branding, members, domains, billing, analytics, affiliate) are already in `/platform` and already correctly gated by role.

On top of that, new apps (Sovereign Link, Sovereign Voice, etc.) will want their own org-scoped settings. Today there is no consistent place for "app X settings for this org" -- `/org/apps/shi/{email,ai}` is a one-off.

## Decision

**Merge `/org/*` into `/platform/*` with a role- and context-aware sidebar.** `/admin/*` is deprecated; its remaining admin-only content is absorbed into `/platform/*`.

The user lands on `/platform` after logging in on the admin plane (`{slug}.brickos.io` or `app.brickos.io`). What they see in the sidebar depends on:

1. **Plane** -- admin plane only; PlaneGate keeps /platform off the end-user plane
2. **Role** -- `platform_admin` / `org_owner` / `tech_admin` / `commercial_admin` (already implemented in `platform/layout.tsx:26-31`)
3. **Org context** -- on `{slug}.brickos.io` the org filter is locked to that slug; on `app.brickos.io` the platform admin can pick any org or "All orgs"

Apps register themselves in the **APPS** section and contribute org-scoped settings sub-pages via a per-app plugin. SHI contributes Email + AI Config; Sovereign Link contributes Links + Link Analytics; future apps add their own leaves without touching platform code.

## Current nav comparison

```
/org sidebar (today)                /platform sidebar (today)               /admin sidebar (legacy)
────────────────────────            ────────────────────────────────        ──────────────────────
OVERVIEW                            OVERVIEW                                dashboard
  Overview                            ⌂ Home                                users
                                                                            settings
GENERAL                             MANAGE                                  payments
  General                             ▦ Apps                                promotions
  Branding                            ⊞ Organizations     (platform)        affiliates
  Members                             ☺ Users             (platform)        links
  Domains                             ☹ Members                             revenue
  Analytics                                                                 content-app
  Affiliate                         COMMERCE                                content-web
  Billing                             ⚬ Billing                             content-strings
                                      ❤ Affiliates                          newsletter
APPS                                  ☆ Promotions        (platform)        ai-usage
  App Overview                        ⚖ Revenue           (platform)        audit-logs
  SHI -- Email                                                              metrics
  SHI -- AI Config                  LINKS                                   contact
                                      ↗ Links                               website
                                      ≡ Analytics

                                    CONTENT
                                      ✎ Content App       (platform)
                                      ⌘ Content Web       (tech)
                                      ✉ Newsletter
                                      ✆ Contact

                                    AI
                                      ☄ AI Usage

                                    OPS
                                      ♥ Services          (tech)
                                      ⚠ Alerts            (tech)
                                      ↑ Deploy            (platform)

                                    SECURITY
                                      ☐ Audit             (tech)
                                      ☑ Compliance        (platform)

                                    SETTINGS
                                      ☰ Settings          (platform)
                                      ❀ Branding
                                      ☁ Domains
                                      ⚔ Licensing         (platform)
                                      ⚛ Features          (platform)
```

**Overlap detected:** Branding, Members, Domains, Analytics, Affiliate, Billing -- all exist in BOTH `/org` and `/platform`. The `/org` copies are flat wrappers that call the same backend endpoints as the `/platform` copies.

## Proposed unified nav

The same `/platform` route tree on both planes, with sidebar items gated by role + context. Below is what an **org owner** sees on `{slug}.brickos.io/platform`:

```
┌──────────────────────────────────────────────┐
│  Test Clinic         [ switch org v ]        │  ← header, org filter locked
├──────────────────────────────────────────────┤
│                                              │
│  OVERVIEW                                    │
│   ⌂  Home                                    │  → /platform
│                                              │
│  ORGANIZATION                                │  ← was /org/*
│   ⚞  General                                 │  → /platform/org/general
│   ❀  Branding                                │  → /platform/org/branding
│   ☁  Domains                                 │  → /platform/org/domains
│   ❤  Affiliate                               │  → /platform/org/affiliate
│   ⚬  Billing                                 │  → /platform/org/billing
│   ≡  Analytics                               │  → /platform/org/analytics
│                                              │
│  PEOPLE                                      │  ← unified members list
│   ☺  Members                                 │  → /platform/members (orgFilter locked)
│                                              │
│  APPS                                        │  ← installed for this org
│   ▦  App Overview                            │  → /platform/apps
│   ┌─ SHI ──────────────────────────────┐    │
│   │ ✉  Email Templates                 │    │  → /platform/apps/shi/email
│   │ ☄  AI Config                       │    │  → /platform/apps/shi/ai
│   │ ⚔  Licensing                       │    │  → /platform/apps/shi/licensing
│   └────────────────────────────────────┘    │
│   ┌─ Sovereign Link ───────────────────┐    │
│   │ ↗  Links                           │    │  → /platform/apps/links
│   │ ≡  Link Analytics                  │    │  → /platform/apps/links/analytics
│   └────────────────────────────────────┘    │
│   ┌─ Sovereign Voice (installed)  ────┐    │
│   │ 🎙  Voice Settings                │    │  → /platform/apps/voice
│   └────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘
```

And what a **platform admin** sees on `app.brickos.io/platform`:

```
┌──────────────────────────────────────────────┐
│  BrickOS Platform    [ All orgs v ] [App v]  │  ← header, global filters
├──────────────────────────────────────────────┤
│                                              │
│  OVERVIEW                                    │
│   ⌂  Home                                    │
│                                              │
│  PLATFORM                                    │  ← platform-admin only
│   ⊞  Organizations                           │
│   ☺  Users                                   │
│   ☆  Promotions                              │
│   ⚖  Revenue                                 │
│   ⚔  Licensing                               │
│   ⚛  Features                                │
│   ↑  Deploy                                  │
│                                              │
│  ORGANIZATION  (scoped to filter)            │  ← when orgFilter != "all"
│   ⚞ General / ❀ Branding                     │
│   ☁ Domains / ⚬ Billing / ≡ Analytics        │
│                                              │
│  APPS  (scoped to appFilter)                 │
│   ▦ Overview                                 │
│   [ per-app sub-trees as above ]             │
│                                              │
│  CONTENT                                     │
│   ✎ App / ⌘ Web / ✉ Newsletter / ✆ Contact   │
│                                              │
│  OPS                                         │
│   ♥ Services / ⚠ Alerts / ↑ Deploy           │
│                                              │
│  SECURITY                                    │
│   ☐ Audit / ☑ Compliance                     │
│                                              │
└──────────────────────────────────────────────┘
```

Same `/platform/*` URL tree on both planes. The sidebar renders differently because the `visible(ctx)` predicate already exists in `platform/layout.tsx`.

## Profile-menu entry (separate ask)

Besides the merge, add a "Switch to Admin" / "Your organization" entry to the **profile dropdown** on the **end-user plane** (`{slug}.sovereignhealth.io`):

```
Profile dropdown (end-user plane)          Profile dropdown (admin plane)
─────────────────────────────              ─────────────────────────────
  Account                                    Account
  Settings                                   Settings
  ──────────────────                         ──────────────────
  Admin →  (opens {slug}.brickos.io/        Open SHI App →  (opens
           platform in new tab,                             {slug}.sovereignhealth.io/
           visible only if user has                         dashboard in new tab)
           any admin role)                 ──────────────────
  ──────────────────                         Sign out
  Sign out
```

This covers the "I'm an org admin who's also an end user and I want to jump to my admin home" flow without bloating the primary nav.

## App plugin model

Each installed app contributes its nav entries via a declarative registration, not a hard-coded list. Initial shape (TypeScript, illustrative):

```ts
// packages/brickos-admin-nav/src/apps/shi.ts
export const SHI_NAV: AppNavContribution = {
  appKey: 'shi',
  label: 'SHI',
  orgSettings: [
    { key: 'email', label: 'Email Templates', href: '/platform/apps/shi/email', roles: ['org_owner', 'platform_admin'] },
    { key: 'ai',    label: 'AI Config',       href: '/platform/apps/shi/ai',    roles: ['org_owner', 'platform_admin'] },
    { key: 'lic',   label: 'Licensing',       href: '/platform/apps/shi/licensing', roles: ['platform_admin'] },
  ],
}
```

Platform layout imports the registry; the APPS section iterates over `org.installedApps` and renders each app's contributions. Adding Sovereign Link requires only a new `link.ts` registration file.

This also lets the app appear / disappear in the nav when an org toggles the app on or off (feature flag / entitlement).

## Migration (Sprint 046)

### Phase A -- Sidebar consolidation (1d)

1. Move the `/org` page components into `/platform/org/*` (same backend, no data changes). Concretely: `src/app/org/branding/` -> `src/app/platform/org/branding/`.
2. Extend `platform/layout.tsx:buildNavItems()` with the new ORGANIZATION section; gate items with `o = isOrgOwner || isTechAdmin || ...` as already in place.
3. Redirect `/org/*` -> `/platform/org/*` at the Next.js level (`next.config.ts` redirects).
4. Remove the standalone `/org/layout.tsx`.

### Phase B -- APPS section + plugin registry (1d)

1. Create `src/lib/admin-nav/` with types + app registry.
2. Register SHI via `src/lib/admin-nav/apps/shi.ts`; move `/org/apps/shi/{email,ai}` into `/platform/apps/shi/{email,ai}`.
3. Empty-registration stubs for Sovereign Link / Voice so the section renders even with no installed apps (for future expansion).
4. Update `platform/layout.tsx` to iterate the registry and render grouped sub-items.

### Phase C -- Deprecate `/admin` (0.5d)

1. Audit which `/admin` tabs have no `/platform` equivalent (content-strings is a stub; metrics, contact, website may need migration).
2. Move remaining content under `/platform/*`.
3. Redirect `/admin` -> `/platform` for `platform_admin`, 404 for everyone else.

### Phase D -- Profile menu + cross-plane entry (0.5d)

1. Add "Admin" profile-menu link on end-user plane (opens `{slug}.brickos.io/platform` in new tab) -- visible only if JWT claims include any admin role.
2. Add "Open SHI App" profile-menu link on admin plane -- opens `{slug}.sovereignhealth.io/dashboard`.
3. PlaneGate already handles the route-level redirects; these profile links are explicit escape hatches.

### Phase E -- Docs + RC (0.5d)

1. Update Design 014 (BrickOS Platform GUI), 015 (Unified App Routing), 021 (SHI White-Label) to reference Design 026 as the canonical admin home spec.
2. Update Sprint 045 RC checklist (#566) with the new URL tree.

**Total: ~3.5 days.**

## Acceptance

- Org owner logs in at `{slug}.brickos.io/login` -> lands on `/platform`, sees ORGANIZATION + APPS sections, no PLATFORM section.
- Platform admin logs in at `app.brickos.io/login` -> lands on `/platform`, sees full sidebar including PLATFORM section and can switch orgs.
- `{slug}.brickos.io/org/*` redirects to `{slug}.brickos.io/platform/org/*`.
- `app.brickos.io/admin` redirects to `app.brickos.io/platform` for platform admins, 404s for org members.
- Adding a new app registration file shows its sub-section in the APPS nav without other code changes.
- Profile menu on end-user plane shows "Admin" link (admins only) that opens the admin plane home in a new tab.

## Resolved decisions (2026-04-20)

1. **`/admin` BC**: hard-remove, no redirect window. No users, no bookmarks to preserve.
2. **Platform admin on org subdomain**: sees the PLATFORM section with a persistent **branded** top banner:
   `"BrickOS admin · scope: {OrgName}     [← Back to all orgs]"`
   The link returns to `app.brickos.io/platform` (resetting orgFilter). Dismissable per session but reappears on the next visit.
3. **App entitlements**: all registered apps are VISIBLE in the APPS section. Licensing (install) is controlled by BrickOS platform admin via `brickos-licensing`, not by the org admin. Unlicensed apps render greyed-out with a "Licensed by BrickOS" tag (no self-serve Enable button). Licensed apps are interactive. Rationale: licensing is a commercial decision, not a feature flag the org can toggle.
4. **App naming**: user-facing labels use "Sovereign Health", "Sovereign Link", "Sovereign Voice", etc. -- NOT "SHI" abbreviation. Internal package/crate names stay as today (`sovereign-health-backend`, `shi-web` Docker tag, etc.).
5. **Mobile + PWA**: the unified `/platform` layout MUST work on narrow viewports and inside the installed PWA. Existing `/platform` mobile sheet is the starting point; extend to cover nested APPS sub-sections (collapse on tap, restore on re-visit).
6. **Shared SSO across planes**: **deferred to Sprint 047+**. Two-session default (cookies scoped per plane) ships in Sprint 046. See "Cross-plane SSO tradeoffs" below. A dedicated issue tracks the future decision gate.

## Cross-plane SSO tradeoffs (for the record)

**Keep two sessions (Sprint 046 default):**
- Cookie scoping is automatic: `.brickos.io` cookies don't leak to `.sovereignhealth.io`. Zero extra code, zero extra attack surface.
- XSS containment: a script injected into the SHI end-user app can't replay org-admin actions on the admin plane.
- Matches GitHub / Stripe / bank patterns (separate session for admin / business / enterprise surfaces).

**Shared SSO alternative (future):**
- Implementation: login issues a short-lived cross-plane token -> redirect to `{slug}.sovereignhealth.io/auth/sso?t=...` -> exchanges for a `.sovereignhealth.io`-scoped cookie. ~1-2 days of work.
- Wins: one login for users who are both org admins AND end users of their own app.
- Costs: extra endpoint, CSRF + open-redirect surface, larger blast radius on compromise.

**Decision rule for activating shared SSO later**: if org-admin telemetry shows >X% repeat logins per day between planes, revisit. Otherwise hold.

## Out of scope

- Renaming `/platform` to `/admin` (URL stability matters)
- Mobile nav redesign beyond "make the existing /platform layout work cleanly" (no new IA)
