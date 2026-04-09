# Sprint 039 - SHI Production Quality, White-Label Design + Fresh Data Import

**Started:** 2026-04-10
**Goal:** Verify SHI production quality after platform elevation, enhance test coverage for shared services (brickos/org/consumer layers), fresh data import with real health data, website consistency audit (117 markers), and white-label design specification.
**Previous:** Sprint 036-038 (Sovereign CRM complete build + deployment)

---

## Phase 1: Test Enhancement + Health Checks (Days 1-3)

### 1.1 Shared Service Test Coverage

Verify and enhance tests for the three layers after platform elevation:

**brickos layer (platform):**
- [ ] Auth flow: signup -> verify -> login -> /me -> refresh -> logout (cross-app JWT)
- [ ] MFA: setup -> verify TOTP -> login with MFA -> recovery code
- [ ] Password reset: request -> email -> token -> new password
- [ ] User profile: read/update via PlatformPool
- [ ] Organizations: create, list members, role assignment
- [ ] Service accounts: create, rotate keys, validate
- [ ] Billing: tier check, license assignment, stripe webhook
- [ ] Notifications: ntfy + telegram dual-dispatch

**Organization layer:**
- [ ] Org-scoped data isolation (user A cannot see user B's data)
- [ ] Org admin vs member role permissions
- [ ] Multi-org membership (user belongs to multiple orgs)
- [ ] Org app enablement (org_apps table)
- [ ] Org branding (if implemented)

**Consumer layer (SHI-specific):**
- [ ] Measurement CRUD (create, list, update, delete)
- [ ] Lab import: PDF, screenshot, CSV
- [ ] Marker matching + alias resolution (EN + DE)
- [ ] Calculated markers (GKI, BMI, WHtR, etc.)
- [ ] Zone assignments + reference ranges
- [ ] Dr. Alex chat with health context
- [ ] Trend charts + analysis
- [ ] Export: PDF report, CSV download
- [ ] Affiliate: link generation, click tracking, commissions
- [ ] Newsletter: subscribe, unsubscribe, consent

### 1.2 Existing Test Enhancement

- [ ] Review all 13 API test files -- update for two-pool (PlatformPool) changes
- [ ] Review all 13 Playwright E2E suites -- verify they still pass on staging
- [ ] Add cross-layer tests: auth (platform) -> import (consumer) -> admin (org)
- [ ] Add consistency checks: verify brickos schema tables match between staging/production
- [ ] Performance baseline: k6 load test on staging (health, login, measurements)

### 1.3 Staging Health Checks

- [ ] `curl https://api-demo.sovereignhealth.io/health` -- status OK
- [ ] `curl https://demo.sovereignhealth.io/` -- frontend loads
- [ ] Login with demo account -- verify dashboard
- [ ] Check container creation times (no stale containers)
- [ ] Verify migration count matches expected
- [ ] Check database sizes (brickos_staging, shi_staging)

---

## Phase 2: Fresh Data Import (Days 4-5)

### 2.1 Data Reset

- [ ] Reset personal account data (or create fresh account)
- [ ] Document current marker count before import
- [ ] Backup current data if needed

### 2.2 Import Real Health Data

- [ ] Import lab reports (blood work PDFs/screenshots)
- [ ] Verify: AI extraction identifies all markers correctly
- [ ] Verify: marker matching (EN + DE aliases, abbreviations)
- [ ] Verify: calculated markers auto-compute (GKI, BMI, WHtR, omega ratio, etc.)
- [ ] Verify: zone assignments (energy, cardiovascular, structural, etc.)
- [ ] Verify: reference ranges (age/gender specific)
- [ ] Verify: duplicate detection (same marker, same date)
- [ ] Verify: import history page (#186 if implemented)

### 2.3 Post-Import Verification

- [ ] Dashboard: charts render with real data
- [ ] Trends: multi-date comparison works
- [ ] Dr. Alex: queries against imported data return meaningful answers
- [ ] Export: PDF report generates with all markers
- [ ] Export: CSV download includes all data
- [ ] Mobile: responsive layout with real data density

---

## Phase 3: Bug Fixes (Days 6-8)

- [ ] Create #454 testing findings issue (like CRM #451)
- [ ] Fix issues found in Phase 1 + 2
- [ ] Redeploy to staging after each fix batch
- [ ] Rerun affected E2E tests

---

## Phase 4: Website Audit + Marker Consistency (Days 9-10)

### 4.1 Website Pages (https://sovereignhealth.io/)

- [ ] Homepage: hero, features, CTA
- [ ] Pricing page: all tiers match database tier_features
- [ ] Features page: all features listed match actual implementation
- [ ] About/Team page
- [ ] Contact form: sends email
- [ ] Newsletter signup: creates subscriber in DB
- [ ] Privacy policy + Terms: up to date
- [ ] Impressum (legal)
- [ ] Mobile responsive: all pages
- [ ] OG meta tags: correct for social sharing
- [ ] i18n: EN + DE complete (no missing keys)

### 4.2 Marker Consistency (117 markers)

- [ ] Verify all 117 markers exist in marker_translations table
- [ ] Verify EN + DE translations complete for all markers
- [ ] Verify abbreviations match across website and app
- [ ] Verify reference ranges defined for all markers
- [ ] Verify zone assignments for all markers
- [ ] Verify calculated marker formulas correct
- [ ] Update website content files (content-de.json, content-en.json) if marker count changed
- [ ] Cross-check: website claims vs actual DB content (tier limits, marker counts, feature availability)
- [ ] Pricing page: marker count matches reality (not hardcoded "117" if changed)

### 4.3 Website-App Consistency

- [ ] Tier names match (Glimpse, Core, Focus, Insight, Clarity, Horizon)
- [ ] Feature limits match (measurements/month, AI credits, markers per tier)
- [ ] Demo link from website reaches staging app
- [ ] "Get Started" flow: website -> signup -> app dashboard

---

## Phase 5: White-Label Design Document (Days 11-12)

### Design Doc: 021 -- SHI White-Label Architecture

Analyze and specify how Sovereign Health can be white-labeled for customers (clinics, coaches, enterprises).

**Scope:**
- What exists: brand detection (hostname-based), tier features, org branding table
- What's needed: full white-label customization spec
- Customer onboarding: how does a clinic get their own branded instance?

**Key questions to answer:**
1. **Deployment model:** Shared infrastructure (multi-tenant) vs dedicated instance per customer?
2. **Branding:** Logo, colors, favicon, app name, email templates -- where is each configured?
3. **Domain:** Custom domain per customer (clinic.sovereignhealth.io or health.clinicname.com)?
4. **Data isolation:** Org-scoped (current) vs separate database per customer?
5. **Pricing:** How does the white-label customer pay? Reseller model? Per-seat?
6. **Features:** Can customers disable features (e.g., no Dr. Alex, no affiliate)?
7. **Onboarding:** Self-service vs manual setup? What's the minimum work to onboard?
8. **Current state audit:** What's already implemented in SHI + BrickOS platform?
9. **Gap analysis:** What must be built before first customer?
10. **Timeline estimate:** Days/weeks to first white-label customer?

**Implementation items that might land in this sprint:**
- Org branding API (if not wired)
- Domain mapping config
- White-label flag in tier_features
- Customer-specific email templates
- Brand preview page in platform admin

---

## Issues

### Existing (from backlog)
| # | Issue | Phase |
|---|-------|-------|
| #398 | Two-pool regression test suite | 1 |
| #399 | Production database creation | 3 |
| #400 | Production deployment | 3 |
| #186 | Import history page | 2 |
| #386 | SHI content_strings in own DB | 1 |

### New (to create)
| # | Issue | Phase |
|---|-------|-------|
| #454 | SHI testing findings (bugs from manual testing) | 3 |
| #455 | Enhance shared service tests (brickos/org/consumer layers) | 1 |
| #456 | Website marker consistency audit (117 markers) | 4 |
| #457 | Design: SHI white-label architecture (doc 021) | 5 |
| #458 | Review GitHub, GitLab pages + all README docs | 4 |

---

## Definition of Done

- [ ] All existing E2E tests pass on staging
- [ ] New shared service tests added and passing
- [ ] Real health data imported and verified
- [ ] All calculated markers compute correctly
- [ ] Website content matches DB (markers, tiers, features)
- [ ] White-label design document written with gap analysis
- [ ] All testing findings documented and critical bugs fixed
- [ ] All README files reflect current architecture and features
- [ ] GitHub + GitLab pages up to date
- [ ] Staging deployed with all fixes
