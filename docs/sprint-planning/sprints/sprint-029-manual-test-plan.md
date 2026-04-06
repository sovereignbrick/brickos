# Sprint 029 - Manual Test Plan

**Date:** 2026-04-07
**Environment:** Staging (demo.sovereignhealth.io / api-demo.sovereignhealth.io)
**Tester:** Helmut
**Credentials:** demo@sovereignhealth.io / SovereignDemo1

---

## Part 1: Sovereign Health Intelligence (SHI)

Test that SHI still works correctly after platform schema elevation (39 tables moved to brickos schema).

### 1.1 Authentication
- [ ] Login with demo user (demo@sovereignhealth.io)
- [ ] Dashboard loads with health zones
- [ ] Logout works
- [ ] Login again works (session management)

### 1.2 Health Dashboard
- [ ] All 8 health zones display with correct marker counts
- [ ] Traffic light indicators (green/yellow/red) show for markers with data
- [ ] Click into a zone shows marker detail
- [ ] Click into a marker shows trend chart + reference range

### 1.3 Measurements
- [ ] View measurement history (should show existing data)
- [ ] Add a new measurement (e.g., weight or glucose)
- [ ] Verify the measurement appears in history
- [ ] Delete the test measurement

### 1.4 Dr. Alex
- [ ] Open Doctor Chat
- [ ] Ask "Give me an overview of my current health status"
- [ ] Verify response references actual biomarker data
- [ ] Check that conversation persists in the sidebar

### 1.5 Settings
- [ ] Settings page loads with all tabs (Health Profile, Devices/Labs, Reference Ranges, Influence Factors, Account, Security, Privacy)
- [ ] Health profile shows protocol settings (keto, fasting)
- [ ] Devices tab shows registered devices (e.g., Fora 6)

### 1.6 Data Integrity
- [ ] Measurements count matches expected (~3,436 for demo user)
- [ ] Calculated markers (GKI, BMI, HOMA-IR) have values
- [ ] Trends page shows chart data

---

## Part 2: Sovereign Link

Test the URL shortener functionality. Sovereign Link runs in platform mode inside the SHI backend.

### 2.1 Redirect
- [ ] Open https://brickos.io/r/shdemo2026 (or any known code from staging)
- [ ] Verify 301 redirect to correct target URL
- [ ] Check redirect is fast (< 100ms)

### 2.2 QR Code
- [ ] Open https://brickos.io/r/shdemo2026.qr
- [ ] Verify SVG QR code renders
- [ ] Scan QR with phone, verify it opens the correct URL

### 2.3 Click Analytics
- [ ] After clicking a link, verify click count increments
- [ ] Check that no PII is stored (no raw IPs in the database)

### 2.4 API (via curl or Postman)
```bash
# Login and get token
TOKEN=$(curl -s -X POST https://api-demo.sovereignhealth.io/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@sovereignhealth.io","password":"SovereignDemo1"}' | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['data']['token'])")

# List links
curl -s -H "Authorization: Bearer $TOKEN" \
  https://api-demo.sovereignhealth.io/api/v1/links

# Create a test link
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"target_url":"https://brickos.io","code":"test-manual"}' \
  https://api-demo.sovereignhealth.io/api/v1/links
```
- [ ] List links returns your links
- [ ] Create link succeeds with vanity code
- [ ] Delete/deactivate the test link after

---

## Part 3: Sovereign Voice (NOSTR Scheduler)

Test the NOSTR content scheduler running on the VPS.

### 3.1 Service Status
```bash
ssh root@72.61.154.115 "systemctl status nostr-scheduler"
```
- [ ] Service is active (running)
- [ ] No error messages in recent logs

### 3.2 Schedule Check
```bash
ssh root@72.61.154.115 "cd /opt/nostr-scheduler && node dist/index.js list schedule.json"
```
- [ ] Shows 14 scheduled notes
- [ ] Day 1 (pob-day01) shows PUBLISHED
- [ ] Remaining days show correct dates (Apr 15-27)
- [ ] No notes accidentally marked as published prematurely

### 3.3 Verify Published Content
- [ ] Open Primal.net and find TwentyOne.Life profile
- [ ] Verify the "Proof of Blood" post is visible with the Health Zones screenshot
- [ ] Verify the link to sovereignhealth.io is in the post
- [ ] Verify hashtags are visible (#twentyonelife #brickos #proofofblood etc.)

### 3.4 Logs
```bash
ssh root@72.61.154.115 "journalctl -u nostr-scheduler --since '1 hour ago' --no-pager"
```
- [ ] No errors in logs
- [ ] Daemon is idle (waiting for next scheduled publish)

### 3.5 Manual Test Publish (optional)
Only if you want to verify end-to-end publishing still works:
```bash
ssh root@72.61.154.115 'cd /opt/nostr-scheduler && \
  NOSTR_NSEC="$(systemd-creds decrypt /etc/credstore.encrypted/nostr-nsec -)" \
  NOSTR_RELAYS="wss://relay.damus.io,wss://nos.lol,wss://relay.primal.net" \
  LOG_FILE=/opt/nostr-scheduler/publish.log \
  node dist/index.js publish notes/day01_proof_of_blood.txt --kind 1 2>&1'
```
- [ ] Event published to 3/3 relays
- [ ] Post visible on Primal within 30 seconds
- [ ] Delete the test post from Primal after verification

---

## Part 4: BrickOS Admin (Platform)

Test the platform-level administration. These endpoints are JSON APIs.

### 4.1 Platform Database Schema
```bash
ssh root@72.61.154.115 "docker exec sh-staging-db psql -U sovereign_health sovereign_health_staging -c \"
SELECT schemaname, count(*) FROM pg_tables WHERE schemaname IN ('public','brickos') GROUP BY schemaname;
\""
```
- [ ] brickos schema: 48 tables
- [ ] public schema: 61 tables

### 4.2 Organizations
```bash
ssh root@72.61.154.115 "docker exec sh-staging-db psql -U sovereign_health sovereign_health_staging -c \"
SET search_path = public, brickos;
SELECT id, name, slug, org_type FROM organizations ORDER BY created_at;
\""
```
- [ ] BrickOS platform org exists (UUID 00..00)
- [ ] Demo org exists
- [ ] Personal orgs exist for all users (16 users = 16 personal orgs + BrickOS + demo)

### 4.3 Reserved Codes
```bash
ssh root@72.61.154.115 "docker exec sh-staging-db psql -U sovereign_health sovereign_health_staging -c \"
SELECT code FROM brickos.reserved_codes ORDER BY code LIMIT 20;
\""
```
- [ ] Product names reserved (shi, voice, link, health, bitcoin, etc.)
- [ ] System routes reserved (api, admin, login, etc.)
- [ ] At least 42 codes

### 4.4 Domain Mappings Table
```bash
ssh root@72.61.154.115 "docker exec sh-staging-db psql -U sovereign_health sovereign_health_staging -c \"
SELECT * FROM brickos.domain_mappings;
\""
```
- [ ] Table exists (likely empty, no custom domains configured yet)

### 4.5 Org Branding Column
```bash
ssh root@72.61.154.115 "docker exec sh-staging-db psql -U sovereign_health sovereign_health_staging -c \"
SELECT id, name, branding FROM brickos.organizations LIMIT 5;
\""
```
- [ ] branding column exists (default: empty JSON {})

### 4.6 Service Accounts
```bash
ssh root@72.61.154.115 "docker exec sh-staging-db psql -U sovereign_health sovereign_health_staging -c \"
SELECT * FROM brickos.service_accounts;
\""
```
- [ ] Table exists (likely empty, no service accounts created yet)

### 4.7 Platform Smoke Test (automated)
```bash
bash tests/platform-smoke.sh staging
```
- [ ] 17/17 passed

### 4.8 Platform DB Integrity (automated)
```bash
bash tests/platform-db-test.sh staging
```
- [ ] 23/23 passed

---

## Part 5: Cross-App Integration

### 5.1 Shared Auth
- [ ] Login to SHI, get JWT token
- [ ] Use same JWT to query Sovereign Link API (/api/v1/links)
- [ ] Both work with the same token (shared auth)

### 5.2 Short Link -> SHI
- [ ] Click a Sovereign Link short URL (brickos.io/r/...)
- [ ] Verify redirect to SHI app (app.sovereignhealth.io)

### 5.3 Sovereign Voice -> NOSTR
- [ ] Check that the NOSTR scheduler daemon is running
- [ ] Verify published posts are on the correct relays

---

## Sign-Off

| Area | Tester | Status | Notes |
|------|--------|--------|-------|
| SHI Core | Helmut | | |
| Sovereign Link | Helmut | | |
| Sovereign Voice | Helmut | | |
| BrickOS Admin | Helmut | | |
| Cross-App | Helmut | | |

**Overall verdict:** [ ] PASS - ready for production / [ ] FAIL - issues found

**Date tested:**
**Notes:**
