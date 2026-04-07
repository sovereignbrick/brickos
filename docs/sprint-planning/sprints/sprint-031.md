# Sprint 031 - Platform Auth, Branding & Session Hardening

**Started:** 2026-04-08
**Goal:** Fix all auth/session issues on brickos.io domains, domain-aware branding, QR polish, rate limiter fix. Every change verified with Playwright E2E tests.
**Milestones:** M11 (Auth/Session Fix), M12 (Domain Branding), M13 (QR + Polish)

---

## Quality Gate

**Every code change in this sprint MUST have a Playwright E2E test.**
No merging without green E2E. Fix the rate limiter first so E2E can run.

---

## Dependency Analysis

```
Layer 0: Unblocks everything
  #0377 Staging rate limiter fix (enables E2E testing)
  #0373 Playwright E2E test infrastructure
         |
         v
Layer 1: Auth/Session (P1 -- blocks all brickos.io UX)
  #0370 Session persistence on brickos.io
  #0371 Platform analytics re-login
  #0378 Affiliate page redirect loop
  MFA session timeout (new: admin MFA expires too fast)
         |
         v
Layer 2: Branding (P1 -- visual coherence)
  #0369 Domain-aware login/register branding
  #0372 BrickOS favicon on all /platform/* pages
         |
         v
Layer 3: QR + Polish (P2)
  #0376 QR cube white background
  #0368 QR pixel-perfect cube
  #0374 Cleanup empty platform/ placeholders
  #0375 Gatus custom branding
```

---

## Sprint Plan (7 Days)

### Day 1 (Tue) - Rate Limiter + E2E Infrastructure
**Goal:** E2E tests can run on staging without being rate-limited.

| # | Issue | Pts | Blocked By |
|---|---|---|---|
| 1 | #0377 Staging rate limiter: increase to 50/15min for staging, whitelist demo accounts | 2 | - |
| 2 | #0373 Playwright E2E base: login helper, staging config, basic auth support | 3 | #1 |

**Points:** 5

**Details for #0377:**
- Add `RATE_LIMIT_MULTIPLIER` env var (default 1, staging sets to 10)
- Or whitelist demo account emails from rate limiting
- Restart staging backend after change

**Details for #0373:**
- Create `e2e/helpers/auth.ts` with `loginAsAdmin()`, `loginAsDemo()` functions
- Configure Playwright for staging basic auth
- Write passing test: login -> see dashboard -> navigate pages -> no re-login

---

### Day 2 (Wed) - Session Persistence Fix
**Goal:** Login once on brickos.io, stay logged in across all pages.

| # | Issue | Pts | Blocked By |
|---|---|---|---|
| 3 | #0370 + #0371 Session persistence on brickos.io (cookie + auth context) | 5 | #2 |
| 4 | MFA session: admin MFA should persist for session duration, not 1 minute | 2 | - |

**Points:** 7

**Details for #0370/#0371:**
- Investigate: is the cookie being set? Is it readable on other pages?
- Check cookie domain, path, sameSite, secure flags
- Check if Next.js middleware or auth context is clearing the token
- Ensure API calls from /platform/* pages use the correct API_BASE
- E2E test: login -> /platform -> /platform/analytics -> /platform/users -> no re-login
- E2E test: login -> /platform -> /affiliate -> no re-login

**Details for MFA:**
- Check MFA token expiry in backend (may be set to 60s instead of session duration)
- Admin accounts with TOTP should stay logged in for the full session (2h default)
- E2E test: login with MFA -> navigate for 5min -> still logged in

---

### Day 3 (Thu) - Affiliate Redirect Loop Fix
**Goal:** Affiliate page accessible after login on both domains.

| # | Issue | Pts | Blocked By |
|---|---|---|---|
| 5 | #0378 Affiliate page redirect loop on expired session | 3 | #3 |

**Points:** 3

**Details:**
- Investigate the `?expired=true&return=%2Faffiliate` redirect cycle
- The affiliate page auth guard may be firing before the token is persisted
- Add a small delay or use the auth context's loading state before checking
- E2E test: login -> navigate to /affiliate -> page loads -> data visible
- E2E test: visit /affiliate when not logged in -> login -> redirect to /affiliate

---

### Day 4 (Fri) - Domain-Aware Login Branding
**Goal:** brickos.io login shows BrickOS logo + title, not SHI.

| # | Issue | Pts | Blocked By |
|---|---|---|---|
| 6 | #0369 Login/register pages detect hostname, switch branding | 3 | #3 |
| 7 | #0372 BrickOS favicon + title on all /platform/* pages | 1 | - |

**Points:** 4

**Details for #0369:**
```typescript
const isBrickOS = window.location.hostname.endsWith('.brickos.io')
const brand = isBrickOS ? {
  logo: '/brickos-cube.png',
  title: 'BrickOS Platform',
  showDemo: false,
  showRegister: false,
} : {
  logo: '/apple-touch-icon.png',
  title: 'Sovereign Health Intelligence',
  showDemo: true,
  showRegister: true,
}
```
- Apply to: /login, /register, /reset-password, /verify-email
- E2E test: visit app.brickos.io/login -> see BrickOS logo + title
- E2E test: visit app.sovereignhealth.io/login -> see SHI logo + demo section

---

### Day 5 (Mon) - QR Code Polish
**Goal:** QR code matches the SHI affiliate QR style with actual BrickOS cube.

| # | Issue | Pts | Blocked By |
|---|---|---|---|
| 8 | #0376 QR cube: use light variant PNG (white background) | 1 | - |
| 9 | #0368 QR polish: match SHI affiliate QR look and feel | 2 | #8 |

**Points:** 3

**Details:**
- Replace `blockos-cube-dark-512.png` with `blockos-cube-512.png` (light bg, no black)
- Regenerate base64 in `src/assets/brickos-cube.b64`
- White circle slightly larger than cube for clean spacing
- Compare with SHI affiliate QR (qrcode.react with apple-touch-icon.png overlay)
- Visual test: screenshot comparison

---

### Day 6 (Tue) - Cleanup + Gatus
**Goal:** Clean up dead code, improve Gatus branding.

| # | Issue | Pts | Blocked By |
|---|---|---|---|
| 10 | #0374 Delete empty platform/dashboard/ and platform/website/ | 1 | - |
| 11 | #0375 Gatus: evaluate custom status page vs nginx injection | 2 | - |

**Points:** 3

---

### Day 7 (Wed) - RC Testing + Deploy
**Goal:** Full E2E suite passes, staging verification, production deploy.

| # | Issue | Pts | Blocked By |
|---|---|---|---|
| 12 | Run full Playwright E2E suite on staging | - | All |
| 13 | Run all automated test suites (smoke, DB, cross-app, domain) | - | All |
| 14 | Deploy to staging, manual verification | - | #13 |
| 15 | Deploy to production | - | #14 |
| 16 | Sprint artifacts: retro, release notes, version bump | - | #15 |

**Points:** 0 (process)

---

## Summary

| Milestone | Description | Days | Issues | Points |
|---|---|---|---|---|
| **M11** | Auth/Session Fix | 1-3 | 5 | 15 |
| **M12** | Domain Branding | 4 | 2 | 4 |
| **M13** | QR + Polish | 5-6 | 4 | 6 |
| **RC** | Testing + Deploy | 7 | 5 | 0 |
| **Total** | | **7 days** | **16 items** | **25 pts** |

## Critical Path

```
Day 1: Rate limiter + E2E infra (#0377, #0373)
  -> Day 2: Session fix (#0370, #0371) + MFA
    -> Day 3: Affiliate redirect (#0378)
      -> Day 4: Domain branding (#0369, #0372)
        -> Day 7: RC + deploy

Day 5: QR polish (#0376, #0368) [independent]
Day 6: Cleanup (#0374, #0375) [independent]
```

## E2E Test Coverage Required

Every fix MUST include Playwright tests. Target test count for Sprint 031:

| Test | What it verifies |
|------|-----------------|
| Login on demo.brickos.io -> /platform | Session set correctly |
| Navigate /platform -> /platform/services -> /platform/analytics -> /platform/users | No re-login |
| Navigate /platform -> /affiliate | No session drop |
| Login with MFA -> wait 5min -> still logged in | MFA session duration |
| Visit /affiliate not logged in -> login -> lands on /affiliate | Redirect after login |
| app.brickos.io/login shows BrickOS branding | Domain-aware brand |
| app.sovereignhealth.io/login shows SHI branding | Original brand preserved |
| QR code has white background cube | Visual regression |

## Definition of Done

- [ ] All session/auth issues fixed on brickos.io domains
- [ ] MFA admin session persists for 2h (not 1min)
- [ ] Login pages show correct branding per domain
- [ ] QR code has white-background BrickOS cube
- [ ] All Playwright E2E tests pass
- [ ] All automated test suites pass
- [ ] Staging + production deployed
- [ ] Sprint artifacts complete
