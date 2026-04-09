---
number: 391
title: "feat: Sovereign CRM frontend scaffold -- full SHI-parity base UI"
milestone: "Sovereign CRM MVP"
labels: [platform-elevation]
created: 2026-04-08
updated: 2026-04-09
sprint: 036
points: 8
blocked_by: []
---

Scaffold the Next.js 16 frontend for Sovereign CRM with full SHI-parity base UI. This is NOT just empty placeholders -- it ships with working auth pages, navbar, settings, and brand system.

## SHI-Parity Base UI Checklist

### Auth Pages
- `/login` -- email + password, MFA (TOTP 6-digit + recovery code fallback), demo mode detection
- `/signup` -- email, password (strength indicator: weak/fair/good/strong/very strong), display name, country, newsletter consent, TOS, referral code detection
- `/forgot-password` -- email entry, reset token flow
- `/verify-email` -- token verification, auto-login option

### Root Layout Provider Stack (same nesting as SHI)
```
<html dark suppressHydrationWarning>
  <head> brand detection script (prevents logo flash)
  <body>
    NextIntlClientProvider
      ThemeProvider (dark/light)
        AuthProvider (cookie JWT, session expiry, window focus refresh)
          ContentProvider
            {children}
            Toaster (sonner)
```

### Navbar Component
- Sticky, responsive, auto-hide on mobile scroll (down=hide, up=show)
- Logo + app name (brand-aware: Sovereign CRM vs BrickOS)
- **Top navigation menu:** Dashboard, Contacts, Companies, Projects
- Language selector (EN/DE dropdown)
- Search icon (Ctrl+K / Cmd+K shortcut)
- User menu (authenticated): avatar with initials, display name, tier badge, Settings, Theme toggle (sun/moon), Sign out (red)
- Unauthenticated: Login + Sign Up buttons
- Mobile hamburger menu: portal-based, focus trap, body scroll lock, Escape key close

### Brand System
- `lib/brand.ts` -- two brand configs: SovereignCRM (default) and BrickOS
- Hostname-based detection in middleware + cookie
- Server-side `<head>` script runs BEFORE React to set brand class
- `useBrand()` hook reads cookie on hydration
- Brand config: logo, logoAlt, appName, subtitle, showDemo, showRegister

### Auth Provider
- Cookie-based JWT storage (js-cookie, SameSite: lax, Secure on HTTPS)
- Domain: '.brickos.io' for cross-subdomain, '.sovereigncrm.io' for standalone
- `useAuth()` hook: user, loading, isDemo, logout, handleSessionExpired
- Window focus refresh (throttled 30s)
- Login grace period (5s suppress spurious session-expired)
- Custom 'session-expired' event listener

### Favicon / Metadata
- favicon.ico, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png
- OG image, Twitter card metadata
- Title template: "%s | Sovereign CRM"
- PWA manifest
- `robots: 'noai, noimageai'`

### Empty CRM Pages (wired into top nav)
- `/crm/dashboard` -- placeholder with welcome message
- `/crm/contacts` -- placeholder (filled in #406)
- `/crm/companies` -- placeholder (filled in #407)
- `/crm/projects` -- placeholder (filled in #408)
- `/crm/tags` -- placeholder (filled in #409)

### Design System
- Font: Geist / Geist Mono
- Dark theme enforced (#09090b background)
- No white backgrounds on selects/dropdowns/form elements
- shadcn/ui components
- Tailwind CSS v4
- Toast notifications via sonner
- packages/tokens for design tokens

### Other
- Standalone `pnpm-lock.yaml` for Docker builds (per feedback)
- `pnpm build` must pass before commit (per feedback)
- suppressHydrationWarning on html/body (per feedback)
- react-hook-form with standard schema resolver for validation

## Acceptance Criteria

- `pnpm install && pnpm build` succeeds
- User can navigate: signup -> verify -> login (with MFA) -> dashboard
- Navbar shows logo, user name, top menu, theme toggle, language selector
- Brand detection: sovereigncrm.io shows CRM branding, brickos.io shows BrickOS branding
- All pages dark theme, no white backgrounds
- i18n switches between EN and DE
- Mobile hamburger menu works with focus trap
- Standalone pnpm-lock.yaml present
