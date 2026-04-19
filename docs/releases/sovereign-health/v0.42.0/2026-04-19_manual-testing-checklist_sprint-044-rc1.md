# Sprint 044 -- White-Label Go-Live -- RC1 Manual Testing Checklist

**Date:** 2026-04-19
**Version:** v0.42.0 (Sprint 044)
**Staging:** demo.brickos.io
**Tester:** _______________

---

## Section A: Sprint 044 New Features

### A1. Wildcard DNS + Nginx (#544)

| # | Test | URL | Expected | Pass |
|---|------|-----|----------|------|
| A1.1 | Wildcard subdomain serves frontend | `https://testorg.brickos.io/` | Frontend loads (may show login) | [ ] |
| A1.2 | Existing subdomains still work | `https://demo.brickos.io/` | Platform frontend loads | [ ] |
| A1.3 | Status page unaffected | `https://status.brickos.io/` | Gatus dashboard loads | [ ] |
| A1.4 | API subdomain unaffected | `https://api-demo.brickos.io/health` | JSON health response | [ ] |

### A2. Org Resolution Middleware (#545)

| # | Test | URL / Action | Expected | Pass |
|---|------|-------------|----------|------|
| A2.1 | Platform domain returns no org | `https://demo.brickos.io/api/v1/org/branding` | `is_org: false`, `org_name: "BrickOS"` | [ ] |
| A2.2 | Unknown slug returns no org | `https://nonexistent.brickos.io/api/v1/org/branding` | `is_org: false` (no org found) | [ ] |
| A2.3 | Valid org slug returns branding | Create org with slug "testclinic" via /platform/orgs, then visit `https://testclinic.brickos.io/api/v1/org/branding` | `is_org: true`, org name + branding | [ ] |
| A2.4 | Cache-Control header present | Check response headers on `/api/v1/org/branding` | `Cache-Control: public, max-age=300` | [ ] |

### A3. JWT Org Claims (#546)

| # | Test | URL / Action | Expected | Pass |
|---|------|-------------|----------|------|
| A3.1 | Login on platform domain -- no org claims | Login at `https://demo.brickos.io/login` | JWT has no `org_id` / `org_role` | [ ] |
| A3.2 | Login on org subdomain -- org claims present | Login at `https://testclinic.brickos.io/login` (user must be org member) | JWT contains `org_id` + `org_role` | [ ] |
| A3.3 | Non-member gets 403 on org login | Login with a user NOT in the org at `https://testclinic.brickos.io/login` | Error: "You are not a member of this organization" | [ ] |

### A4. Public Branding Endpoint (#547)

| # | Test | URL | Expected | Pass |
|---|------|-----|----------|------|
| A4.1 | Default branding on platform domain | `https://demo.brickos.io/api/v1/org/branding` | `primary_color: "#f97316"`, `accent_color: "#0ea5e9"` | [ ] |
| A4.2 | Org branding on org subdomain | `https://testclinic.brickos.io/api/v1/org/branding` | Org-specific colors/logo from branding JSONB | [ ] |
| A4.3 | No auth required | Open in incognito / no cookies | Returns 200 without auth | [ ] |

### A5. OrgContext React Provider (#548)

| # | Test | URL / Action | Expected | Pass |
|---|------|-------------|----------|------|
| A5.1 | CSS custom properties injected | Visit `https://testclinic.brickos.io/`, inspect `<html>` element | `--brand-primary` and `--brand-accent` set | [ ] |
| A5.2 | Default colors on platform domain | Visit `https://demo.brickos.io/`, inspect `<html>` | Default orange/blue values | [ ] |

### A6. Login Page Branding (#549)

| # | Test | URL | Expected | Pass |
|---|------|-----|----------|------|
| A6.1 | Platform login shows SHI/BrickOS branding | `https://demo.brickos.io/login` | SHI logo, "Sovereign Health Intelligence" or "BrickOS Platform" | [ ] |
| A6.2 | Org login shows org branding | `https://testclinic.brickos.io/login` | Org logo, org name, "Sign in to [OrgName]" | [ ] |
| A6.3 | Register/demo links hidden on org login | `https://testclinic.brickos.io/login` | No "Create account" or "View Demo" links | [ ] |
| A6.4 | Legacy domain login unchanged | `https://demo.sovereignhealth.io/login` | SHI branding, register + demo visible | [ ] |

### A7. Main UI Branding (#550)

| # | Test | URL / Action | Expected | Pass |
|---|------|-------------|----------|------|
| A7.1 | Navbar shows org logo + name | Log in on `https://testclinic.brickos.io/` | Navbar: org logo, org name (or app_name if set) | [ ] |
| A7.2 | Navbar shows SHI on platform | Log in on `https://demo.brickos.io/` | Navbar: SHI logo, "Sovereign Health Intelligence" | [ ] |
| A7.3 | brand-primary-bg class works | Check buttons with `brand-primary-bg` class | Uses `--brand-primary` color | [ ] |

### A8. Per-Org Email Templates (#551)

| # | Test | Action | Expected | Pass |
|---|------|--------|----------|------|
| A8.1 | Verification email uses org branding | Sign up new user via org subdomain (or check email template endpoint) | Email shows org logo + name, not SHI | [ ] |
| A8.2 | Platform emails use SHI branding | Sign up on platform domain | Email shows SHI logo + name | [ ] |
| A8.3 | Billing emails always use BrickOS | Trigger billing email | BrickOS branding (not org) | [ ] |

### A9. RLS Data Isolation (#552)

| # | Test | Action | Expected | Pass |
|---|------|--------|----------|------|
| A9.1 | Measurements have org_id column | Check DB: `SELECT org_id FROM measurements LIMIT 5` | Column exists, some rows backfilled | [ ] |
| A9.2 | Individual users see own data | Login without org context, view measurements | Normal behavior, unchanged | [ ] |
| A9.3 | Org user sees org-scoped data | Login via org subdomain, view measurements | Only sees measurements with matching org_id or NULL | [ ] |

### A10. Practitioner Dashboard (#553)

| # | Test | URL / Action | Expected | Pass |
|---|------|-------------|----------|------|
| A10.1 | Unauthenticated redirects to login | `https://demo.brickos.io/practitioner` (incognito) | Redirects to `/login?return=/practitioner` | [ ] |
| A10.2 | Page loads for org owner | Login as org_owner on org subdomain, visit `/practitioner` | Member list visible | [ ] |
| A10.3 | Member click shows health summary | Click a member in the list | Right panel: measurement count, recent markers | [ ] |
| A10.4 | Non-org user sees error | Login on platform domain, visit `/practitioner` | "only available in org context" message | [ ] |

### A11. Per-Org AI Model Override (#554)

| # | Test | URL / Action | Expected | Pass |
|---|------|-------------|----------|------|
| A11.1 | AI uses system default without override | Use Dr. Alex on platform domain | Uses `claude-sonnet-4-20250514` (from app_settings) | [ ] |
| A11.2 | Org with override uses custom model | Set `ai_model_override` in org branding, use Dr. Alex via org subdomain | Uses the overridden model | [ ] |

### A12. Org Owner Settings Pages

| # | Test | URL | Expected | Pass |
|---|------|-----|----------|------|
| A12.1 | Overview page | `https://testclinic.brickos.io/org` | Stat cards (members, active, measurements), quick links | [ ] |
| A12.2 | General settings | `https://testclinic.brickos.io/org/general` | Org name, app display name, billing email, subdomain (read-only) | [ ] |
| A12.3 | Save general settings | Change org name, click Save | Toast "Settings saved", value persists on refresh | [ ] |
| A12.4 | Branding page | `https://testclinic.brickos.io/org/branding` | Logo URL, color pickers, footer text | [ ] |
| A12.5 | Save branding | Set primary color, click Save | Color reflected in login page + navbar on refresh | [ ] |
| A12.6 | Members page | `https://testclinic.brickos.io/org/members` | Member list with roles, invite form | [ ] |
| A12.7 | Invite member | Enter existing user email, select role, click Invite | Member added to list | [ ] |
| A12.8 | Change member role | Select new role from dropdown | Toast "Role updated" | [ ] |
| A12.9 | Remove member | Click Remove, confirm | Member removed from list | [ ] |
| A12.10 | Domains page | `https://testclinic.brickos.io/org/domains` | Subdomain displayed, custom domains list | [ ] |
| A12.11 | Analytics page | `https://testclinic.brickos.io/org/analytics` | 5 stat cards with numbers | [ ] |
| A12.12 | Affiliate page | `https://testclinic.brickos.io/org/affiliate` | Org referral link, link to affiliate dashboard | [ ] |
| A12.13 | Billing page | `https://testclinic.brickos.io/org/billing` | Current plan, seat count | [ ] |
| A12.14 | Apps overview | `https://testclinic.brickos.io/org/apps` | SHI listed as active, Link as inactive | [ ] |
| A12.15 | SHI Email settings | `https://testclinic.brickos.io/org/apps/shi/email` | Welcome/verification/reset subject fields, footer text | [ ] |
| A12.16 | Save email settings | Fill in custom subject, click Save | Toast "Email settings saved" | [ ] |
| A12.17 | SHI AI config | `https://testclinic.brickos.io/org/apps/shi/ai` | System default shown, model override field | [ ] |
| A12.18 | Save AI config | Enter model ID, click Save | Toast "AI configuration saved" | [ ] |
| A12.19 | Sidebar navigation | Click each sidebar link | Correct page loads, active state highlighted | [ ] |
| A12.20 | Mobile nav | Resize to mobile width | Dropdown nav replaces sidebar | [ ] |

---

## Section B: Regression Tests (existing features)

### B1. Authentication

| # | Test | URL | Expected | Pass |
|---|------|-----|----------|------|
| B1.1 | Login works on demo.brickos.io | `https://demo.brickos.io/login` | Login succeeds, redirects to dashboard/platform | [ ] |
| B1.2 | Login works on demo.sovereignhealth.io | `https://demo.sovereignhealth.io/login` | Login succeeds, SHI branding | [ ] |
| B1.3 | Logout clears session | Click logout | Redirected to login, token cleared | [ ] |

### B2. Dashboard + Health Zones

| # | Test | URL | Expected | Pass |
|---|------|-----|----------|------|
| B2.1 | Dashboard loads | `https://demo.brickos.io/sovereignhealth/dashboard` | Health zones, stat cards | [ ] |
| B2.2 | Health zone detail | Click a zone | Zone detail with markers | [ ] |

### B3. Measurements

| # | Test | URL | Expected | Pass |
|---|------|-----|----------|------|
| B3.1 | Measurement history | `https://demo.brickos.io/sovereignhealth/measurements` | Table with data | [ ] |
| B3.2 | Add measurement | Click "Add Measurement" | Form loads, submit works | [ ] |

### B4. Dr. Alex AI

| # | Test | URL | Expected | Pass |
|---|------|-----|----------|------|
| B4.1 | Chat loads | `https://demo.brickos.io/sovereignhealth/doctor-chat` | Chat interface, quota shown | [ ] |
| B4.2 | Send message | Type question, submit | AI response renders | [ ] |

### B5. Platform Admin

| # | Test | URL | Expected | Pass |
|---|------|-----|----------|------|
| B5.1 | Platform dashboard | `https://demo.brickos.io/platform` | Stat cards, sidebar nav | [ ] |
| B5.2 | Users list | `https://demo.brickos.io/platform/users` | User table loads | [ ] |
| B5.3 | Organizations list | `https://demo.brickos.io/platform/orgs` | Org table loads | [ ] |
| B5.4 | Audit logs | `https://demo.brickos.io/platform/audit` | Access logs, events, DB audit tabs | [ ] |
| B5.5 | AI config | `https://demo.brickos.io/platform/ai/config` | AI profiles visible | [ ] |

### B6. Import

| # | Test | URL | Expected | Pass |
|---|------|-----|----------|------|
| B6.1 | Lab import page | `https://demo.brickos.io/sovereignhealth/import` | Upload interface loads | [ ] |

### B7. Legacy Domain Compatibility

| # | Test | URL | Expected | Pass |
|---|------|-----|----------|------|
| B7.1 | SHI on sovereignhealth.io | `https://demo.sovereignhealth.io/` | Frontend loads, no /admin path conflict | [ ] |
| B7.2 | API on legacy subdomain | `https://api-demo.sovereignhealth.io/health` | JSON health response | [ ] |

---

## Section C: Post-Deploy Infrastructure

| # | Test | Action | Expected | Pass |
|---|------|--------|----------|------|
| C1 | API version correct | `curl https://demo.brickos.io/api/v1/health` | `version: "0.42.0"` | [ ] |
| C2 | SW.js cache-control | `curl -sI https://demo.brickos.io/sw.js` | `Cache-Control: no-cache` | [ ] |
| C3 | Nginx configs synced | SSH: `nginx -t` | Syntax OK | [ ] |
| C4 | Containers recently created | SSH: `docker ps` | Backend/frontend created within last hour | [ ] |
| C5 | Compose files in sync | SSH: `grep image /opt/sovereign-health/docker-compose.staging.yml` | `sovereignbrick/shi-api:staging` | [ ] |

---

## Section D: Accessibility Spot Checks

| # | Test | Action | Expected | Pass |
|---|------|--------|----------|------|
| D1 | Skip to content | Tab on any page | "Skip to content" link appears | [ ] |
| D2 | Login form accessible | Tab through login form | All fields focusable, labels present | [ ] |
| D3 | Org settings accessible | Tab through /org/general | All inputs focusable | [ ] |

---

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Developer | | | |
| Tester | | | |

**Total tests:** 71
**Sections:** A (44 feature tests) + B (14 regression) + C (5 infra) + D (3 accessibility)

---

## Prerequisites for Full White-Label Testing

To test org-specific features (A2.3, A3.2, A6.2, A7.1, A10.2, A12.*), you need a test org:

1. Login as admin at `https://demo.brickos.io/platform/orgs`
2. Click "New Organization"
3. Set: name="Test Clinic", slug="testclinic", type="clinic"
4. Go to Branding tab, set: primary_color="#16a34a", logo_url (any PNG URL)
5. Add your user as org_owner in Members tab
6. Visit `https://testclinic.brickos.io/login` and log in
