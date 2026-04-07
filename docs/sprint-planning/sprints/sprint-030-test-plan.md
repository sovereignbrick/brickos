# Sprint 030 - Test Plan

**Date:** 2026-04-07
**Environment:** Staging (demo.brickos.io) + Production (app.brickos.io)
**Tester:** Helmut

---

## Automated Tests (run by Claude)

| Suite | Result | Notes |
|-------|--------|-------|
| Platform smoke (staging) | 17/17 PASS | |
| Platform DB integrity (staging) | 23/23 PASS | |
| Cross-app integration (staging) | 8/9 PASS (1 skip) | Health overview skipped (not implemented) |
| BrickOS domain routing | PENDING | Waiting for DNS propagation |
| cargo fmt + clippy | PASS | All clean |
| TypeScript check (frontend) | PASS | |
| TypeScript check (brickos-website) | PASS | |

---

## Part 1: DNS + Domain Routing

### Prerequisites
Add these DNS records in Cloudflare (brickos.io zone, all proxied A records to 72.61.154.115):
- `app` -> 72.61.154.115
- `demo` -> 72.61.154.115
- `api` -> 72.61.154.115
- `status` -> 72.61.154.115

### 1.1 API Domain
- [ ] `curl https://api.brickos.io/health` returns JSON with version 0.38.1
- [ ] CORS: requests from app.brickos.io are allowed

### 1.2 App Domain -- Routing
- [ ] `https://app.brickos.io/` redirects 302 to `/platform/`
- [ ] `https://app.brickos.io/platform/` loads platform admin (login page or dashboard)
- [ ] `https://app.brickos.io/sovereignhealth/` loads SHI app (login page or dashboard)
- [ ] `https://app.brickos.io/sovereignlink` redirects to `/platform/links`
- [ ] `https://app.brickos.io/sovereignvoice` redirects to `/platform/apps`

### 1.3 Staging Domain
- [ ] `https://demo.brickos.io/` requires basic auth (401 without credentials)
- [ ] After basic auth (`helmut` / `JM8Lv97Ax3LiRDLMgYfXdw==`): redirects to `/platform/`
- [ ] `https://demo.brickos.io/sovereignhealth/` loads staging SHI after basic auth
- [ ] Login with `demo@sovereignhealth.io` / `SovereignDemo1`

### 1.4 Status Page
- [ ] `https://status.brickos.io/` shows Gatus monitoring dashboard

### 1.5 Legacy Domains (still working)
- [ ] `https://app.sovereignhealth.io/` still works
- [ ] `https://api.sovereignhealth.io/health` still works
- [ ] `https://demo.sovereignhealth.io/` still works
- [ ] `https://brickos.io/` still shows website with animation

### Automated: `bash tests/brickos-domain-test.sh`

---

## Part 2: Platform Admin GUI

### Credentials
| Domain | Login | Password |
|--------|-------|----------|
| app.brickos.io/platform/ | Your admin email | Your password |
| demo.brickos.io/platform/ | Basic auth: `helmut` / `JM8Lv97Ax3LiRDLMgYfXdw==` then `demo@sovereignhealth.io` / `SovereignDemo1` |

### 2.1 Layout + Navigation
- [ ] Sidebar shows all sections: Overview, Manage, Commerce, Links, Content, AI, Ops, Security, Settings
- [ ] BrickOS cube logo in sidebar header
- [ ] App title shows "BrickOS Platform"
- [ ] Sidebar collapses to icons on toggle
- [ ] Mobile: hamburger menu works

### 2.2 Dashboard (/platform/)
- [ ] Stat cards: Total Users, Verified, Active (7d/30d), Signups, Measurements, Early Access, Orgs
- [ ] Tier distribution bar chart with percentages
- [ ] Service health matrix: green dots for all production services
- [ ] All data loads without errors

### 2.3 Services (/platform/services)
- [ ] Environment filter (all/production/staging)
- [ ] Status dots: green for healthy services
- [ ] Version column shows actual versions
- [ ] Latency column shows response times
- [ ] "Last checked" timestamp updates
- [ ] Auto-refresh after 60s

### 2.4 Analytics (/platform/analytics)
- [ ] Summary tiles: Total Clicks, 7d, 30d, Links count
- [ ] Link selector dropdown lists available links
- [ ] Period buttons: 7D, 30D, 90D, 1Y
- [ ] Area chart renders with orange gradient
- [ ] Top links table
- [ ] Top referrers table

### 2.5 Users (/platform/users)
- [ ] User list with search
- [ ] Pagination works
- [ ] Tier/role management buttons work

---

## Part 3: Sovereign Link Features

### 3.1 Link Expiration
- [ ] Expired links: visit `brickos.io/r/{expired-code}` returns 301 to brickos.io (not 404)
- [ ] Active links: visit `brickos.io/r/shDEMO2026` returns 301 to target URL

### 3.2 Vanity Code UX (affiliate page)
- [ ] Type vanity code: green/red availability indicator appears while typing (debounced)
- [ ] Save new vanity code: success toast
- [ ] Edit existing: "Change" button appears, new code can be saved
- [ ] Cancel edit: returns to display mode
- [ ] Wrong tier: error says "Focus tier or higher"

### 3.3 Link Edit UI (affiliate page)
- [ ] "Your Short Links" section visible with link list
- [ ] Click counts shown per link
- [ ] Edit (pencil) button opens inline form
- [ ] Fields: target URL, title, active toggle, expiry date
- [ ] Save: success toast, list refreshes
- [ ] Deactivate: "Inactive" badge appears

### 3.4 QR Code
- [ ] Visit `brickos.io/r/shDEMO2026.qr` returns SVG with BrickOS brick logo overlay

### 3.5 Click Analytics API
- [ ] `GET /api/v1/links/{id}/analytics?days=30` returns stats + clicks_by_day + top_referrers

---

## Part 4: Platform Infrastructure

### 4.1 Org Roles Migration
```bash
ssh root@72.61.154.115 "docker exec sh-staging-db psql -U sovereign_health -d sovereign_health_staging -c \
  \"SELECT conname FROM pg_constraint WHERE conname = 'org_members_role_check'\""
```
- [ ] Constraint exists
- [ ] Allowed values: owner, tech_admin, commercial_admin, editor, consumer

### 4.2 Platform Tier System
```bash
ssh root@72.61.154.115 "docker exec sh-staging-db psql -U sovereign_health -d sovereign_health_staging -c \
  \"SELECT app_key, tier_slug, display_name FROM app_tier_names ORDER BY app_key, sort_order\""
```
- [ ] SHI: Glimpse, Focus, Insight, Clarity, Horizon
- [ ] Sovereign Link: Basic, Growth, Scale, Agency, Self-hosted
- [ ] Sovereign Voice: Free, Creator, Pro, Studio, Self-hosted

### 4.3 Voice Service Account
```bash
ssh root@72.61.154.115 "docker exec sh-staging-db psql -U sovereign_health -d sovereign_health_staging -c \
  \"SELECT name, is_active FROM brickos.service_accounts\""
```
- [ ] sovereign-voice account exists, is_active = true

### 4.4 Design System
- [ ] `design-tokens.ts` exists in `components/admin/`
- [ ] Colors match BrickOS brand (orange accent, zinc dark theme)

---

## Part 5: BrickOS Website

### 5.1 Animation
- [ ] Chrome: logo animation plays (blocks drop, float, fade, repeat)
- [ ] Firefox: same animation works
- [ ] Brave: same animation works (was broken before -- iframe replaced with inline SVG)

### 5.2 Contact Form
- [ ] Contact form submits successfully

---

## Part 6: VPS Setup Tasks

### 6.1 Voice Service Account API Key (production)
```bash
ssh root@72.61.154.115
KEY=$(openssl rand -hex 32)
HASH=$(echo -n "$KEY" | sha256sum | cut -d' ' -f1)
echo "API Key: $KEY"

docker exec sovereign-health-db-1 psql -U sovereign_health -d sovereign_health -c \
  "UPDATE brickos.service_accounts SET api_key_hash = '$HASH' WHERE name = 'sovereign-voice'"

cat >> /opt/nostr-scheduler/.env << EOF
SOVEREIGN_LINK_API_URL=https://api.sovereignhealth.io/api/v1/service/links
SOVEREIGN_LINK_API_KEY=$KEY
EOF

cd /opt/nostr-scheduler && npm run build && systemctl restart nostr-scheduler
systemctl status nostr-scheduler
```
- [ ] Service account key updated in DB
- [ ] .env updated with API URL + key
- [ ] Scheduler rebuilt and running

### 6.2 Verify Voice Shortening
```bash
# Check that next publish will shorten URLs
ssh root@72.61.154.115 "cd /opt/nostr-scheduler && node dist/index.js list schedule.json"
```
- [ ] 13 notes pending, pob-day02 next at Apr 15

---

## Sign-Off

| Area | Tester | Status | Notes |
|------|--------|--------|-------|
| DNS + Domains | Helmut | | |
| Platform Admin GUI | Helmut | | |
| Sovereign Link | Helmut | | |
| Platform Infrastructure | Helmut | | |
| BrickOS Website | Helmut | | |
| VPS Setup | Helmut | | |

**Overall verdict:** [ ] PASS -- ready for production / [ ] FAIL -- issues found

**Date tested:**
**Notes:**
