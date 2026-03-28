<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Manual Testing Checklist — v0.30.0-rc1 (Sprints 014-017)
 Date: 2026-03-28

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# Manual Testing Checklist — v0.30.0-rc1

**Staging:** https://demo.sovereignhealth.io/
**API:** https://api-demo.sovereignhealth.io/health
**Login:** demo@sovereignhealth.io / SovereignDemo1
**Date:** 2026-03-28

**Covers:** Sprint 014 (licensing SSoT + AI credit pool), Sprint 015 (security hardening), Sprint 016 (production bugs + backfill), Sprint 017 (dependency remediation + diet protocol ranges)

---

## Layer 0: Infrastructure & Deploy

- [ ] API health endpoint returns 200 with version 0.30.0
- [ ] Deploy script pre-flight check passes (no -bN suffix issue)
- [ ] Frontend Docker build succeeds
- [ ] ntfy notification received on successful deploy
- [ ] Gatus monitoring shows all endpoints green
- [ ] Container creation timestamps are fresh (not stale)

---

## Layer 1: Auth & Session

- [ ] Login with credentials
- [ ] Verify dashboard loads (zones visible, no console errors)
- [ ] Switch language DE -> EN -> DE
- [ ] Verify session persists on page refresh
- [ ] Signup flow works (newsletter + consent toggles)
- [ ] MFA setup + verify (if enabled)
- [ ] Logout clears session

---

## Layer 2: Dashboard & Health Zones

- [ ] All 7 zones render with icons and colors
- [ ] Each zone shows marker count
- [ ] Click a zone -> markers list loads
- [ ] Marker cards show latest value + status color
- [ ] Click a marker -> marker detail page loads
- [ ] Demo profiles show correct subtitle colors (green/orange/red per profile)

---

## Layer 3: Marker Detail

- [ ] Trend chart renders with data points
- [ ] Reference range shading visible
- [ ] Protocol filter works (standard/fasting)
- [ ] Info tooltip shows translated content
- [ ] **Year shown on trend chart dates when data spans multiple years** -- NEW Sprint 016
- [ ] **Calculated markers (GKI, Dr. Boz, BMI, WHtR, HOMA-IR, TG/HDL, HCT/HB, TyG) render** -- NEW Sprint 014

---

## Layer 4: Measurements (History)

- [ ] Measurement list loads with pagination
- [ ] Filter by marker, device, protocol, diet works (MultiSelect)
- [ ] Date range filter works
- [ ] Click measurement -> detail view
- [ ] Delete measurement (soft delete)
- [ ] **Demo measurements excluded from tier limit count** -- NEW Sprint 016
- [ ] **Measurement grid is 4 columns** -- NEW Sprint 016

---

## Layer 5: New Measurement

- [ ] Add measurement with value + marker selection
- [ ] Calculated markers auto-compute when inputs present (glucose+ketones -> GKI, Dr. Boz)
- [ ] **No "Fast started" datetime picker** -- REMOVED Sprint 016
- [ ] **No duplicate markers in visible list** -- FIX Sprint 016
- [ ] Status color computed from reference ranges
- [ ] **Diet protocol (vegan, mediterranean, keto) affects reference range lookup** -- NEW Sprint 017

---

## Layer 6: Dr. Alex (AI Chat)

- [ ] New conversation starts
- [ ] Send message -> AI responds
- [ ] Conversation history loads
- [ ] Delete conversation works
- [ ] **AI credit pool shows correct remaining (not legacy "999 of 0")** -- FIX Sprint 014
- [ ] **Chat scroll works (messages don't overflow)** -- FIX Sprint 016
- [ ] **Clarity/Horizon tier users can start chats** -- FIX Sprint 016

---

## Layer 7-9: Smart Import

- [ ] Lab PDF upload -> extraction -> review -> confirm
- [ ] Medication import (photo/PDF) -> extraction -> review -> confirm
- [ ] Tabular measurement import (CSV/ODS) -> column mapping -> confirm
- [ ] **Calculated markers auto-compute after import** -- NEW Sprint 016
- [ ] Import history shows all sessions with rollback option

---

## Layer 10: Settings (7 tabs)

### Account Tab -- NEW Sprint 016
- [ ] Email, display name, language, country visible
- [ ] Date/time format settings work
- [ ] PWA install button (when installable)
- [ ] Push notification toggle

### Health Profile Tab -- RESTRUCTURED Sprint 016
- [ ] Gender, body measurements (height, weight, waist), lifestyle defaults
- [ ] **No account fields mixed in** -- FIX Sprint 016

### Devices & Labs Tab
- [ ] Device list loads

### Reference Ranges Tab
- [ ] Custom reference ranges display and save
- [ ] **Protocol-specific ranges visible (standard, keto, fasting)** -- NEW Sprint 014

### Influence Factors Tab
- [ ] Medications list, add, archive, restore

### Security Tab
- [ ] Change password works
- [ ] MFA toggle

### Privacy Tab
- [ ] Access log visible
- [ ] Data export works
- [ ] **Consent toggles work (newsletter, analytics)** -- FIX Sprint 016
- [ ] **Backend accepts both consent_newsletter and newsletter field names** -- FIX Sprint 016

---

## Layer 11: Theme & Styling

- [ ] Dark theme enforced everywhere
- [ ] No white backgrounds on selects/dropdowns/form elements
- [ ] STAGING banner visible on staging environment
- [ ] **No em-dashes anywhere in UI or database content** -- Sprint 014

---

## Layer 12: Admin Panel

- [ ] Admin dashboard loads (user count, measurement count)
- [ ] Users tab: list, search, tier change
- [ ] Content tab: markers, zones, tiers management
- [ ] Links tab: click stats, filters
- [ ] **Data access log visible** -- NEW Sprint 016
- [ ] **Backfill calculated markers button works** -- NEW Sprint 016
- [ ] **Admin role does NOT bypass license tier limits** -- FIX Sprint 014

---

## Layer 13: Licensing & Billing -- REWRITTEN Sprint 014

- [ ] `/api/license` returns user tier from tier_features SSoT
- [ ] `/api/license/tiers` returns feature matrix (36 features x 6 tiers)
- [ ] **AI credit pool: `/api/license` includes ai_credits status** -- NEW Sprint 014
- [ ] **Tier enforcement via check_tier_feature() for feature gates**
- [ ] **Tier enforcement via check_tier_limit() for count limits**
- [ ] **AI credit enforcement via check_ai_credits() / consume_ai_credits()**
- [ ] Billing page loads with subscription info
- [ ] BTC payment option (if configured)

---

## Layer 14: Locale / i18n

- [ ] All pages render correctly in EN
- [ ] All pages render correctly in DE (proper UTF-8 umlauts)
- [ ] No raw i18n keys visible
- [ ] **No em-dashes anywhere**
- [ ] **Marker names use useContent() for translated names** -- Sprint 014
- [ ] Offline page renders in both EN and DE

---

## Layer 15: Calculated Markers -- NEW Sprint 014-016

- [ ] Dashboard demo profiles show calculated markers (GKI, Dr. Boz, BMI, etc.)
- [ ] **8 calculated markers compute at runtime via production formulas** -- Sprint 016
- [ ] **Protocol-aware thresholds** (fasting changes GKI/Dr. Boz ranges)
- [ ] **Backfill endpoint creates values for historical data** -- Sprint 016
- [ ] **Backfill only at direct-input timestamps (no phantom markers)** -- FIX Sprint 016
- [ ] **UNIQUE constraint on calculated_marker_values prevents duplicates** -- Sprint 016

---

## Layer 16: Reference Ranges & Diet Protocols -- NEW Sprint 017

- [ ] Standard ranges exist for all markers
- [ ] **Keto/carnivore protocol ranges** (9 markers with adjusted bounds)
- [ ] **Vegan protocol ranges** (6 markers: B12, iron, ferritin, zinc, homocysteine, omega-3)
- [ ] **Mediterranean protocol ranges** (3 markers: HDL, triglycerides, hs-CRP)
- [ ] **Fasting protocol ranges** (glucose, ketones, insulin, uric acid)
- [ ] Fallback chain: user-specific -> protocol-specific -> standard
- [ ] **resolve_protocol_context() maps diet_protocol to correct ranges**

---

## Layer 17: GDPR Compliance

- [ ] Consent toggles saved and respected
- [ ] Access log in Settings > Privacy shows entries
- [ ] Data export request works
- [ ] **CASCADE deletes on all 14 RLS-protected tables** -- Sprint 014
- [ ] **pgAudit logging active on production** -- Sprint 015

---

## Layer 18: PWA

- [ ] Service worker registered
- [ ] Install button in Settings > Account
- [ ] Offline banner appears when disconnected
- [ ] Push notification toggle works

---

## Layer 19: Security -- NEW Sprint 015-017

- [ ] **GitHub Dependabot: 0 open vulnerability alerts**
- [ ] **Secret scanning enabled**
- [ ] **Semgrep SAST in security.yml workflow**
- [ ] **pnpm/action-setup v5 in all workflows**
- [ ] **jsonwebtoken v10 (no Type Confusion CVE)**
- [ ] **rustls-webpki 0.103.10 (CRL fix)**

---

## Layer 20: Website

- [ ] Website loads at sovereignhealth.io
- [ ] Pricing page accurate (reflects tier_features SSoT)
- [ ] Website uses Next.js 16.2.1

---

## Layer 21: Cross-Cutting Concerns

### Browser Console
- [ ] No React errors (#418 hydration or others)
- [ ] No 404/500 XHR errors on page loads
- [ ] No CORS errors
- [ ] suppressHydrationWarning on html/body

### API Contract
- [ ] GET /health returns version, service name, timestamp
- [ ] DELETE /doctor-chat/conversations/:id returns 200
- [ ] POST /import/upload-measurements works
- [ ] **POST /admin/backfill-calculated-markers works** -- NEW Sprint 016
- [ ] **GET /api/license returns ai_credits** -- NEW Sprint 014

### Performance
- [ ] Dashboard loads within 2s
- [ ] Dr. Alex landing page loads within 1s
- [ ] Measurement history with 50+ rows paginates without lag

---

## Notes

_Record any issues found during testing here:_

-
-
-
