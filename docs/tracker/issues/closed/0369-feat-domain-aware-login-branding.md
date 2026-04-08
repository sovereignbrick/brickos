---
github_number: 369
title: "feat: domain-aware login/register page branding"
milestone: platform-admin-gui
labels: [feat, P1]
---

## Problem

When accessing `app.brickos.io/login`, the login page shows SHI branding (Sovereign Health Intelligence logo, "Sign in to your account", "View Demo" link). It should show BrickOS branding when on a brickos.io domain.

## Requirements

The login page should detect the hostname and switch branding:

### On *.brickos.io:
- Logo: BrickOS cube (`/brickos-cube.png`)
- Title: "BrickOS Platform"
- Subtitle: "Sign in to your platform account"
- No "View Demo" section (demo is SHI-specific)
- No "Register" link (platform accounts created by admin only)

### On *.sovereignhealth.io (or other app domains):
- Current behavior unchanged (SHI logo, demo link, register link)

## Implementation

Use variables in the login page based on hostname detection:

```typescript
const isBrickOS = typeof window !== 'undefined' && window.location.hostname.endsWith('.brickos.io')

const brandConfig = isBrickOS ? {
  logo: '/brickos-cube.png',
  title: 'BrickOS Platform',
  subtitle: 'Sign in to your platform account',
  showDemo: false,
  showRegister: false,
} : {
  logo: '/apple-touch-icon.png',
  title: 'Sovereign Health Intelligence',
  subtitle: 'Sign in to your account',
  showDemo: true,
  showRegister: true,
}
```

Apply the same pattern to `/register`, `/reset-password`, and `/verify-email` pages.

## Files

- `apps/health/sovereign-health/frontend/src/app/login/page.tsx`
- `apps/health/sovereign-health/frontend/src/app/register/page.tsx`
- `apps/health/sovereign-health/frontend/src/app/reset-password/page.tsx`
