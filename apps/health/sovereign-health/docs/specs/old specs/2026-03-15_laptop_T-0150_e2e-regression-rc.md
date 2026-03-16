# Claude Code Prompt — T-0150: Full E2E Regression + RC Gate

**Date:** 2026-03-15  
**Priority:** CRITICAL (blocks v1.0.0-rc1 tag)  
**Scope:** App (`core-frontend`) + Backend (`core-backend`) + Website (`saas/website`) + E2E (`e2e/`)

---

## Overview

Run the full Playwright E2E suite (T-0710, built earlier today) against localhost. Fix any failures. Then verify previously-implemented features still work after today's massive changes (tier rework, renames, i18n, Doctor Chat redesign, Einflussfaktoren).

**After all tests pass → tag v1.0.0-rc1.**

---

## STEP 0: Check What Already Exists

Before doing anything:

```bash
# List all test files
find ~/projects/sovereign-health/e2e -name "*.spec.ts" -o -name "*.test.ts" | sort
find ~/projects/sovereign-health/core-frontend -name "*.spec.ts" -o -name "*.test.ts" | grep -v node_modules | sort

# Check Playwright config
cat ~/projects/sovereign-health/e2e/playwright.config.ts

# Check run-all script
cat ~/projects/sovereign-health/e2e/run-all.sh

# Check backend tests
ls ~/projects/sovereign-health/core-backend/tests/ 2>/dev/null
```

Understand what's already covered. DO NOT duplicate tests.

---

## STEP 1: Start Local Environment

```bash
cd ~/projects/sovereign-health

# Build and start all services
docker compose -f docker-compose.dev.yml up -d --build \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:8080

# Wait for services to be ready
sleep 10

# Verify services
curl -s http://localhost:8080/health | head
curl -s http://localhost:3000 | head -5
```

---

## STEP 2: Run Existing Playwright Suite

```bash
cd ~/projects/sovereign-health/e2e
npx playwright test --reporter=list
```

Or if `run-all.sh` exists:
```bash
chmod +x run-all.sh
./run-all.sh
```

**Expected 8 suites:** smoke, registration, auth gate, payment, billing, i18n, cross-browser, security.

Record all failures. Fix them one by one.

---

## STEP 3: Regression Checks — Previously Implemented Features

These features were implemented on 2026-03-13/14 and may have been affected by today's changes. Verify each one either via existing Playwright tests OR by adding test cases.

### 3A. B-0070: Onboarding UX Polish (implemented 2026-03-14)

| Sub-item | What to verify | How |
|---|---|---|
| **B-0070: Language inheritance** | Website `?lang=de` → app inherits German. Cookie persists across pages. | Navigate to `localhost:3000/signup?lang=de`, verify page is in German. Complete signup flow, verify all subsequent pages stay German. |
| **B-0071: Email verification auto-poll** | After registration, verification page auto-detects when email is verified (no manual click needed) | Register new account, verify email in another tab, check original tab auto-advances within ~5 seconds. |
| **B-0072: Pre-fill email on login** | After registration (and payment), login page pre-fills the email | Register → redirect to login → check email field is pre-populated. |
| **B-0073: Logout destination** | Logout goes to /dashboard (or login if not authenticated), NOT /login when authenticated | Login → click logout → verify redirect destination. |
| **B-0074: Terms + Privacy links** | Signup page has links to Terms and Privacy pages on website | Check signup page for Terms/Privacy links, verify they point to `sovereignhealth.io/terms` and `sovereignhealth.io/privacy`. |

### 3B. Renames (from today's tier v3 implementation)

| Check | Expected |
|---|---|
| Settings tab: old "Schwellenwerte" label | Should now show "Referenzbereich" |
| Settings tab: old "Medikamente" label | Should now show "Einflussfaktoren" |
| Settings URL `?tab=thresholds` | Should still work (label says "Referenzbereich") |
| Settings URL `?tab=medications` | Should redirect to `?tab=influence-factors` OR show "Einflussfaktoren" label |
| Pricing page: "Rechenwerte" | Should now show "Errechnete Marker" |
| Pricing page: "Supplement-Checks" | Should now show "Check Einflussfaktoren" |
| No "Schwellenwert" anywhere in UI | `grep -rn "Schwellenwert" src/` returns zero user-facing hits |
| No "Kohortenvergleich" anywhere in UI | `grep -rn "Kohortenvergleich" src/` returns zero user-facing hits |

### 3C. Doctor Chat (B-0096, implemented today)

| Check | Expected |
|---|---|
| Navigate to `/doctor-chat` | Single-window "Unified Chat Canvas" (no tile overview) |
| Empty state | Dr. Alex greeting + 2-column prompt suggestions |
| Click a prompt chip | Chat starts immediately in same window (no page jump) |
| Locked prompt chip | Shows 🔒 + "ab [Tier]" tooltip, upgrade toast on click |
| Sidebar | Properly aligned under nav bar, shows chat history |
| Mobile responsive | Sidebar hidden, single column prompts, bottom input bar |
| Quota badge | Shows remaining AI chats count |

### 3D. License Tier v3 (implemented today)

| Check | Expected |
|---|---|
| Pricing page: tier overview cards | Show correct limits per tier (8/20/50/∞ biomarkers, etc.) |
| Pricing page: full comparison table | Collapsible groups, "Data & Tracking" open by default, others collapsed |
| Pricing page: no "Core" group header | First visible group is "Data & Tracking" |
| Pricing page: collapse/expand | Click group header toggles section |
| Pricing page: ⓘ tooltips | Hover shows feature description |
| Pricing page: 🔒 features | Show "ab Focus" / "ab Insight" etc. |
| Pricing page: "Bald" badges | Only on: Protokollvergleich, Benchmark, AI-Dashboard, API, Self-Hosting, Onboarding, Priority Support |
| Pricing page: NO "Bald" on | PDF-Berichte, Labor-Import, Einflussfaktoren-Import |
| Backend: `GET /api/tiers/features` | Returns correct tier × feature matrix from DB |
| DB: `license_tiers` table | 5 rows (glimpse, focus, insight, clarity, horizon) |
| DB: `feature_definitions` table | 27 rows in correct order |
| DB: `tier_feature_limits` table | 27 × 5 = 135 rows |
| Overview cards sync with comparison table | Same values in both sections |

### 3E. Biomarker i18n (B-0092/93/94, implemented today)

| Check | Expected |
|---|---|
| Pricing page: "85+ Biomarker" | Consistent count everywhere (not 96, not 112) |
| All "Biomarker" terminology | No "blood marker", "health marker", "Blutmarker" |
| Website `/markers/?lang=de` | Marker names in German |
| Website `/health-zones/?lang=de` | Zone names in German |

### 3F. Payments (B-0089/90, implemented today)

| Check | Expected |
|---|---|
| Stripe checkout flow | Focus plan purchase works (use test card 4242...) |
| Strike BTC checkout | Invoice created, QR code displayed |
| Post-payment tier update | User tier changes after successful payment |
| Billing info visible | Settings → License tab shows billing details |

### 3G. Einflussfaktoren (from tier v3, implemented today)

| Check | Expected |
|---|---|
| Settings → Einflussfaktoren tab | Tab exists, correct label |
| Add influence factor | Form shows type selector (Medikament / Nahrungsergänzungsmittel) |
| Product → Ingredients | Can add ingredients to a product |
| Edit → "Wirkstoffe bearbeiten" | Edit button label correct |
| Tier limit enforcement | Glimpse user limited to 2 products |

---

## STEP 4: Fix Failures

For each failure:
1. Identify root cause
2. Fix the code
3. Re-run the specific failing test
4. Verify it passes

Common causes after today's changes:
- Old i18n keys still referenced (renamed features)
- URL params changed (`?tab=medications` → `?tab=influence-factors`)
- Component imports changed (Doctor Chat refactor)
- DB schema changes (new tables, renamed columns)
- API response format changes (`GET /api/tiers/features` is new)

---

## STEP 5: Run Full Suite Again

After all fixes:

```bash
cd ~/projects/sovereign-health/e2e
npx playwright test --reporter=list

# Also run:
cd ~/projects/sovereign-health/core-backend
cargo test

cd ~/projects/sovereign-health/core-frontend
./check-i18n.sh

# If it exists:
./check-terminology.sh
```

**ALL must pass before proceeding.**

---

## STEP 6: Generate Audit Report

Create file: `/docs/specs/LICENSE_TIER_AUDIT_2026-03-15.md`

Contents:
1. `license_tiers` table dump
2. `feature_definitions` table dump (sorted by group + sort_order)
3. `tier_feature_limits` pivoted matrix (feature × tier)
4. Grep results: any remaining old terms (Schwellenwert, Kohortenvergleich, Rechenwert, Medikamente as tab name)
5. Test results summary: X passed, Y failed, Z fixed
6. Any remaining inconsistencies

---

## STEP 7: Build, Deploy, Tag

### Build & transfer images
```bash
# Backend
cd ~/projects/sovereign-health/core-backend
docker build -t registry.gitlab.com/sovereign-health/core-backend:latest .
docker save registry.gitlab.com/sovereign-health/core-backend:latest | ssh root@72.61.154.115 "docker load"

# Frontend (app)
cd ~/projects/sovereign-health/core-frontend
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.sovereignhealth.io -t registry.gitlab.com/sovereign-health/core-frontend:latest .
docker save registry.gitlab.com/sovereign-health/core-frontend:latest | ssh root@72.61.154.115 "docker load"

# Website
cd ~/projects/sovereign-health/saas/website
rm -rf .next out
pnpm build
rsync -avz --delete out/ root@72.61.154.115:/opt/sovereign-health/homepage/

# Deploy
ssh root@72.61.154.115 "cd /opt/sovereign-health && docker compose -f docker-compose.prod.yml up -d --force-recreate backend frontend && docker image prune -f"
```

### Purge Cloudflare cache

### Tag RC
```bash
cd ~/projects/sovereign-health
git add -A
git commit -m "v1.0.0-rc1: License tier v3, Doctor Chat redesign, Einflussfaktoren, full i18n, E2E suite"
git tag -a v1.0.0-rc1 -m "Release Candidate 1 — 2026-03-15

Changes since v0.18.0:
- License tier rework v3 (DB-driven, 27 features, 5 tiers, collapsible pricing)
- Doctor Chat redesign (Unified Chat Canvas, prompt suggestions, single window)
- Einflussfaktoren (Product → Ingredients hierarchy, replaces flat medications)
- Renames: Referenzbereich, Benchmark, Errechnete Marker, Check Einflussfaktoren
- Single AI pool model (shared quota, feature enable/disable per tier)
- Measurement caps (Glimpse 100, Focus 250, Insight 500, Clarity+ unlimited)
- Full Biomarker i18n (DE + EN, 85+ consistent count)
- Stripe live payments + Strike BTC checkout
- Mobile email verification fix
- Automated Playwright E2E suite (8 suites)
- PWA schema prep
- Usage dashboard widget
- Coming Soon tag cleanup
- Short pricing labels with tooltips (German text fix)
"
git push origin main --tags
```

---

## STEP 8: Post-Deploy Smoke Test (production)

Quick manual checks on `app.sovereignhealth.io`:

- [ ] Homepage loads, favicon visible
- [ ] "Try the App" links to app.sovereignhealth.io (not localhost)
- [ ] Pricing page: tier cards + collapsible comparison works
- [ ] Registration: `?lang=de` → German throughout
- [ ] Login: works with existing admin account
- [ ] Dashboard loads
- [ ] Doctor Chat: unified canvas, prompt chips visible
- [ ] Settings → Referenzbereich tab exists
- [ ] Settings → Einflussfaktoren tab exists
- [ ] `/markers/?lang=de` → German marker names

---

## Success Criteria

✅ All Playwright E2E tests pass  
✅ `cargo test` passes  
✅ `check-i18n.sh` passes (both projects)  
✅ Audit report generated  
✅ v1.0.0-rc1 tagged and pushed  
✅ Production deploy + smoke test pass  
✅ Cloudflare cache purged
