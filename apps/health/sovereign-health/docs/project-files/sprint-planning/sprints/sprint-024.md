# Sprint 024 -- Pre-Launch Hardening

**Started:** 2026-04-06
**Duration:** 2 days (2026-04-06 to 2026-04-07)
**Status:** PLANNED
**Goal:** Separate demo data, security fixes, dependency updates, E2E coverage, learn page, and performance. Everything needed for a confident public launch.

## Sprint Backlog

### P0: Must Fix Before Launch

| # | Title | Area | Pts |
|---|-------|------|-----|
| #306 | Separate demo/staging/production data | Ops/Backend | 5 |
| #280 | Fix Dependabot vulnerabilities | Security | 2 |
| -- | lucide-react 0.577 -> 1.7 major bump | Frontend | 3 |

**#306 sub-tasks -- Demo Data Architecture:**

The current demo data is DB-seeded (migration `20260308000012_seed_demo_data.sql`) for a single demo user (`demo@sovereignhealth.io`, UUID `00000000-0000-0000-0000-000000000001`). This mixes testing and public preview in one account.

**New architecture -- 3 separate layers:**

1. **Production demo profiles** (real accounts, API-imported data):
   - Create 3 accounts in production via normal signup:
     - `optimized@sovereignhealth.io` -- optimal health profile
     - `average@sovereignhealth.io` -- typical adult profile
     - `atrisk@sovereignhealth.io` -- elevated risk markers
   - Import measurement data via Smart Import API (CSV files with realistic 6-month history)
   - Import lab results via lab import (PDF/image fixtures)
   - These are real accounts going through the real pipeline -- catches bugs that seeds miss
   - The public website "View Demo" mode reads from these accounts (read-only)
   - Protected: `POST /settings/reset-data` refuses if user email ends with `@sovereignhealth.io`

2. **Staging QA copy** (`demo.sovereignhealth.io`):
   - Nightly or on-demand: `pg_dump` the 3 demo profiles from production
   - Restore into staging DB
   - This gives staging realistic data for QA without affecting production
   - Deploy script: `deploy.sh staging-refresh-demo` command

3. **Staging test user** (for destructive testing):
   - `staging-test@sovereignhealth.io` -- separate account on staging only
   - Used for: Reset All Data, account deletion, import rollback testing
   - Can be destroyed and recreated freely
   - Not linked to production or website

**Sub-tasks:**
- [ ] Create 3 demo email accounts (optimized, average, atrisk)
- [ ] Prepare CSV fixture files with 6 months of realistic data per profile
- [ ] Script to import data via API (not DB seed): `ops/seed-demo-profiles.sh`
- [ ] Guard reset-data endpoint: refuse @sovereignhealth.io accounts
- [ ] Update website "View Demo" to use new accounts
- [ ] Add `deploy.sh staging-refresh-demo` command
- [ ] Create staging-test user for QA
- [ ] Remove old demo seed migration dependency (keep migration, stop relying on it)

**#280 sub-tasks:**
- [ ] Run `cargo audit` and fix reported vulnerabilities
- [ ] Run `pnpm audit` and fix npm vulnerabilities
- [ ] Update any packages with known CVEs

**lucide-react major bump sub-tasks:**
- [ ] Update lucide-react 0.577.0 -> 1.7.0
- [ ] Fix any breaking icon name changes (check migration guide)
- [ ] Verify all icon imports still resolve
- [ ] Visual spot-check: navbar, settings, markers, admin

### P1: High Value for Launch

| # | Title | Area | Pts |
|---|-------|------|-----|
| #072 | E2E Playwright suites 3-6 | Testing | 5 |
| #288 | ZAP security scan findings | Security | 3 |
| -- | Performance: LCP/TBT optimization | Frontend | 5 |
| #166 | Terms & Fair Use page | Legal/Content | 2 |

**#072 E2E suites 3-6 (per design doc 036):**
- [ ] Suite 3: Devices & Labs (add from catalog, custom device, add lab, archive)
- [ ] Suite 4: Measurements & Data Entry (manual entry, calculated markers auto-compute, templates)
- [ ] Suite 5: Smart Import (upload fixtures, confirm, rollback)
- [ ] Suite 6: Dr. Alex (conversation, rating, credits)

**#288 ZAP scan sub-tasks:**
- [ ] Run ZAP DAST scan against staging
- [ ] Fix critical/high findings
- [ ] Document accepted risks for medium/low findings

**Performance sub-tasks:**
- [ ] Analyze LCP (4.7s) -- identify the largest contentful paint element
- [ ] Dynamic imports for heavy components (recharts, doctor-chat)
- [ ] Image optimization (next/image for all images, WebP format)
- [ ] Bundle analysis: identify largest chunks, split where possible
- [ ] Target: LCP < 2.5s, TBT < 200ms, Performance score > 85

**#166 Terms & Fair Use:**
- [ ] Review and update terms of service page content
- [ ] Add fair use policy section
- [ ] Verify links from signup page and footer
- [ ] i18n: EN + DE

### P2: Nice to Have

| # | Title | Area | Pts |
|---|-------|------|-----|
| #307 | Deploy speed optimization | Ops | 2 |
| #099 | WCAG accessibility fixes | Frontend | 3 |
| #022 | Learn page with screenshots + video plan | Content | 3 |

**#307 sub-tasks:**
- [ ] Build on VPS option (push code, build remotely, skip image transfer)
- [ ] Component-only deploy flags already work (done in Sprint 023)

**#099 WCAG sub-tasks:**
- [ ] Fix touch target sizes (< 48px buttons)
- [ ] Fix remaining contrast issues
- [ ] Add missing aria labels on interactive elements
- [ ] Target: Accessibility score > 95

**#022 Learn Page sub-tasks:**

The learn page is a comprehensive feature showcase + video walkthrough page at `/learn`.

Screenshots (captured as logged-in user, all features):
- [ ] Dashboard overview (zones, status summary)
- [ ] Marker detail page (glucose: trend, reference range, content tiles, foods)
- [ ] Add measurement form (with lifestyle fields)
- [ ] Smart Import flow (upload -> extraction -> confirm)
- [ ] Dr. Alex conversation (multi-turn with health context)
- [ ] Settings (profile, units, thresholds, privacy)
- [ ] Admin panel (users, AI usage, affiliates)
- [ ] Search overlay + results page
- [ ] Trends page (multi-marker comparison)
- [ ] Zone detail page (markers in zone, status)

Each screenshot has:
- EN + DE subtitle explaining the feature
- Dark theme (as-is)
- No user PII visible (use demo profiles)

Videos (user journey walkthroughs):
- [ ] Video 1: Registration -> onboarding -> first measurement (2-3 min)
- [ ] Video 2: Smart Import -> lab results -> Dr. Alex analysis (3-4 min)
- [ ] Video 3: Trends -> health zones -> protocol comparison (2-3 min)
- [ ] Plan recording setup: screen capture tool, AI voiceover (EN + DE)
- [ ] Host on website or embed from privacy-friendly platform

## Dependency Graph

```
P0 (do first):
  #306 Demo data separation (unblocks staging QA)
  #280 Security audit (parallel)
  lucide-react bump (parallel)
       |
P1 (after P0):
  #072 E2E suites 3-6 (needs staging test user from #306)
  #288 ZAP scan (needs staging running)
  Performance (independent)
  #166 Terms (independent)
       |
P2 (if time):
  #307 Deploy speed
  #099 WCAG
  #022 Learn page
```

## Execution Order

```
PHASE 0 -- Housekeeping
========================
  cargo fmt
  #280 Dependabot fixes
  lucide-react major bump

PHASE 1 -- Demo Data Separation (#306)
=======================================
  Create demo accounts + CSV fixtures
  Import script (ops/seed-demo-profiles.sh)
  Guard reset-data for @sovereignhealth.io
  staging-refresh-demo command
  Staging test user setup

PHASE 2 -- Security + Legal
============================
  #288 ZAP scan + fixes
  #166 Terms & Fair Use

PHASE 3 -- Testing + Performance
==================================
  #072 E2E suites 3-6
  Performance: LCP/TBT optimization

PHASE 4 -- Polish
=================
  #099 WCAG fixes
  #022 Learn page screenshots
  #307 Deploy optimization

PHASE 5 -- RC + Deploy
========================
  cargo fmt + clippy + tests
  pnpm build
  Localhost container test
  Staging deploy + manual test
  Production deploy
```

## Total Points: 33

## Risk Assessment

- **#306 (demo data):** Most complex item. The API import approach is better than DB seeds but requires fixture preparation. Risk: import pipeline may need tweaks for batch CSV import without a UI.
- **lucide-react 1.7:** Major version jump. Some icons were renamed/removed between 0.x and 1.x. Need to check the changelog carefully.
- **Performance:** LCP improvement depends on what's causing the delay (server response? image? JS blocking?). May need CDN setup which is infrastructure work beyond this sprint.
- **#022 (learn page):** Screenshot capture is manual work. Video recording + AI voiceover is a separate effort -- plan the approach this sprint, record in a future sprint.
