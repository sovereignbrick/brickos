# Sprint 045 + 046 RC Checklist (v0.43.0)

**Date:** 2026-04-20
**Version target:** v0.43.0
**Staging URLs:**
- Admin plane: `https://test-clinic.demo.brickos.io`
- End-user plane: `https://test-clinic.demo.sovereignhealth.io`
- Platform admin landing: `https://demo.brickos.io`
- SHI default (no org): `https://app.sovereignhealth.io` (read-only smoke)
- Tester: __________
- Browser + platform: __________

> **Prep:** Fresh incognito window per section. Clear cookies between A, B, and C so stale plane cookies don't skew results.

---

## A. Admin plane (`test-clinic.demo.brickos.io`)

### A1. Login + landing

| # | Check | Expected | Pass |
|---|---|---|---|
| A1.1 | Open `/login` | Test Clinic logo + "Sign in to Test Clinic" | [ ] |
| A1.2 | Login with org_owner creds | Lands on `/platform/org` (NOT `/dashboard`) | [ ] |
| A1.3 | Sidebar OVERVIEW section | "Home" item visible | [ ] |
| A1.4 | Sidebar ORGANIZATION section | 7 items: Overview, General, Branding, Domains, Analytics, Affiliate, Billing | [ ] |
| A1.5 | Sidebar PEOPLE section | Members item visible | [ ] |
| A1.6 | Sidebar APPS section | Sovereign Health (licensed, items clickable), Sovereign Link (greyed + "Licensed by BrickOS" tag), Sovereign Voice (greyed + tag) | [ ] |
| A1.7 | Sidebar shows NO PLATFORM section | Correct for org_owner; only visible to platform_admin | [ ] |

### A2. Organization pages render

| # | Check | Expected | Pass |
|---|---|---|---|
| A2.1 | `/platform/org` | Overview cards + KPIs | [ ] |
| A2.2 | `/platform/org/general` | General settings form | [ ] |
| A2.3 | `/platform/org/branding` | Branding upload form, saves logo | [ ] |
| A2.4 | `/platform/org/domains` | Custom domains list | [ ] |
| A2.5 | `/platform/org/analytics` | Analytics dashboard | [ ] |
| A2.6 | `/platform/org/affiliate` | Affiliate settings | [ ] |
| A2.7 | `/platform/org/billing` | Billing + license overview | [ ] |

### A3. Unified members list

| # | Check | Expected | Pass |
|---|---|---|---|
| A3.1 | `/platform/members` | Members table scoped to Test Clinic (orgFilter locked) | [ ] |
| A3.2 | `/platform/org/members` direct URL | 404 (intentional; moved to `/platform/members`) | [ ] |
| A3.3 | Member with multiple roles | All roles visible in row | [ ] |
| A3.4 | Member visibility matches role gate | Most-permissive role determines nav items seen | [ ] |

### A4. Apps section interactivity

| # | Check | Expected | Pass |
|---|---|---|---|
| A4.1 | Click "Email Templates" under Sovereign Health | Navigates to `/platform/org/apps/shi/email` | [ ] |
| A4.2 | Click "AI Config" under Sovereign Health | Navigates to `/platform/org/apps/shi/ai` | [ ] |
| A4.3 | Click any item under Sovereign Link | No navigation (cursor-not-allowed) | [ ] |
| A4.4 | Hover greyed app label | Tooltip "Contact BrickOS to license this app" | [ ] |

### A5. /admin deprecated

| # | Check | Expected | Pass |
|---|---|---|---|
| A5.1 | Visit `/admin` | 308 redirect to `/platform` | [ ] |
| A5.2 | Visit `/admin/anything` | 308 redirect to `/platform` | [ ] |
| A5.3 | `grep` check in shipped JS bundle | No frontend link references `/admin` as a target | [ ] |

### A6. /org redirects

| # | Check | Expected | Pass |
|---|---|---|---|
| A6.1 | Visit `/org` | 308 redirect to `/platform/org` | [ ] |
| A6.2 | Visit `/org/branding` | 308 redirect to `/platform/org/branding` | [ ] |
| A6.3 | Visit `/org/members` | 308 redirect (then 404 because target doesn't exist -- acceptable) | [ ] |

### A7. Profile menu cross-plane link

| # | Check | Expected | Pass |
|---|---|---|---|
| A7.1 | Open profile dropdown (avatar) | "Settings" + "Open Sovereign Health ↗" + "Logout" visible | [ ] |
| A7.2 | Click "Open Sovereign Health ↗" | Opens `test-clinic.demo.sovereignhealth.io/dashboard` in NEW TAB | [ ] |
| A7.3 | Current admin-plane session unaffected | Still logged in on the first tab | [ ] |

### A8. Admin-plane /settings (BrickOS master tabs only)

| # | Check | Expected | Pass |
|---|---|---|---|
| A8.1 | Visit `/settings` | Stays on brickos.io (does NOT redirect to sovereignhealth.io) | [ ] |
| A8.2 | Visible tabs | Account, Security, Data & Privacy (3 only) | [ ] |
| A8.3 | Hidden tabs | NO Health profile / Devices / Thresholds / Medications | [ ] |
| A8.4 | Account tab | Shows notifications + billing inline sections | [ ] |

### A9. Platform admin banner (only for platform_admin logged in on org subdomain)

| # | Check | Expected | Pass |
|---|---|---|---|
| A9.1 | As platform_admin, visit `{slug}.demo.brickos.io/platform` | Banner: "BrickOS admin · scope: Test Clinic   [← Back to all orgs]" | [ ] |
| A9.2 | Click "Back to all orgs" | Goes to `demo.brickos.io/platform` with no orgFilter | [ ] |
| A9.3 | As org_owner (not platform_admin) | Banner is hidden | [ ] |

---

## B. End-user plane (`test-clinic.demo.sovereignhealth.io`)

### B1. Login + landing

| # | Check | Expected | Pass |
|---|---|---|---|
| B1.1 | `/login` shows org branding | Test Clinic logo + "Sign in to Test Clinic" | [ ] |
| B1.2 | Login with member creds | Lands on `/dashboard` | [ ] |
| B1.3 | Cookie domain | `.sovereignhealth.io` (inspect DevTools) | [ ] |

### B2. End-user app functional smoke

| # | Check | Expected | Pass |
|---|---|---|---|
| B2.1 | `/dashboard` | SHI dashboard renders with user data | [ ] |
| B2.2 | `/measurements` | Measurements list loads | [ ] |
| B2.3 | `/doctor-chat` | Doctor chat loads | [ ] |
| B2.4 | `/trends` | Trends page loads | [ ] |
| B2.5 | `/zones/inflammation` | Zone detail loads | [ ] |

### B3. End-user /settings (all tabs)

| # | Check | Expected | Pass |
|---|---|---|---|
| B3.1 | Visit `/settings` | Stays on sovereignhealth.io (no redirect) | [ ] |
| B3.2 | Visible tabs | Health profile, Devices, Thresholds, Medications, Account, Security, Data & Privacy (7 tabs) | [ ] |
| B3.3 | Default tab | Health profile | [ ] |

### B4. Profile menu cross-plane link

| # | Check | Expected | Pass |
|---|---|---|---|
| B4.1 | As admin role user, open profile menu | "Admin ↗" entry visible | [ ] |
| B4.2 | Click "Admin ↗" | Opens `test-clinic.demo.brickos.io/platform` in NEW TAB | [ ] |
| B4.3 | As plain member (no admin role), open profile menu | NO "Admin ↗" entry | [ ] |
| B4.4 | Current end-user session unaffected | Still logged in on the first tab | [ ] |

---

## C. Cross-plane redirects (plane gate)

| # | Check | Expected | Pass |
|---|---|---|---|
| C1 | On `test-clinic.demo.brickos.io`, type `/dashboard` in URL bar | Redirects to `test-clinic.demo.sovereignhealth.io/dashboard` | [ ] |
| C2 | On `test-clinic.demo.sovereignhealth.io`, type `/platform/org/branding` | Redirects to `test-clinic.demo.brickos.io/platform/org/branding` | [ ] |
| C3 | `/measurements` on admin plane | Redirects to end-user plane | [ ] |
| C4 | `/doctor-chat` on admin plane | Redirects to end-user plane | [ ] |
| C5 | `/platform` on end-user plane | Redirects to admin plane | [ ] |
| C6 | `/login` on either plane | NO redirect (shared route) | [ ] |
| C7 | `/settings` on either plane | NO redirect (plane-filtered tabs, not plane-gated) | [ ] |

---

## D. Platform admin (`demo.brickos.io` - no org scope)

| # | Check | Expected | Pass |
|---|---|---|---|
| D1 | Login as platform_admin | Lands on `/platform` | [ ] |
| D2 | Sidebar sections visible | ALL of them: OVERVIEW · ORGANIZATION · PEOPLE · MANAGE · COMMERCE · LINKS · CONTENT · AI · OPS · SECURITY · SETTINGS · APPS | [ ] |
| D3 | `/platform/orgs` | Lists all orgs (including Test Clinic) | [ ] |
| D4 | Click Test Clinic from the orgs list | Lands on `test-clinic.demo.brickos.io/platform` with scope banner | [ ] |
| D5 | `/platform/users` | Platform-level user list | [ ] |
| D6 | `/platform/revenue` | Revenue dashboard | [ ] |
| D7 | `/platform/deploy` | Deploy view visible | [ ] |

---

## E. Mobile + PWA (#574)

Test on at least: iOS Safari (narrow width), Chrome Android, installed PWA (either OS).

### E1. Narrow viewport layout

| # | Check | Expected | Pass |
|---|---|---|---|
| E1.1 | `/platform` sidebar behaviour | Hamburger button visible at bottom-right; tap toggles sidebar | [ ] |
| E1.2 | ORGANIZATION section items readable | No horizontal scroll, labels not truncated badly | [ ] |
| E1.3 | APPS section + nested items | Sub-items indent correctly; greyed-state visible | [ ] |
| E1.4 | "Licensed by BrickOS" tag | Visible without overflow on narrow screens | [ ] |
| E1.5 | Platform-admin scope banner | Wraps cleanly on narrow width | [ ] |

### E2. Touch targets

| # | Check | Expected | Pass |
|---|---|---|---|
| E2.1 | Sidebar nav items | ≥ 44×44 CSS px (iOS HIG minimum) | [ ] |
| E2.2 | Profile avatar | ≥ 44×44 | [ ] |
| E2.3 | Hamburger toggle | ≥ 44×44 | [ ] |

### E3. PWA install + offline

| # | Check | Expected | Pass |
|---|---|---|---|
| E3.1 | `/platform` installable as PWA from admin plane | Install banner or "Add to Home Screen" works | [ ] |
| E3.2 | Installed PWA launches to last visited admin route | Doesn't blow away the session | [ ] |
| E3.3 | Offline: admin pages with cached data | Renders from cache or shows offline banner | [ ] |
| E3.4 | `/sw.js` served with `Cache-Control: no-cache` | Verify in DevTools (matches `feedback_sw_cache_no_cache.md`) | [ ] |

### E4. Cross-plane new-tab behaviour inside PWA

| # | Check | Expected | Pass |
|---|---|---|---|
| E4.1 | "Admin ↗" from end-user PWA | Opens browser tab (not in-app), session on source unaffected | [ ] |
| E4.2 | "Open Sovereign Health ↗" from admin PWA | Same | [ ] |

---

## F. Carry-over Sprint 045 checks

### F1. DNS + SSL

| # | Check | Expected | Pass |
|---|---|---|---|
| F1.1 | `test-clinic.demo.sovereignhealth.io` cert valid | LE wildcard cert, expiry 2026-07-18 | [ ] |
| F1.2 | `test-clinic.demo.brickos.io` cert valid | CF origin cert | [ ] |
| F1.3 | `curl -I https://test-clinic.demo.sovereignhealth.io/` | HTTP 200 / 301 (not 5xx or cert error) | [ ] |

### F2. Nginx routing

| # | Check | Expected | Pass |
|---|---|---|---|
| F2.1 | `curl -H "Accept: text/html" https://test-clinic.demo.sovereignhealth.io/settings` | Frontend HTML (200) | [ ] |
| F2.2 | `curl -H "Accept: */*" https://test-clinic.demo.sovereignhealth.io/api/v1/org/branding` | Backend JSON with org branding | [ ] |
| F2.3 | `curl https://test-clinic.demo.brickos.io/admin` with `Accept: text/html` | 308 to `/platform` | [ ] |

### F3. Backend org_resolver

| # | Check | Expected | Pass |
|---|---|---|---|
| F3.1 | `GET /api/v1/org/branding` on `test-clinic.demo.brickos.io` | `is_org=true, org_slug=test-clinic` | [ ] |
| F3.2 | Same on `test-clinic.demo.sovereignhealth.io` | `is_org=true, org_slug=test-clinic` (same org, both planes) | [ ] |
| F3.3 | Same on `app.sovereignhealth.io` | `is_org=false` | [ ] |

### F4. Backend app-key rename

| # | Check | Expected | Pass |
|---|---|---|---|
| F4.1 | Authed `GET /org-settings/apps` | Returns `sovereign-health`, `sovereign-link`, `sovereign-voice` keys (NOT `shi`, `link`) | [ ] |

---

## G. Release readiness

| # | Check | Expected | Pass |
|---|---|---|---|
| G1 | No console errors on any tested page (DevTools) | Clean | [ ] |
| G2 | No "SHI" string in user-facing nav / labels | grep locale files for `"SHI"` finds 0 hits | [ ] |
| G3 | Version string on backend `/health` | `"version": "0.43.0"` (after version bump in Phase E / #575) | [ ] |
| G4 | Version label on staging RC banner | shows `v0.43.0-bN` | [ ] |

---

## Sign-off

- All sections pass: __________
- Blockers filed as issues: __________
- Cleared for production deploy: __________
- Tester signature: __________
- Date: __________
