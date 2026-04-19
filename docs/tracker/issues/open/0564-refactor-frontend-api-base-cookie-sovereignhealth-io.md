---
number: 564
title: "refactor(frontend): api.ts same-origin + cookie domain for .sovereignhealth.io"
milestone: "Sprint 045 -- Domain Realignment"
labels: [refactor, frontend, p0, white-label]
created: 2026-04-19
priority: P0
estimate: 0.25d
blocked_by: [562]
parent: 559
phase: 4
---

Phase 4 of Design 025. Frontend needs to treat `*.sovereignhealth.io` as same-origin and scope auth cookies to `.sovereignhealth.io` so sessions work across org subdomains.

## File: `apps/health/sovereign-health/frontend/src/lib/api.ts`

### `API_BASE` detection (lines 55-63)

Today:
```ts
if (host.endsWith('.brickos.io')) return ''
if (host === 'demo.sovereignhealth.io') return 'https://api-demo.sovereignhealth.io'
if (host === 'app.sovereignhealth.io') return 'https://api.sovereignhealth.io'
```

Target:
```ts
if (host.endsWith('.brickos.io')) return ''
if (host.endsWith('.sovereignhealth.io')) return ''  // same-origin via path-mount after #561/#562
```

Drop the explicit cross-origin cases for `app.sovereignhealth.io` and `demo.sovereignhealth.io` -- once path-mount is in place (#562), same-origin is correct everywhere on .sovereignhealth.io.

### Cookie `domain` scope (lines 70-77, 82-83)

Today the `isBrickOS` check sets cookie domain to `.brickos.io` when the hostname ends with `.brickos.io`. Mirror this for sovereignhealth.io:

```ts
const host = typeof window !== 'undefined' ? window.location.hostname : ''
const cookieDomain = host.endsWith('.brickos.io') ? '.brickos.io'
                  : host.endsWith('.sovereignhealth.io') ? '.sovereignhealth.io'
                  : undefined
```

Apply the same logic in both `setToken` and `clearToken`.

## Acceptance

- Login on `test-clinic.sovereignhealth.io` sets `auth_token` with Domain=`.sovereignhealth.io`
- Navigating to `test-clinic.sovereignhealth.io/dashboard` after login uses that cookie (same-origin XHR)
- Frontend XHR calls do NOT include `Origin:` header mismatch (same-origin, no CORS preflight)
- Existing behaviour on `*.brickos.io` unchanged
- Logout clears cookie on the correct domain
