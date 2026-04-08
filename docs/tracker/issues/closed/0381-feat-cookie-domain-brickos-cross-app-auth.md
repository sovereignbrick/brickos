---
github_number: 381
title: "feat: set auth cookie domain to .brickos.io for cross-app session sharing"
milestone: platform-admin-gui
labels: [feat, P1]
---

## Problem

Auth token cookie is set without explicit domain, so it's only readable on the exact hostname where login occurred (e.g., demo.brickos.io). When navigating to /sovereignhealth/ (SHI app via brickos.io), the session doesn't persist because the cookie domain doesn't cover all subdomains.

## Fix

When on *.brickos.io, set cookie domain to `.brickos.io`:

```typescript
Cookies.set('auth_token', token, {
  domain: window.location.hostname.endsWith('.brickos.io') ? '.brickos.io' : undefined,
  secure: true,
  sameSite: 'lax',
  path: '/',
})
```

Reference: docs/design/015-brickos-unified-app-routing.md Section 5

## Files

- `apps/health/sovereign-health/frontend/src/lib/api.ts` -- setToken function
