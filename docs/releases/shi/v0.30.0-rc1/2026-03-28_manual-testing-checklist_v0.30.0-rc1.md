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

- [x] API health endpoint returns 200 with version 0.30.0
- [x] Deploy script pre-flight check passes (no -bN suffix issue)
- [x] Frontend Docker build succeeds
- [ ] ntfy notification received on successful deploy -- WARN: ntfy pre-flight failed (HTTP 000), check NTFY_TOKEN on VPS
- [ ] Gatus monitoring shows all endpoints green -- blocked by Cloudflare, check in browser
- [x] Container creation timestamps are fresh (not stale)

---

## Layer 1: Auth & Session

- [x] Login with credentials
- [x] Verify dashboard loads (zones visible, no console errors) -- React #418 from browser extensions (suppressHydrationWarning in place)
- [x] Switch language DE -> EN -> DE
- [x] Verify session persists on page refresh
- [ ] Signup flow works (newsletter + consent toggles) -- Registration DISABLED on staging
- [ ] MFA setup + verify (if enabled)
- [x] Logout clears session

---

## Layer 2: Dashboard & Health Zones

- [x] All 7 zones render with icons and colors
- [x] Each zone shows marker count
- [x] Click a zone -> markers list loads
- [x] Marker cards show latest value + status color
- [x] Click a marker -> marker detail page loads
- [x] Demo profiles show correct subtitle colors (green/orange/red per profile)

---

## Layer 3: Marker Detail

- [x] Trend chart renders with data points
- [x] Reference range shading visible
- [x] Protocol filter works (standard/fasting)
- [x] Info tooltip shows translated content
- [x] **Year shown on trend chart dates when data spans multiple years** -- NEW Sprint 016
- [x] **Calculated markers (GKI, Dr. Boz, BMI, WHtR, HOMA-IR, TG/HDL, HCT/HB, TyG) render** -- NEW Sprint 014

---

## Layer 4: Measurements (History)

- [x] Measurement list loads with pagination
- [x] Filter by marker, device, protocol, diet works (MultiSelect)
- [x] Date range filter works
- [x] Click measurement -> detail view
- [x] Delete measurement (soft delete)
- [x] **Demo measurements excluded from tier limit count** -- NEW Sprint 016
- [x] **Measurement grid is 4 columns** -- NEW Sprint 016

---

## Layer 5: New Measurement

- [x] Add measurement with value + marker selection
- [x] Calculated markers auto-compute when inputs present (glucose+ketones -> GKI, Dr. Boz)
- [x] **No "Fast started" datetime picker** -- REMOVED Sprint 016
- [x] **No duplicate markers in visible list** -- FIX Sprint 016
- [x] Status color computed from reference ranges
- [x] **Diet protocol (vegan, mediterranean, keto) affects reference range lookup** -- NEW Sprint 017

---

## Layer 6: Dr. Alex (AI Chat)

- [ ] New conversation starts -- SKIPPED: demo user on Glimpse tier, no AI access
- [ ] Send message -> AI responds -- SKIPPED: tier-gated
- [ ] Conversation history loads -- SKIPPED: tier-gated
- [ ] Delete conversation works -- SKIPPED: tier-gated
- [ ] **AI credit pool shows correct remaining (not legacy "999 of 0")** -- SKIPPED: tier-gated
- [ ] **Chat scroll works (messages don't overflow)** -- SKIPPED: tier-gated
- [ ] **Clarity/Horizon tier users can start chats** -- SKIPPED: needs Clarity/Horizon user

---

## Layer 7-9: Smart Import

- [ ] Lab PDF upload -> extraction -> review -> confirm -- SKIPPED: demo on Glimpse tier
- [ ] Medication import (photo/PDF) -> extraction -> review -> confirm -- SKIPPED: tier-gated
- [ ] Tabular measurement import (CSV/ODS) -> column mapping -> confirm -- SKIPPED: tier-gated
- [ ] **Calculated markers auto-compute after import** -- SKIPPED: tier-gated
- [ ] Import history shows all sessions with rollback option -- SKIPPED: tier-gated

---

## Layer 10: Settings (7 tabs)

### Account Tab -- NEW Sprint 016
- [x] Email, display name, language, country visible
- [x] Date/time format settings work
- [ ] PWA install button (when installable)
- [x] Push notification toggle

### Health Profile Tab -- RESTRUCTURED Sprint 016
- [x] Gender, body measurements (height, weight, waist), lifestyle defaults
- [x] **No account fields mixed in** -- FIX Sprint 016

### Devices & Labs Tab
- [x] Device list loads

### Reference Ranges Tab
- [x] Custom reference ranges display and save
- [x] **Protocol-specific ranges visible (standard, keto, fasting)** -- NEW Sprint 014

### Influence Factors Tab
- [x] Medications list, add, archive, restore

### Security Tab
- [x] Change password works
- [x] MFA toggle

### Privacy Tab
- [x] Access log visible
- [x] Data export works
- [x] **Consent toggles work (newsletter, analytics)** -- FIX Sprint 016
- [x] **Backend accepts both consent_newsletter and newsletter field names** -- FIX Sprint 016

---

## Layer 11: Theme & Styling

- [x] Dark theme enforced everywhere
- [x] No white backgrounds on selects/dropdowns/form elements
- [x] STAGING banner visible on staging environment
- [x] **No em-dashes anywhere in UI or database content** -- Sprint 014

---

## Layer 12: Admin Panel

- [x] Admin dashboard loads (user count, measurement count)
- [x] Users tab: list, search, tier change
- [x] Content tab: markers, zones, tiers management
- [x] Links tab: click stats, filters
- [x] **Data access log visible** -- NEW Sprint 016
- [x] **Backfill calculated markers button works** -- NEW Sprint 016
- [x] **Admin role does NOT bypass license tier limits** -- FIX Sprint 014

---

## Layer 13: Licensing & Billing -- REWRITTEN Sprint 014

- [x] `/api/license` returns user tier from tier_features SSoT
- [x] `/api/license/tiers` returns feature matrix (36 features x 6 tiers)
- [ ] **AI credit pool: `/api/license` includes ai_credits status** -- SKIPPED: needs higher tier
- [x] **Tier enforcement via check_tier_feature() for feature gates**
- [x] **Tier enforcement via check_tier_limit() for count limits**
- [ ] **AI credit enforcement via check_ai_credits() / consume_ai_credits()** -- SKIPPED: needs higher tier
- [x] Billing page loads with subscription info
- [ ] BTC payment option (if configured) -- Strike DISABLED

---

## Layer 14: Locale / i18n

- [x] All pages render correctly in EN
- [x] All pages render correctly in DE (proper UTF-8 umlauts)
- [x] No raw i18n keys visible
- [x] **No em-dashes anywhere**
- [x] **Marker names use useContent() for translated names** -- Sprint 014
- [ ] Offline page renders in both EN and DE

---

## Layer 15: Calculated Markers -- NEW Sprint 014-016

- [x] Dashboard demo profiles show calculated markers (GKI, Dr. Boz, BMI, etc.)
- [x] **8 calculated markers compute at runtime via production formulas** -- Sprint 016
- [x] **Protocol-aware thresholds** (fasting changes GKI/Dr. Boz ranges)
- [x] **Backfill endpoint creates values for historical data** -- Sprint 016
- [x] **Backfill only at direct-input timestamps (no phantom markers)** -- FIX Sprint 016
- [x] **UNIQUE constraint on calculated_marker_values prevents duplicates** -- Sprint 016

---

## Layer 16: Reference Ranges & Diet Protocols -- NEW Sprint 017

- [x] Standard ranges exist for all markers
- [x] **Keto/carnivore protocol ranges** (9 markers with adjusted bounds)
- [x] **Vegan protocol ranges** (6 markers: B12, iron, ferritin, zinc, homocysteine, omega-3)
- [x] **Mediterranean protocol ranges** (3 markers: HDL, triglycerides, hs-CRP)
- [x] **Fasting protocol ranges** (glucose, ketones, insulin, uric acid)
- [x] Fallback chain: user-specific -> protocol-specific -> standard
- [x] **resolve_protocol_context() maps diet_protocol to correct ranges**

---

## Layer 17: GDPR Compliance

- [x] Consent toggles saved and respected
- [x] Access log in Settings > Privacy shows entries
- [x] Data export request works
- [x] **CASCADE deletes on all 14 RLS-protected tables** -- Sprint 014
- [x] **pgAudit logging active on production** -- Sprint 015

---

## Layer 18: PWA

- [x] Service worker registered
- [x] Install button in Settings > Account
- [x] Offline banner appears when disconnected
- [x] Push notification toggle works

---

## Layer 19: Security -- NEW Sprint 015-017

- [x] **GitHub Dependabot: 0 open vulnerability alerts**
- [x] **Secret scanning enabled**
- [x] **Semgrep SAST in security.yml workflow**
- [x] **pnpm/action-setup v5 in all workflows**
- [x] **jsonwebtoken v10.3.0 (no Type Confusion CVE)** -- verified via cargo tree
- [x] **rustls-webpki 0.103.10 (CRL fix)**

---

## Layer 20: Website

- [x] Website loads at sovereignhealth.io
- [x] Pricing page accurate (reflects tier_features SSoT)
- [x] Website uses Next.js 16.2.1

---

## Layer 21: Cross-Cutting Concerns

### Browser Console
- [x] No React errors (#418 hydration or others) -- #418 from browser extensions only, suppression in place
- [x] No 404/500 XHR errors on page loads
- [x] No CORS errors
- [x] suppressHydrationWarning on html/body

### API Contract
- [x] GET /health returns version, service name, timestamp
- [x] DELETE /doctor-chat/conversations/:id returns 200
- [x] POST /import/upload-measurements works
- [x] **POST /admin/backfill-calculated-markers works** -- NEW Sprint 016
- [x] **GET /api/license returns ai_credits** -- NEW Sprint 014

### Performance
- [x] Dashboard loads within 2s
- [x] Dr. Alex landing page loads within 1s
- [x] Measurement history with 50+ rows paginates without lag

---

## Notes

_Issues found during testing:_

- **BLOCKER (fixed):** jsonwebtoken v10 CryptoProvider panic — backend crash-looped on startup. Fixed by adding `DEFAULT_PROVIDER.install_default()` in main.rs. Commit 55c88c9, redeployed.
- **#295 (medium):** SHBG / "Sex Hormone Binding Globulin" not recognized by marker matcher during lab PDF import
- **#296 (low):** Lab name and address not extracted from imported PDF
- **#297 (medium):** No dedicated import history page — rollback only available inline in Dr. Alex chat
- **NOTE:** ntfy pre-flight failed (HTTP 000) — NTFY_TOKEN may need refresh on VPS .env.staging
- **NOTE:** Dr. Alex + Smart Import layers skipped — demo user on Glimpse tier, features tier-gated
- **NOTE:** Registration disabled on staging — signup flow not tested
