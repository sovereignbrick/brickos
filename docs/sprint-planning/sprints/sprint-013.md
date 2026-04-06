# Sprint 013 — Go-Live Stability & Investor Readiness

**Started:** 2026-03-24
**Completed:** 2026-03-24
**Goal:** Ensure the platform is demo-ready and production-stable for presentations to interested parties and investors. Zero visible bugs, polished UX, clear value proposition on every screen.

## Context

v0.27.0 is live with the full PWA stack, Sovereign Link, GDPR compliance, and 85+ biomarkers. The platform needs to be flawless for live demos — every user journey must work smoothly, the website pricing must be accurate, and the onboarding experience must be self-explanatory.

## Investor Demo Scenarios

These are the journeys that must work perfectly during a live presentation:

1. **"Let me show you the product"** — website → pricing → signup → dashboard
2. **"It works on your phone"** — PWA install on mobile, offline demo
3. **"Your data stays yours"** — GDPR access log, data export, encryption explanation
4. **"Smart import"** — upload a lab PDF → AI extracts markers → review → save
5. **"AI health assistant"** — Dr. Alex conversation about biomarkers
6. **"Affiliate system"** — share link, QR code, vanity URL, click tracking
7. **"Multi-platform"** — same app on desktop PWA, mobile browser, installed on phone
8. **"Developer story"** — open source, AGPL, design docs, clean architecture

## Planned

### P0 — Demo Blockers (must fix before any presentation)

| # | Title | Points | Area |
|---|-------|--------|------|
| #230 | fix: website license tiers reflect current state | 3 | Website |
| — | fix: version reset VERSION to clean 0.27.0 (remove -b1 suffix in lib.rs) | 1 | API |
| — | fix: hydration error #418 on dashboard/login (visible in console) | 2 | Frontend |
| — | polish: demo account seed data — ensure all zones have data, good variety | 2 | Ops/DB |
| — | polish: OG social preview — verify LinkedIn, Twitter, WhatsApp render correctly | 1 | Frontend + Website |
| — | polish: website hero section — clear value proposition, call to action | 2 | Website |
| | **P0 Subtotal** | **11** | |

### P1 — UX Polish (makes demo look professional)

| # | Title | Points | Area |
|---|-------|--------|------|
| — | polish: loading states — skeleton loaders instead of "Loading..." text | 3 | Frontend |
| — | polish: empty states — helpful messages when no data (new user experience) | 2 | Frontend |
| — | polish: error states — all API errors show friendly messages (not raw JSON) | 1 | Frontend |
| — | polish: mobile responsive — verify all pages render well on phone screen | 3 | Frontend |
| — | polish: Settings page — install card + push card visible and working | 1 | Frontend |
| — | fix: Cloudflare cache purge — automate in deploy.sh (needs CF_API_TOKEN) | 2 | Ops |
| | **P1 Subtotal** | **12** | |

### P2 — Security Hardening (investor due diligence)

| # | Title | Points | Area |
|---|-------|--------|------|
| — | security: cargo audit — fix rustls-webpki vulnerability | 2 | API |
| — | security: rate limiting audit — ensure all auth endpoints are protected | 1 | API |
| — | security: CSP headers — Content-Security-Policy on frontend | 2 | Frontend |
| — | security: dependency audit — review all 3rd party deps | 1 | API + Frontend |
| — | docs: security practices document — encryption, auth, GDPR, audit log | 2 | Docs |
| | **P2 Subtotal** | **8** | |

### P3 — Documentation (investor deck support)

| # | Title | Points | Area |
|---|-------|--------|------|
| #231 | docs: root README reflects current architecture (done in sprint 012) | 0 | Docs |
| #223 | docs: README infrastructure section + SPP reference | 2 | Docs |
| — | docs: API documentation — key endpoints, auth flow, data model | 3 | Docs |
| — | docs: architecture diagram — visual one-pager for investors | 2 | Docs |
| — | docs: product comparison — vs Apple Health, vs Cronometer, vs Gyroscope | 2 | Docs |
| | **P3 Subtotal** | **9** | |

### P4 — Automated Testing & Quality Gates

| # | Title | Points | Area |
|---|-------|--------|------|
| #72 | feat: Playwright E2E test suite — core user journeys | 5 | Testing |
| #232 | ops: Lighthouse audit + fix issues (target > 90 all categories) | 3 | Testing |
| | **P4 Subtotal** | **8** | |

## Demo Account Preparation

The production demo must showcase the product's full capability:

```
Demo account: demo@sovereignhealth.io (Clarity tier)

Required state:
✓ Profile complete (age, gender, height, weight, country)
✓ At least 2 devices registered (e.g., "Home Lab", "Doctor Visit")
✓ 20+ measurements across 3+ dates (showing trends)
✓ All 7 health zones have data (Energy, Cognitive, Cardiovascular, etc.)
✓ At least 1 Dr. Alex conversation
✓ Custom reference ranges set for 2-3 markers
✓ Affiliate link active with some clicks
✓ Vanity short link set (e.g., brickos.io/r/sovereignhealth)
✓ Push notification toggle visible in settings
✓ PWA installable (manifest + SW working)
```

## Pre-Demo Checklist

Run before every investor presentation:

```bash
# 1. Production health
curl -sf https://api.sovereignhealth.io/health | jq .

# 2. Run staging smoke tests
bash ops/staging-smoke-test.sh

# 3. Verify demo login
curl -s -X POST https://api.sovereignhealth.io/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@sovereignhealth.io","password":"..."}' | jq .data.token

# 4. Check website
open https://sovereignhealth.io/
# → pricing page accurate?
# → OG preview correct? (paste URL in LinkedIn/Twitter)

# 5. Check PWA install
open https://app.sovereignhealth.io/
# → Chrome install icon visible?
# → Offline fallback works?

# 6. Check short links
open https://brickos.io/r/sovereignhealth
# → Redirects correctly?

# 7. Purge Cloudflare cache if needed
# Cloudflare → sovereignhealth.io → Caching → Purge Everything
```

## Execution Order

```
1. Website tier audit (#230)                           ~1 hr
2. Version cleanup + hydration fix                     ~30 min
3. Demo account seed data                              ~1 hr
4. OG preview verification                             ~30 min
5. Loading/empty/error state polish                    ~2 hrs
6. Mobile responsive audit                             ~1 hr
7. Security hardening                                  ~2 hrs
8. Documentation                                       ~2 hrs
9. Full RC test + smoke test                           ~30 min
10. Deploy + verify                                    ~30 min
```

## Velocity Budget

| Budget | Points |
|--------|--------|
| P0 (demo blockers) | 11 pts |
| P1 (UX polish) | 12 pts |
| P2 (security) | 8 pts |
| P3 (documentation) | 9 pts |
| P4 (automated testing) | 8 pts |
| **Total** | **48 pts** |

## Success Criteria

After this sprint, you should be able to:

1. Open sovereignhealth.io on your phone during a meeting
2. Walk through signup → dashboard → import → AI chat → trends
3. Show PWA install ("look, it's an app now")
4. Show offline mode ("even works without internet")
5. Show the GitHub repo with clean README + design docs
6. Answer "is it secure?" with a documented security practices page
7. Answer "does it scale?" with design doc 027 (multi-region)
8. Share brickos.io/r/sovereignhealth and see it redirect
