---
number: 564
title: "refactor(frontend): api.ts same-origin + cookie domain for .sovereignhealth.io + plane detection"
milestone: "Sprint 045 -- Domain Realignment"
labels: [refactor, frontend, p0, white-label]
created: 2026-04-19
priority: P0
estimate: 0.5d
blocked_by: [562]
parent: 559
phase: 4
---

Phase 4 of Design 025. Frontend needs three things:

1. **API_BASE**: same-origin for `*.sovereignhealth.io` (after #562) alongside existing `*.brickos.io` same-origin
2. **Cookie domain**: `.sovereignhealth.io` scope for end-user sessions, alongside existing `.brickos.io` scope for admin sessions
3. **Plane detection** (new): when hostname is `*.brickos.io`, only admin-plane routes render; when `*.sovereignhealth.io`, only end-user-plane routes render

## File: `apps/health/sovereign-health/frontend/src/lib/api.ts`

### `API_BASE` detection (lines 55-63)

Target:
```ts
if (host.endsWith('.brickos.io')) return ''
if (host.endsWith('.sovereignhealth.io')) return ''  // same-origin via path-mount after #562
```

Drop the explicit cross-origin branches for `app.sovereignhealth.io` and `demo.sovereignhealth.io`.

### Cookie `domain` scope (lines 70-77, 82-83)

```ts
const host = typeof window !== 'undefined' ? window.location.hostname : ''
const cookieDomain = host.endsWith('.brickos.io') ? '.brickos.io'
                  : host.endsWith('.sovereignhealth.io') ? '.sovereignhealth.io'
                  : undefined
```

Apply in both `setToken` and `clearToken`.

## New: `src/lib/plane.ts` (plane detection helper)

```ts
export type Plane = 'admin' | 'end-user' | 'unknown'

export function getPlane(host?: string): Plane {
  const h = host ?? (typeof window !== 'undefined' ? window.location.hostname : '')
  if (h.endsWith('.brickos.io') || h === 'brickos.io') return 'admin'
  if (h.endsWith('.sovereignhealth.io') || h === 'sovereignhealth.io') return 'end-user'
  return 'unknown'  // custom domains default to end-user via domain_mappings
}

// Admin-plane routes (allowed under *.brickos.io)
export const ADMIN_ROUTES = ['/login', '/org', '/platform', '/logout', '/forgot-password', '/reset-password', '/verify-email', '/signup']

// End-user-plane routes (allowed under *.sovereignhealth.io)
export const END_USER_ROUTES = ['/login', '/dashboard', '/measurements', '/markers', '/trends', '/doctor-chat', '/settings', '/zones', '/billing', '/donate', '/checkout', '/practitioner', '/search', '/admin', /* tab within settings */ '/register', '/signup', '/logout', '/forgot-password', '/reset-password', '/verify-email', '/legal', '/privacy', '/terms', '/offline']
```

## Apply plane gating

Root `layout.tsx` (or a middleware) checks the current path against the active plane's allowed prefix list. If mismatch:
- Option 1: redirect to the other plane's equivalent hostname with same path
- Option 2: 404 / show a "wrong plane" message with a link to the correct one

Recommend **Option 1 for common cases** (so old bookmarks keep working). Implementation: `router.replace(\`https://\${currentSlug}.sovereignhealth.io\${pathname}\`)` when admin plane hit an end-user route, and vice versa.

## Acceptance

- Login on `test-clinic.sovereignhealth.io` sets cookie with Domain=`.sovereignhealth.io`
- Login on `test-clinic.brickos.io` sets cookie with Domain=`.brickos.io`
- Visiting `/dashboard` on `test-clinic.brickos.io` redirects to `test-clinic.sovereignhealth.io/dashboard`
- Visiting `/org/branding` on `test-clinic.sovereignhealth.io` redirects to `test-clinic.brickos.io/org/branding`
- `*.brickos.io` admin-plane + `*.sovereignhealth.io` end-user-plane existing behaviours unchanged
- No CORS preflights in DevTools after #562 + #564 ship together
