# Design 027: Multi-Region Infrastructure, Data Residency & Disaster Recovery

**Date:** 2026-03-24
**Status:** Draft
**Issue:** #228
**Depends on:** Design 021 (Multi-Tenant), Design 022 (Deployment Architecture)

---

## Problem

BrickOS runs on a single VPS in Europe. As the platform grows internationally (first US customer), we need:

1. **Low latency** — US users hitting a European server adds 100-200ms per API call
2. **Data residency** — GDPR requires EU user data to stay in EU; US customers may require US-based storage
3. **Resilience** — single VPS is a single point of failure; no failover, no redundancy
4. **Disaster recovery** — no documented RTO/RPO, backup strategy is ad-hoc
5. **Development mobility** — dev environment tied to home desktop

---

## Architecture

### Current State (Single Region)

```
                    ┌─────────────────────┐
                    │     Cloudflare       │
                    │   (DNS + CDN + WAF)  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Hetzner EU VPS    │
                    │   (Nuremberg)       │
                    │                     │
                    │  ┌───────────────┐  │
                    │  │ Backend :8080 │  │
                    │  │ Frontend:3000 │  │
                    │  │ Website :3002 │  │
                    │  │ Postgres:5432 │  │
                    │  │ Staging :8081 │  │
                    │  └───────────────┘  │
                    │                     │
                    │  All users (EU+US)  │
                    └─────────────────────┘
```

### Target State (Multi-Region)

```
                         ┌─────────────────────┐
                         │     Cloudflare       │
                         │   DNS + CDN + WAF    │
                         │                      │
                         │  Geo-routing rules:  │
                         │  EU → eu.api         │
                         │  US → us.api         │
                         └───────┬───────┬──────┘
                                 │       │
                 ┌───────────────▼─┐   ┌─▼───────────────┐
                 │  Hetzner EU     │   │  Hetzner US     │
                 │  Nuremberg      │   │  Ashburn, VA    │
                 │                 │   │                 │
                 │ ┌─────────────┐ │   │ ┌─────────────┐ │
                 │ │ Backend     │ │   │ │ Backend     │ │
                 │ │ Frontend    │ │   │ │ Frontend    │ │
                 │ │ Postgres EU │ │   │ │ Postgres US │ │
                 │ └─────────────┘ │   │ └─────────────┘ │
                 │                 │   │                 │
                 │ EU user data   │   │ US user data   │
                 │ GDPR scope     │   │ US scope       │
                 └────────┬────────┘   └────────┬────────┘
                          │                     │
                          │   Cross-region       │
                          │   backup sync       │
                          └──────────┬──────────┘
                                     │
                          ┌──────────▼──────────┐
                          │  Hetzner Storage Box │
                          │  (encrypted backups) │
                          │  BX11: €3.50/mo     │
                          └─────────────────────┘

         ┌─────────────────────┐
         │  Dev VPS (EU)       │
         │  Hetzner CPX31      │
         │  Nuremberg          │
         │                     │
         │  Development env    │
         │  SSH from anywhere  │
         └─────────────────────┘
```

---

## Data Residency

### Principle

> **User data never leaves its region.** EU user data stays on EU servers. US user data stays on US servers. Backups are encrypted before any cross-region transfer.

### How Region Is Determined

```
User signs up
    │
    ▼
Cloudflare detects country (CF-IPCountry header)
    │
    ├─ EU/EEA/UK/CH country code → Region: EU
    │   → API: api-eu.sovereignhealth.io
    │   → DB: Postgres on Hetzner Nuremberg
    │
    ├─ US/CA country code → Region: US
    │   → API: api-us.sovereignhealth.io
    │   → DB: Postgres on Hetzner Ashburn
    │
    └─ Other → Default: EU (GDPR as baseline)
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  EU User (Berlin)                  US User (New York)       │
│       │                                  │                  │
│       ▼                                  ▼                  │
│  sovereignhealth.io                sovereignhealth.io       │
│       │                                  │                  │
│       ▼                                  ▼                  │
│  Cloudflare (CF-IPCountry: DE)    Cloudflare (CF-IPCountry: US)
│       │                                  │                  │
│       ▼                                  ▼                  │
│  api-eu.sovereignhealth.io        api-us.sovereignhealth.io │
│       │                                  │                  │
│       ▼                                  ▼                  │
│  ┌──────────────┐                ┌──────────────┐           │
│  │ Postgres EU  │                │ Postgres US  │           │
│  │ Nuremberg    │                │ Ashburn, VA  │           │
│  │              │                │              │           │
│  │ • users      │                │ • users      │           │
│  │ • measures   │                │ • measures   │           │
│  │ • chats      │                │ • chats      │           │
│  │ • settings   │                │ • settings   │           │
│  └──────────────┘                └──────────────┘           │
│                                                             │
│  ❌ No cross-region data replication for user data          │
│  ✅ Encrypted backups can be stored cross-region            │
│  ✅ Content data (markers, zones) replicated to all regions │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### What Is Region-Specific vs Global

| Data | Scope | Reason |
|------|-------|--------|
| User accounts, profiles | Regional | Data residency |
| Measurements, values | Regional | Contains health data (PII) |
| Doctor chat conversations | Regional | Contains health data |
| Settings, preferences | Regional | Tied to user |
| Push subscriptions | Regional | Tied to user |
| Affiliate data, conversions | Regional | Tied to user |
| **Markers, zones, tiers** | **Global (replicated)** | Reference data, no PII |
| **Content strings (i18n)** | **Global (replicated)** | UI text, no PII |
| **License tier definitions** | **Global (replicated)** | Product config |
| **App prefixes (Sovereign Link)** | **Global (replicated)** | Routing config |

### Implementation

- `users` table gets a `region` column (`eu`, `us`) set at signup based on `CF-IPCountry`
- JWT includes `region` claim — frontend routes API calls to correct regional endpoint
- Content/reference data seeded identically to all regions (migration-based)
- Sovereign Link redirects are global (any region can redirect) — click tracking stays regional

---

## Use Cases

### UC-1: New US Customer Signs Up

```
1. User visits sovereignhealth.io from New York
2. Cloudflare serves website from CDN (global, static)
3. User clicks "Sign Up" → frontend loaded from CDN
4. Frontend detects region via /api/config (Cloudflare CF-IPCountry: US)
5. Signup POST → api-us.sovereignhealth.io/auth/register
6. Account created in US Postgres with region='us'
7. JWT issued with region='us'
8. All subsequent API calls → api-us.sovereignhealth.io
9. User's health data never touches EU servers
```

### UC-2: EU User Travels to US

```
1. User opens app from US hotel wifi
2. Cloudflare detects CF-IPCountry: US
3. BUT user's JWT contains region='eu'
4. Frontend reads JWT region → routes to api-eu.sovereignhealth.io
5. Slightly higher latency (~150ms) but data stays in EU
6. PWA service worker caches reduce perceived latency
7. Offline mode works regardless of location
```

### UC-3: Clinic (US) with EU Patients

```
1. Clinic signs up from US → region='us', org created
2. Clinic invites EU patient → patient signs up
3. Patient's CF-IPCountry: DE → region='eu'
4. Patient data in EU Postgres, clinic dashboard in US Postgres
5. Clinic sees patient summary via data_shares (read-only, aggregated)
6. Shared data is anonymized/aggregated — no raw PII crosses regions
7. Design 021 org_id + data_shares table handles this
```

### UC-4: Disaster — EU VPS Goes Down

```
1. Monitoring (Gatus) detects EU VPS is unreachable
2. ntfy alert → Telegram notification to admin
3. Admin provisions new EU VPS from latest snapshot (< 30 min)
4. Restores Postgres from latest backup (< 1 hour old)
5. Updates Cloudflare DNS to new VPS IP
6. Total downtime: 30-60 minutes (RTO target)
7. Data loss: < 1 hour of transactions (RPO target)
8. US region completely unaffected
```

### UC-5: Dev VPS for Mobile Development

```
1. Developer SSH from laptop at BTC Prague
2. Code changes on dev VPS (EU, Nuremberg)
3. cargo build + pnpm build run on VPS (fast, 4 vCPU)
4. deploy.sh staging → datacenter-to-datacenter transfer (~10s vs 2min from home)
5. Test on phone via staging URL
6. deploy.sh production → both regions updated
```

---

## Cloudflare Geo-Routing

### Free Plan Capabilities

Cloudflare Free plan includes:
- ✅ DNS with proxy (orange cloud)
- ✅ `CF-IPCountry` header on all requests (free)
- ✅ Page Rules (3 free rules)
- ✅ SSL/TLS (Full Strict with Origin Certificates)
- ❌ **No geo-based load balancing** (requires $5/mo+ Load Balancing add-on)
- ❌ **No Worker-based routing** on free plan (Workers free tier: 100k requests/day — likely sufficient)

### Routing Strategy (No Upgrade Needed)

**Option 1: Client-side routing (free, recommended for Phase 1)**

```
1. Frontend calls GET /api/config on page load
2. Backend reads CF-IPCountry header from request
3. Returns { region: "us", api_url: "https://api-us.sovereignhealth.io" }
4. Frontend stores region in context, routes all API calls to regional URL
5. After signup: region stored in JWT, no need to check CF-IPCountry again
```

Cost: **€0** — uses existing free Cloudflare plan.

**Option 2: Cloudflare Workers ($5/mo or free tier)**

```javascript
// Worker script — routes based on country
export default {
  async fetch(request) {
    const country = request.headers.get('CF-IPCountry') || 'DE'
    const isUS = ['US', 'CA'].includes(country)
    const origin = isUS
      ? 'https://api-us.sovereignhealth.io'
      : 'https://api-eu.sovereignhealth.io'
    return fetch(origin + new URL(request.url).pathname, request)
  }
}
```

Cost: **€0** (free tier: 100k requests/day) or **$5/mo** for unlimited.

**Option 3: Cloudflare Load Balancing (Pro plan)**

- Geographic steering, health checks, automatic failover
- Cost: **$5/mo** base + **$5/mo** per additional origin
- Overkill for 2 regions — use when 3+ regions needed

### Recommendation

**Phase 1: Client-side routing (free).** The frontend reads the region from JWT or `/api/config` and routes accordingly. No Cloudflare upgrade needed.

**Phase 2: Cloudflare Workers** when we want transparent routing without frontend logic. Free tier handles our volume easily.

---

## Backup Strategy

### Current State

| What | Frequency | Location | Retention |
|------|-----------|----------|-----------|
| Staging DB | Before each deploy | VPS local (`/opt/backups/`) | Last 5 |
| Production DB | Before each deploy | VPS local (`/opt/backups/`) | Last 5 |
| Docker images | Each deploy (local build) | Dev machine + VPS | Current only |
| Code | Git (GitHub) | Cloud | Full history |

**Gaps:** No off-site backups, no automated schedule, no cross-region copies, no backup testing.

### Target State

```
┌──────────────────────────────────────────────────────────────┐
│                    Backup Architecture                       │
│                                                              │
│  ┌────────────┐     ┌────────────┐     ┌────────────────┐   │
│  │ Postgres EU│     │ Postgres US│     │ Hetzner Storage │   │
│  │ (primary)  │     │ (primary)  │     │ Box (BX11)     │   │
│  └─────┬──────┘     └─────┬──────┘     │ €3.50/mo       │   │
│        │                  │             │ 1 TB           │   │
│        ▼                  ▼             │ RAID, Nuremberg│   │
│  pg_dump daily       pg_dump daily     └───────▲─────────┘   │
│  (encrypted)         (encrypted)               │             │
│        │                  │                    │             │
│        └──────────────────┴────────────────────┘             │
│                    rsync over SSH                             │
│                    GPG encrypted                              │
│                                                              │
│  Also backed up:                                             │
│  • Docker Compose files                                      │
│  • nginx configs                                             │
│  • .env files (encrypted)                                    │
│  • SSL certificates                                          │
│                                                              │
│  NOT backed up (reproducible):                               │
│  • Docker images (rebuilt from Git)                          │
│  • node_modules, target/ (rebuilt)                           │
│  • Cloudflare config (managed via dashboard)                 │
└──────────────────────────────────────────────────────────────┘
```

### Backup Schedule

| What | Frequency | Method | Retention | Location |
|------|-----------|--------|-----------|----------|
| Postgres (full) | Daily 03:00 UTC | `pg_dump \| gpg \| rsync` | 30 days | Storage Box + local |
| Postgres (WAL) | Continuous | `pg_basebackup` streaming | 7 days | Local VPS |
| VPS snapshot | Weekly (Sunday) | Hetzner API | 4 weeks | Hetzner cloud |
| Config files | Daily (with DB) | tar + gpg + rsync | 30 days | Storage Box |
| Deploy-time backup | Each deploy | pg_dump (existing) | Last 5 | Local VPS |

### Encryption

All backups encrypted before leaving the VPS:
```bash
pg_dump sovereign_health | gpg --encrypt --recipient backup@brickos.io > backup.sql.gpg
rsync -az backup.sql.gpg storage-box:/backups/eu/
```

GPG key stored in password manager, not on VPS. Backups are useless without the key.

---

## Disaster Recovery

### RTO/RPO Targets

| Scenario | RTO (Recovery Time) | RPO (Data Loss) |
|----------|-------------------|-----------------|
| VPS reboot (kernel panic) | 5 min (auto-restart) | 0 (DB survives) |
| VPS disk failure | 30-60 min | < 1 hour (WAL) |
| VPS provider outage (region) | 2-4 hours | < 24 hours (daily backup) |
| Data corruption (bad migration) | 15 min (restore from deploy backup) | < 5 min |
| Complete loss of one region | 4-8 hours | < 24 hours |
| Ransomware / compromise | 4-8 hours | < 24 hours (off-site backup) |

### Recovery Procedures

**Scenario 1: VPS Dies (Hardware Failure)**

```
1. Gatus detects downtime → ntfy alert (< 2 min)
2. Provision new VPS from latest weekly snapshot
   → Hetzner console: "Create Server from Snapshot" (< 5 min)
3. If snapshot is stale: restore Postgres from Storage Box backup
   → scp backup.sql.gpg from storage box
   → gpg --decrypt | psql (< 15 min for current DB size)
4. Update Cloudflare DNS to new IP
   → Cloudflare dashboard or API (< 2 min, TTL: 5 min)
5. Verify: curl /health → 200
6. Total: 30-60 minutes
```

**Scenario 2: Bad Migration (Data Corruption)**

```
1. Deploy runs migration → data corrupted
2. Restore from deploy-time backup (taken 5 min ago by deploy.sh)
   → psql < staging_backup_YYYYMMDD_HHMMSS.sql.gz
3. Revert code: git revert + redeploy
4. Total: 15 minutes, < 5 min data loss
```

**Scenario 3: Full Region Loss (Hetzner EU Down)**

```
1. EU users see downtime, US users unaffected
2. Option A: Wait for Hetzner to restore (usually < 4 hours)
3. Option B: Provision emergency VPS at different provider
   → Restore from Storage Box backup (off-site, encrypted)
   → Update Cloudflare DNS
4. EU user data temporarily read-only until migration verified
5. Total: 4-8 hours
```

**Scenario 4: Compromise / Ransomware**

```
1. Isolate: Hetzner firewall → block all inbound except admin IP
2. Assess: check what was accessed (audit_log, access_log tables)
3. Provision fresh VPS from known-good weekly snapshot
4. Restore DB from off-site backup (Storage Box, GPG encrypted)
5. Rotate all secrets: JWT_SECRET, ENCRYPTION_KEY, DB passwords, API keys
6. Redeploy from Git (code is clean, hosted on GitHub)
7. Notify affected users if data was exfiltrated (GDPR Art. 33/34)
8. Total: 4-8 hours
```

---

## VPS Resilience

### Monitoring Stack

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Gatus      │────▶│    ntfy      │────▶│  Telegram    │
│  (watchdog)  │     │  (push)      │     │  (alert)     │
└──────────────┘     └──────────────┘     └──────────────┘
       │
       ├── GET /health (every 60s, both regions)
       ├── GET / frontend (every 5min)
       ├── TCP :5432 Postgres (every 60s)
       └── Disk space check (daily)
```

### Hetzner VPS Features

| Feature | Availability | Cost |
|---------|-------------|------|
| Automated weekly snapshots | Yes | €0.01/GB/mo (~€1.60 for 160GB) |
| Firewall (cloud) | Yes | Free |
| Rescue mode (SSH into broken VPS) | Yes | Free |
| Live migration (zero-downtime host moves) | Automatic | Free |
| DDoS protection | Basic L3/L4 | Free |
| Load balancer | Available | €5.39/mo |
| Floating IP (instant failover) | Available | €4.50/mo |
| Storage Box (off-site backups) | Available | €3.50/mo (1TB) |

### Recommended Resilience Add-ons

| Add-on | Cost | Value |
|--------|------|-------|
| **Weekly snapshots** | ~€1.60/mo | Instant VPS restore |
| **Storage Box BX11** | €3.50/mo | Off-site encrypted backups |
| **Floating IP** (per region) | €4.50/mo | Instant IP failover to new VPS |
| **Total** | **~€10/mo** per region | Covers most failure scenarios |

---

## Cost Summary

### Phase 1 (Now: Dev VPS)

| Item | Monthly |
|------|---------|
| Dev VPS (CPX31, EU) | €15.00 |
| **Total** | **€15.00** |

### Phase 2 (US Customer Onboard)

| Item | Monthly |
|------|---------|
| Dev VPS (CPX31, EU) | €15.00 |
| Prod EU VPS (existing) | ~€20.00 |
| Prod US VPS (CPX31) | €15.00 |
| Snapshots (2 regions) | €3.20 |
| Storage Box (backups) | €3.50 |
| Floating IPs (2) | €9.00 |
| **Total** | **~€65.70/mo** |

### Phase 3 (Growth: 3+ Regions)

Add ~€30/mo per additional region (VPS + snapshot + floating IP).

---

## Implementation Checklist

### Phase 1: Dev VPS (this week)
- [ ] Provision Hetzner CPX31 (Nuremberg)
- [ ] Install: Rust, Node/pnpm, Docker, Git, Claude Code CLI
- [ ] Clone repo, configure SSH keys, .env
- [ ] First build (cargo build + pnpm install)
- [ ] Configure Mosh + tmux
- [ ] Enable weekly snapshots
- [ ] Update issue #227 with IP and access details

### Phase 2: Backup Hardening (next sprint)
- [ ] Provision Storage Box BX11
- [ ] Create GPG backup key
- [ ] Write `ops/backup.sh` — daily pg_dump + gpg + rsync
- [ ] Cron job: daily 03:00 UTC
- [ ] Test restore procedure
- [ ] Document in deployment README

### Phase 3: US Region (when customer onboards)
- [ ] Provision Hetzner US VPS (Ashburn)
- [ ] Deploy backend + frontend + Postgres
- [ ] Add `region` column to users table
- [ ] Update signup flow to set region from CF-IPCountry
- [ ] Add region claim to JWT
- [ ] Frontend: route API calls based on JWT region
- [ ] Cloudflare: add api-us.sovereignhealth.io DNS record
- [ ] Update deploy.sh for multi-region
- [ ] Enable floating IP + snapshots for US region
- [ ] Test cross-region content sync

---

## Open Questions

- [ ] Should we offer users the ability to choose their region explicitly?
- [ ] How to handle region migration (user moves from EU to US permanently)?
- [ ] HIPAA compliance for US health data — do we need BAA with Hetzner?
- [ ] Should Sovereign Link (brickos.io/r/) be global or regional?
- [ ] Do we need read replicas within a region for scaling, or is a single Postgres sufficient?
