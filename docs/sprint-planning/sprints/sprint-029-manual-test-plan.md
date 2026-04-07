# Sprint 029 - Manual Test Plan

**Date:** 2026-04-07
**Environment:** Staging (demo.sovereignhealth.io / api-demo.sovereignhealth.io)
**Tester:** Helmut

### Credentials

| What | Username / Email | Password |
|------|-----------------|----------|
| Nginx basic auth (staging) | `helmut` | `JM8Lv97Ax3LiRDLMgYfXdw==` |
| SHI demo user (staging) | `demo@sovereignhealth.io` | `SovereignDemo1` |
| SHI demo user (production) | `optimized@sovereignhealth.io` | `SovereignOptimal2026!` |
| VPS SSH | `root@72.61.154.115` | SSH key auth |

---

## Part 1: Sovereign Health Intelligence (SHI)

Test that SHI still works correctly after platform schema elevation (39 tables moved to brickos schema).

### 1.1 Authentication
- [x] Login with demo user (demo@sovereignhealth.io)
- [x] Dashboard loads with health zones
- [x] Logout works
- [x] Login again works (session management)

### 1.2 Health Dashboard
- [x] All 8 health zones display with correct marker counts
- [x] Traffic light indicators (green/yellow/red) show for markers with data
- [x] Click into a zone shows marker detail
- [x] Click into a marker shows trend chart + reference range -- BUG FOUND: #0330 trend chart double unit conversion (fixed in v0.38.1)

### 1.3 Measurements
- [x] View measurement history (should show existing data)
- [x] Add a new measurement (e.g., weight or glucose)
- [x] Verify the measurement appears in history
- [x] Delete the test measurement

### 1.4 Dr. Alex
- [x] Open Doctor Chat
- [x] Ask "Give me an overview of my current health status"
- [x] Verify response references actual biomarker data
- [x] Check that conversation persists in the sidebar

### 1.5 Settings
- [x] Settings page loads with all tabs (Health Profile, Devices/Labs, Reference Ranges, Influence Factors, Account, Security, Privacy)
- [x] Health profile shows protocol settings (keto, fasting)
- [x] Devices tab shows registered devices (e.g., Fora 6)

### 1.6 Data Integrity
- [x] Measurements count matches expected (~305 for default demo profile, ~1,200 across all 3 profiles)
- [x] Calculated markers (GKI, BMI, HOMA-IR) have values
- [x] Trends page shows chart data

---

## Part 2: Sovereign Link

Test the URL shortener functionality. Sovereign Link runs in platform mode inside the SHI backend.

### 2.1 Redirect
- [x] Open https://brickos.io/r/shdemo2026 (or any known code from staging)
- [x] Verify 301 redirect to correct target URL
- [x] Check redirect is fast (< 100ms)

### 2.2 QR Code
- [x] Open https://brickos.io/r/shdemo2026.qr
- [x] Verify SVG QR code renders
- [x] Scan QR with phone, verify it opens the correct URL
- NOTE: #0331 raised for QR code beautification with BrickOS logo

### 2.3 Click Analytics
- [x] After clicking a link, verify click count increments -- 2 clicks recorded in short_link_clicks
- [x] Check that no PII is stored (no raw IPs in the database) -- PASS: uses visitor_hash, no IP columns
- NOTE: #0332 user-facing API missing click counts, #0333 empty country_code/referrer

### 2.4 API (via curl)
- [x] Affiliate info returns code and referral link (GET /api/affiliate/me -> code: DEMO2026)
- [x] Conversions endpoint returns list (GET /api/affiliate/me/conversions -> total: 0)
- [x] Vanity check works (GET /api/affiliate/vanity/check -> available: true)
- [x] Vanity set correctly tier-gated ("Vanity codes require Clarity or Horizon tier")
- NOTE: Test plan had wrong endpoint `/api/v1/links` -- correct user-facing API is `/api/affiliate/*`

---

## Part 3: Sovereign Voice (NOSTR Scheduler)

Test the NOSTR content scheduler running on the VPS.

### 3.1 Service Status
- [x] Service is active (running) -- uptime 14h, 22.9MB memory, PID 308333
- [x] No error messages in recent logs

### 3.2 Schedule Check
- [x] Shows 14 scheduled notes
- [x] Day 1 (pob-day01) shows PUBLISHED (event c8d9a947d81e...)
- [x] Remaining days show correct dates (Apr 15-27, 10:00 UTC daily)
- [x] No notes accidentally marked as published prematurely (13 PENDING)

### 3.3 Verify Published Content
- [x] Open Primal.net and find TwentyOne.Life profile -- verified
- [x] Verify the "Proof of Blood" post is visible -- posted 14h ago, content correct
- [x] Verify the link to sovereignhealth.io is in the post
- [x] Verify hashtags are visible

### 3.4 Logs
- [x] No errors in logs -- "No entries" (daemon idle)
- [x] Daemon is idle (waiting for next scheduled publish Apr 15)

### 3.5 Manual Test Publish (optional)
- SKIPPED -- not needed, day01 already published and verified on Primal

---

## Part 4: BrickOS Admin (Platform)

Test the platform-level administration. These endpoints are JSON APIs.

### 4.1 Platform Database Schema
- [x] brickos schema: 48 tables
- [x] public schema: 61 tables

### 4.2 Organizations
- [x] BrickOS platform org exists (UUID 00000000-...-000000000000, slug: brickos)
- [x] Demo org exists (BrickOS Demo, slug: demo)
- [x] 18 total orgs: 1 platform + 1 demo + 16 personal

### 4.3 Reserved Codes
- [x] 42 reserved codes seeded
- [x] Includes: admin, api, app, auth, brickos, bitcoin, health, link, nostr, etc.

### 4.4 Domain Mappings Table
- [x] Table exists (empty -- no custom domains configured yet)

### 4.5 Org Branding Column
- [x] branding column exists (all `{}` default empty JSON)

### 4.6 Service Accounts
- [x] Table exists (empty -- no service accounts created yet)

### 4.7 Platform Smoke Test (automated)
- [x] **17/17 passed**

### 4.8 Platform DB Integrity (automated)
- [x] **23/23 passed**

---

## Part 5: Cross-App Integration

### 5.1 Shared Auth
- [x] Login to SHI, get JWT token
- [x] Use same JWT to query affiliate API (/api/affiliate/me) -- returns affiliate data
- [x] Both work with the same token (shared auth)

### 5.2 Short Link -> SHI
- [x] Click a Sovereign Link short URL (brickos.io/r/shDEMO2026)
- [x] Verify redirect to SHI app (301 -> https://app.sovereignhealth.io/?ref=DEMO2026)

### 5.3 Sovereign Voice -> NOSTR
- [x] NOSTR scheduler daemon is running (systemctl active)
- [x] Published posts verified on Primal.net (TwentyOne.Life profile)

---

## Sign-Off

| Area | Tester | Status | Notes |
|------|--------|--------|-------|
| SHI Core | Helmut | PASS | #0330 unit bug found and fixed (v0.38.1) |
| Sovereign Link | Helmut | PASS | #0331 QR beautification, #0332 click count API, #0333 geo data -- all P2 backlog |
| Sovereign Voice | Helmut | PASS | 14 notes scheduled, day01 published, daemon healthy |
| BrickOS Admin | Helmut | PASS | 17/17 smoke, 23/23 DB integrity |
| Cross-App | Helmut | PASS | Shared JWT verified, redirect working |

**Overall verdict:** [x] PASS - ready for production

**Date tested:** 2026-04-07
**Version:** SHI v0.38.1 (hotfix), Sovereign Link v0.3.0, BrickOS Platform v0.1.0
**Notes:**
- 1 P1 bug found and fixed (#0330 trend chart unit conversion)
- 4 P2 issues filed for future sprints (#0331-#0334)
- Test plan corrected: measurement count (~305 not ~3,436), API endpoint paths
- All automated test suites green (platform smoke 17/17, DB integrity 23/23, cross-app integration)
