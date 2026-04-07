# Sprint 030 - Test Plan

**Date:** 2026-04-07
**Environment:** Staging (demo.brickos.io) + Production (app.brickos.io)
**Tester:** Helmut
**Staging deployed:** 2026-04-07 15:47 UTC

---

## Automated Tests (run by Claude) -- ALL PASSING

| Suite | Result | Notes |
|-------|--------|-------|
| Platform smoke (staging) | **17/17 PASS** | |
| Platform DB integrity (staging) | **23/23 PASS** | |
| Cross-app integration (staging) | **8/9 PASS** (1 skip) | Health overview skipped (not implemented) |
| BrickOS domain routing | **11/13 PASS** (2 skip) | CORS preflight + /platform pre-deploy (now deployed) |
| cargo fmt + clippy | **PASS** | All clean |
| pnpm build (SHI frontend) | **PASS** | |
| pnpm build (brickos-website) | **PASS** | |
| TypeScript check | **PASS** | |

---

## Part 1: DNS + Domain Routing (Manual -- Helmut)

### Staging URLs (basic auth: `helmut` / `JM8Lv97Ax3LiRDLMgYfXdw==`)

| # | Test | URL | Expected |
|---|------|-----|----------|
| 1.1 | API health | `https://api.brickos.io/health` | JSON with version 0.38.1 |
| 1.2 | Root redirect | `https://app.brickos.io/` | 302 -> /platform |
| 1.3 | Platform admin | `https://app.brickos.io/platform` | Login page or dashboard |
| 1.4 | SHI via BrickOS | `https://app.brickos.io/sovereignhealth/` | SHI app (login/dashboard) |
| 1.5 | Sovereign Link | `https://app.brickos.io/sovereignlink` | 302 -> /platform/links |
| 1.6 | Sovereign Voice | `https://app.brickos.io/sovereignvoice` | 302 -> /platform/apps |
| 1.7 | Staging root | `https://demo.brickos.io/` | Basic auth prompt, then -> /platform |
| 1.8 | Staging SHI | `https://demo.brickos.io/sovereignhealth/` | SHI staging after auth |
| 1.9 | Gatus | `https://status.brickos.io/` | Monitoring dashboard |
| 1.10 | Legacy app | `https://app.sovereignhealth.io/` | Still works (200) |
| 1.11 | Legacy API | `https://api.sovereignhealth.io/health` | Still works (200) |
| 1.12 | Legacy staging | `https://demo.sovereignhealth.io/` | Still works |
| 1.13 | Website | `https://brickos.io/` | Website with animation |

**Staging login after basic auth:** `demo@sovereignhealth.io` / `SovereignDemo1`

---

## Part 2: Platform Admin GUI (Manual -- Helmut)

Test on `demo.brickos.io` (basic auth first, then SHI login).

### 2.1 Layout + Navigation
- [ ] Sidebar shows sections: Overview, Manage, Commerce, Links, Content, AI, Ops, Security, Settings
- [ ] BrickOS cube logo (orange "B") in sidebar header
- [ ] App title shows "BrickOS Platform"
- [ ] Sidebar collapses to icons when toggle clicked (bottom of sidebar)
- [ ] Mobile: orange hamburger button opens sidebar overlay

### 2.2 Dashboard (`/platform`)
- [ ] Stat cards load: Total Users, Verified, Active (7d/30d), Signups (7d), Measurements, Early Access, Orgs
- [ ] Tier distribution bar chart shows tiers with percentages
- [ ] Service health matrix shows green dots for all services
- [ ] No console errors

### 2.3 Services (`/platform/services`)
- [ ] Table shows all services with prod/staging status dots
- [ ] Version column shows v0.38.1 for SHI API
- [ ] Latency column shows response times in ms
- [ ] Environment filter works (all / production / staging)
- [ ] "Last checked" timestamp visible

### 2.4 Analytics (`/platform/analytics`)
- [ ] Summary tiles: Total Clicks, Last 7 Days, Last 30 Days, Links count
- [ ] Link selector dropdown lists short links
- [ ] Period buttons: 7D / 30D / 90D / 1Y
- [ ] Area chart renders with orange gradient fill (if clicks exist)
- [ ] Top links table shows click counts
- [ ] Top referrers table shows referrer domains

### 2.5 Users (`/platform/users`)
- [ ] User list loads with email, tier, role columns
- [ ] Search by email works
- [ ] Pagination works (next/prev)

### 2.6 Other Platform Pages
- [ ] All sidebar links navigate without errors (placeholder pages show "Coming soon")

---

## Part 3: Sovereign Link Features (Manual -- Helmut)

Test on `demo.brickos.io/sovereignhealth/` after login.

### 3.1 Link Expiration
- [ ] Active link: `https://brickos.io/r/shDEMO2026` -> 301 redirect to target URL
- [ ] Expired/deactivated link: should 301 to `https://brickos.io` (not 404)

### 3.2 Vanity Code UX (navigate to Affiliate page)
- [ ] Type a vanity code in the input: green/red availability indicator appears while typing
- [ ] Indicator updates live with ~300ms debounce
- [ ] If you already have a vanity code: "Change" button is visible
- [ ] Click "Change": input field appears with current code, edit and save
- [ ] Click "Cancel": returns to display mode without saving
- [ ] As free tier user: error says "Focus tier or higher" (not "Clarity or Horizon")

### 3.3 Link Edit UI (Affiliate page, "Your Short Links" section)
- [ ] Short links list visible below stats (if you have links)
- [ ] Each link shows: code, target URL, click count
- [ ] Click pencil icon: inline edit form opens (target URL, title, active toggle, expiry date)
- [ ] Save edit: success toast, list refreshes with updated data
- [ ] Click deactivate icon: link shows "Inactive" badge

### 3.4 QR Code
- [ ] Open `https://brickos.io/r/shDEMO2026.qr` -> SVG QR code with orange brick logo in center

---

## Part 4: BrickOS Website (Manual -- Helmut)

### 4.1 Animation (CRITICAL -- was broken before)
- [ ] **Chrome**: open `https://brickos.io` -- blocks drop in, float, fade, repeat loop
- [ ] **Firefox**: same animation works
- [ ] **Brave**: same animation works (was broken -- now inline SVG instead of iframe)

### 4.2 Contact Form
- [ ] Submit contact form -> success

---

## Part 5: VPS Tasks (Manual -- Helmut, after production deploy)

### 5.1 Voice Service Account API Key
Run on VPS (`ssh root@72.61.154.115`):
```bash
# Generate API key
KEY=$(openssl rand -hex 32)
HASH=$(echo -n "$KEY" | sha256sum | cut -d' ' -f1)
echo "Save this key: $KEY"

# Update DB (production)
docker exec sovereign-health-db-1 psql -U sovereign_health -d sovereign_health -c \
  "UPDATE brickos.service_accounts SET api_key_hash = '$HASH' WHERE name = 'sovereign-voice'"

# Add to Voice .env
cat >> /opt/nostr-scheduler/.env << EOF
SOVEREIGN_LINK_API_URL=https://api.sovereignhealth.io/api/v1/service/links
SOVEREIGN_LINK_API_KEY=$KEY
EOF

# Rebuild and restart
cd /opt/nostr-scheduler && npm run build && systemctl restart nostr-scheduler
```
- [ ] Key generated and saved
- [ ] DB updated
- [ ] .env updated
- [ ] Scheduler rebuilt and running (`systemctl status nostr-scheduler`)

### 5.2 Verify Voice Status
```bash
ssh root@72.61.154.115 "cd /opt/nostr-scheduler && node dist/index.js list schedule.json"
```
- [ ] 13 notes pending
- [ ] pob-day02 next at Apr 15

---

## Part 6: Infrastructure Verification (Manual -- Helmut)

### 6.1 Org Roles Migration
```bash
ssh root@72.61.154.115 "docker exec sh-staging-db psql -U sovereign_health -d sovereign_health_staging -c \
  \"SELECT conname FROM pg_constraint WHERE conname = 'org_members_role_check'\""
```
- [ ] Constraint `org_members_role_check` exists

### 6.2 Platform Tier System
```bash
ssh root@72.61.154.115 "docker exec sh-staging-db psql -U sovereign_health -d sovereign_health_staging -c \
  \"SELECT app_key, tier_slug, display_name FROM app_tier_names ORDER BY app_key, sort_order\""
```
- [ ] SHI: Glimpse, Focus, Insight, Clarity, Horizon (5 rows)
- [ ] Sovereign Link: Basic, Growth, Scale, Agency, Self-hosted (5 rows)
- [ ] Sovereign Voice: Free, Creator, Pro, Studio, Self-hosted (5 rows)

### 6.3 Voice Service Account
```bash
ssh root@72.61.154.115 "docker exec sh-staging-db psql -U sovereign_health -d sovereign_health_staging -c \
  \"SELECT name, is_active FROM brickos.service_accounts\""
```
- [ ] `sovereign-voice` exists, `is_active = true`

---

## Sign-Off

| Area | Tester | Status | Notes |
|------|--------|--------|-------|
| DNS + Domains (13 items) | Helmut | | |
| Platform Admin GUI (6 sections) | Helmut | | |
| Sovereign Link (4 sections) | Helmut | | |
| BrickOS Website (2 items) | Helmut | | |
| VPS Tasks (after prod deploy) | Helmut | | |
| Infrastructure (3 items) | Helmut | | |

**Overall verdict:** [ ] PASS -- ready for production / [ ] FAIL -- issues found

**Date tested:**
**Notes:**
