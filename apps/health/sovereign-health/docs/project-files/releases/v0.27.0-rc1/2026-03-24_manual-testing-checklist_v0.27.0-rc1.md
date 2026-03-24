<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Manual Testing Checklist — v0.27.0-rc1 (Sprints 008-011)
 Date: 2026-03-24

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# Manual Testing Checklist — v0.27.0-rc1

**Staging:** https://demo.sovereignhealth.io/
**API:** https://api-demo.sovereignhealth.io/health
**Login:** demo@sovereignhealth.io / Demo2026!
**Date:** 2026-03-24

**Covers:** Sprint 008 (import reliability + marker coverage), Sprint 009 (GDPR + cargo-chef), Sprint 010 (Sovereign Link), Sprint 011 (PWA full stack)

---

## Layer 0: Infrastructure & Deploy

- [ ] API health endpoint returns 200 with correct version
- [ ] Deploy script pre-flight check passes
- [ ] Frontend Docker build resolves @brickos/ui workspace package
- [ ] `next build --webpack` produces sw.js in standalone output
- [ ] ntfy notification received on successful deploy

---

## Layer 1: Auth & Session

- [ ] Login with credentials
- [ ] Verify dashboard loads (zones visible, no console errors)
- [ ] Switch language DE -> EN -> DE
- [ ] Verify session persists on page refresh
- [ ] Signup flow works (newsletter checkbox)
- [ ] MFA setup + verify (if enabled)

---

## Layer 2: Dashboard & Health Zones

- [ ] All 7 zones render with icons and colors
- [ ] Each zone shows marker count
- [ ] Click a zone -> markers list loads
- [ ] Marker cards show latest value + status color
- [ ] Click a marker -> marker detail page loads

---

## Layer 3: Marker Detail

- [ ] Trend chart renders with data points
- [ ] Reference range shading visible
- [ ] Protocol filter works (standard/fasting)
- [ ] Info tooltip shows translated content

---

## Layer 4: Measurements (History)

- [ ] Measurement list loads with pagination
- [ ] Filter by marker, device, protocol, diet works (MultiSelect)
- [ ] Date range filter works
- [ ] Click measurement -> detail view
- [ ] Delete measurement (soft delete)

---

## Layer 5: Trends

- [ ] Trend page loads for selected markers
- [ ] Chart renders with data points
- [ ] Time range selector works

---

## Layer 6: Dr. Alex (AI Chat)

- [ ] New conversation starts
- [ ] Send message -> AI responds
- [ ] Conversation history loads
- [ ] Delete conversation works
- [ ] Quota tracking for non-unlimited tiers

---

## Layer 7-9: Smart Import

- [ ] Lab PDF upload -> extraction -> review -> confirm
- [ ] Medication import (photo/PDF) -> extraction -> review -> confirm
- [ ] Tabular measurement import (CSV/ODS) -> column mapping -> confirm
- [ ] Protocol overrides apply correctly
- [ ] Duplicate timestamp skipping works
- [ ] Import history shows all sessions with rollback option

---

## Layer 10: Settings

- [ ] Profile tab: name, gender, age, country, language, body measurements save
- [ ] Devices tab: device list loads
- [ ] Thresholds tab: custom reference ranges work
- [ ] Medications tab: list, add, archive, restore
- [ ] License tab: tier info displays
- [ ] Security tab: change password, MFA toggle
- [ ] Data & Privacy tab: access log, data export, consent

---

## Layer 11: Theme & Styling

- [ ] Dark theme enforced everywhere
- [ ] No white backgrounds on selects/dropdowns/form elements
- [ ] STAGING banner visible on staging environment

---

## Layer 12: Admin Panel

- [ ] Admin dashboard loads (user count, measurement count)
- [ ] Users tab: list, search, tier change
- [ ] Content tab: markers, zones, tiers management
- [ ] **Links tab: click stats, filters, campaign creation** — NEW Sprint 010

---

## Layer 13: Billing

- [ ] Billing page loads with subscription info
- [ ] Stripe portal link works
- [ ] Plan change flow works
- [ ] BTC payment option (if configured)
- [ ] **Billing actions guarded when offline** — NEW Sprint 011

---

## Layer 14: Locale / i18n

- [ ] All pages render correctly in EN
- [ ] All pages render correctly in DE (proper UTF-8 umlauts)
- [ ] No raw i18n keys visible
- [ ] No em-dashes anywhere
- [ ] **Offline page renders in both EN and DE** — NEW Sprint 011
- [ ] **Install card in Settings shows in both languages** — NEW Sprint 011
- [ ] **Push notification card in Settings shows in both languages** — NEW Sprint 011
- [ ] **Offline banner text in both languages** — NEW Sprint 011
- [ ] **Sync toast messages in both languages** — NEW Sprint 011

---

## Layer 15: Shared Components (@brickos/ui)

- [ ] MultiSelect on measurements page works
- [ ] MultiSelect search works
- [ ] MultiSelect shows count label
- [ ] No console errors related to @brickos/ui imports

---

## Layer 16: GDPR Compliance — NEW Sprint 009

- [ ] Consent UI: cookie consent banner shows for new users
- [ ] Consent UI: consent preferences saved and respected
- [ ] Access log: Settings > Data & Privacy shows access log entries
- [ ] Data export: request export -> download works
- [ ] Email unsubscribe: unsubscribe link in emails works
- [ ] Privacy page accessible at /legal/privacy

---

## Layer 17: Sovereign Link (URL Shortener) — NEW Sprint 010

- [ ] `GET /r/{code}` redirects to target URL
- [ ] `GET /r/{code}.qr` returns SVG QR code
- [ ] Auto-created short links for affiliate codes
- [ ] Affiliate page shows brickos.io/r/ short URL + QR code
- [ ] Vanity codes for Clarity/Horizon tier users
- [ ] Admin Links tab: click stats with filters
- [ ] Admin Links tab: campaign link creation
- [ ] nginx config: brickos.io/r/* routes to health API

---

## Layer 18: PWA — Installable — NEW Sprint 011

- [ ] Chrome DevTools > Application > Manifest shows correct data
- [ ] Manifest: name "Sovereign Health Intelligence", start_url "/dashboard", display "standalone"
- [ ] Icons: 192x192 and 512x512 present in manifest
- [ ] theme-color meta tag renders (#09090b)
- [ ] apple-mobile-web-app-capable meta tag present
- [ ] Service worker registered in DevTools > Application > Service Workers
- [ ] Lighthouse PWA audit score > 90
- [ ] **Desktop Chrome:** install icon appears in address bar (HTTPS only)
- [ ] **Install button in Settings > Profile** shows when installable, hides when installed

---

## Layer 19: PWA — Offline Detection — NEW Sprint 011

- [ ] Go offline (DevTools > Network > Offline): banner appears at top of page
- [ ] Banner text EN: "You're offline — showing cached data"
- [ ] Banner text DE: "Du bist offline — gespeicherte Daten werden angezeigt"
- [ ] Go online: banner disappears
- [ ] Offline: "Save" button disabled on new measurement page
- [ ] Offline: "Save" button disabled on edit measurement page
- [ ] Offline: "Send" button disabled in Dr. Alex chat
- [ ] Offline: billing action handlers guarded (no portal/change plan)

---

## Layer 20: PWA — Service Worker Caching — NEW Sprint 011

- [ ] After first visit, static assets cached (check DevTools > Application > Cache Storage)
- [ ] Navigate to /offline when truly offline (SW serves fallback page)
- [ ] Content endpoints (markers, zones, tiers) served from cache when offline
- [ ] Dashboard data served from cache (stale) when offline
- [ ] Auth/billing requests NOT cached (network-only)
- [ ] API responses include Cache-Control headers (curl -I check)
  - [ ] Content: `public, max-age=3600`
  - [ ] Dashboard: `private, max-age=60`
  - [ ] Health: `no-cache`
  - [ ] POST/mutations: `no-store`

---

## Layer 21: PWA — Offline Write + Sync — NEW Sprint 011

- [ ] Create measurement while offline -> toast "Saved offline — will sync when connected"
- [ ] IndexedDB stores queue entry (DevTools > Application > IndexedDB > sovereign-health)
- [ ] Go online -> sync engine pushes queued writes
- [ ] `GET /sync/version` returns current sync version
- [ ] `GET /sync/changes?since_version=0` returns measurement data
- [ ] Idempotent replay: same idempotency_key doesn't create duplicate
- [ ] Deleted measurements include `deleted_at` in sync response

---

## Layer 22: PWA — Push Notifications — NEW Sprint 011

- [ ] `GET /push/vapid-key` returns public key (requires VAPID_PUBLIC_KEY env var)
- [ ] Push notification toggle visible in Settings > Profile (when browser supports)
- [ ] Click "Enable notifications" -> browser permission prompt
- [ ] After granting: subscription saved to `push_subscriptions` table
- [ ] Click "Disable notifications" -> subscription removed
- [ ] Toggle hidden when browser doesn't support push
- [ ] "Notifications blocked by browser" shown when permission denied
- [ ] SW handles push event (show notification)
- [ ] Notification click navigates to correct URL

---

## Layer 23: Website

- [ ] Website loads at sovereignhealth.io
- [ ] site.webmanifest includes 192/512 icons — NEW Sprint 011
- [ ] Pricing page accurate
- [ ] Website is a separate deploy from frontend

---

## Layer 24: Cross-Cutting Concerns

### Browser Console
- [ ] No React errors (#418 hydration or others)
- [ ] No 404/500 XHR errors on page loads
- [ ] No CORS errors
- [ ] suppressHydrationWarning on html/body (browser extensions)

### API Contract
- [ ] GET /health returns version, service name, timestamp
- [ ] DELETE /doctor-chat/conversations/:id returns 200
- [ ] POST /import/upload-measurements with ODS file works
- [ ] POST /measurements accepts optional client_id + idempotency_key — NEW Sprint 011
- [ ] DELETE /measurements/{id} sets deleted_at — NEW Sprint 011

### Performance
- [ ] Dashboard loads within 2s
- [ ] Dr. Alex landing page loads within 1s
- [ ] Measurement history with 50+ rows paginates without lag
- [ ] Service worker doesn't degrade page load time

### Storage Persistence
- [ ] `navigator.storage.persist()` called on app install — NEW Sprint 011

---

## Notes

_Record any issues found during testing here:_

-
-
-
