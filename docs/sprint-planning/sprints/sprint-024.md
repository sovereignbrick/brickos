# Sprint 024 -- Pre-Launch Hardening

**Started:** 2026-04-05
**Completed:** 2026-04-06
**Duration:** 2 days
**Status:** RELEASED (v0.35.0)
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

## Dependency Analysis

```
INDEPENDENT (can run in parallel, no dependencies):
═══════════════════════════════════════════════════

  #280 Audit fixes ────── 6 Rust unmaintained warnings (genpdf chain), 0 npm vulns
  lucide-react bump ───── 9 import statements, 8 files, all common icon names
  #288 ZAP headers ────── CSP, HSTS, X-Content-Type-Options (nginx config only)
  #166 Terms page ─────── Content/legal, no code deps
  Performance LCP/TBT ─── Frontend bundle analysis, no backend deps
  #307 Deploy speed ───── Ops-only
  #099 WCAG fixes ─────── Frontend CSS/HTML only

SEQUENTIAL (has dependencies):
══════════════════════════════

  #306 Demo data ──────── CRITICAL PATH. Blocks:
         │
         ├──> #072 E2E suites 3-6 (needs staging-test user)
         └──> #022 Learn page (needs demo profiles for screenshots)

RISK DEPENDENCIES (not blocking but related):
═════════════════════════════════════════════

  lucide-react ──may affect──> #022 Learn page (icon rendering)
  Performance ───may affect──> #022 Learn page (slow pages = bad screenshots)
  #288 ZAP CSP ──may affect──> E2E tests (CSP could block inline scripts)
```

## Execution Order

```
DAY 1 MORNING -- Parallel tracks
══════════════════════════════════

  Track A (quick wins):      Track B (frontend):      Track C (critical path):
  ──────────────────────     ─────────────────────    ────────────────────────
  cargo fmt                  lucide-react 1.7 bump   #306 Demo data:
  #280 Audit fixes (30m)     (1-2 hrs)                 - Guard reset-data
  #288 ZAP headers (1 hr)   #166 Terms page            - Create 3 accounts
                             (1-2 hrs)                  - Import CSV fixtures
                                                        - staging-refresh cmd
                                                        - staging-test user
                                                       (half day)

DAY 1 AFTERNOON
════════════════

  Performance: LCP/TBT (bundle analysis, dynamic imports)
  #072 E2E suites 3-4 (devices, measurements -- needs #306 done)

DAY 2 MORNING
══════════════

  #072 E2E suites 5-6 (import, Dr. Alex)
  #099 WCAG fixes
  #307 Deploy optimization

DAY 2 AFTERNOON
════════════════

  #022 Learn page (screenshots from demo profiles -- needs #306 done)
  RC testing + staging deploy
  Production deploy
```

## Total Points: 33

## Risk Assessment

- **#306 (demo data):** Critical path -- blocks E2E and learn page. CSV fixtures already exported (ops/demo-data/). Risk: import pipeline may need tweaks for batch CSV import without a UI.
- **lucide-react 1.7:** Major version jump but only 16 icons used across 9 import statements. All are common icons (Search, Copy, Check, Download, etc.) -- unlikely to break. Check changelog for renames.
- **#280 Audit:** Rust advisories are all "unmaintained" warnings in genpdf dependency chain (PDF report generation) -- not actual vulnerabilities. npm has zero vulns. Low effort, low risk.
- **#288 ZAP:** All findings are missing HTTP headers (CSP, HSTS, X-Content-Type-Options). Nginx config changes only -- no application code. Risk: CSP policy may block legitimate inline styles from Tailwind.
- **Performance:** LCP 4.7s is likely server response time + JS bundle blocking. Dynamic imports for recharts and doctor-chat can help TBT. LCP may need CDN/caching which is infrastructure beyond this sprint.
- **#022 (learn page):** Screenshot capture from demo profiles. Video recording + AI voiceover planned but not executed this sprint -- record in future sprint.
