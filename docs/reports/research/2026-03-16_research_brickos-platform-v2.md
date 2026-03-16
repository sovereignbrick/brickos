<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Privacy-first platform for collecting, analyzing, and understanding
 blood markers and laboratory data.

 Own your data. Understand your biology. Build health sovereignty.

 https://sovereignhealth.io/
 AGPL-3.0 -- https://gitlab.com/sovereign-health
============================================================================
-->

# Research Report: BrickOS Platform Architecture v2

**Date:** 2026-03-16
**Type:** Strategic architecture research (revised)
**Author:** Claude Code (Opus 4.6)
**Supersedes:** 2026-03-16_research_brickos-platform.md

---

## 1. Executive Summary

BrickOS is a sovereignty software platform that builds and distributes privacy-first applications. This v2 report addresses:

- The **core-api gateway** layer and how platform services work
- **Category folders** (health/, finance/) as grouping mechanism for multiple apps per domain
- **Monorepo** as the recommended structure from day one
- **PWA + blob encryption** integration for offline-first capability
- **GitHub** for project management, agile planning, and Claude Code automation
- Complete **migration path** from the current GitLab setup

  The bottom line: "The monorepo is the house. The category folders are the rooms. The shared crates are the plumbing.
   Build one room at a time, but lay the plumbing once." 
   
---

## 2. Revised Architecture

### 2.1 Full Monorepo Structure

```
github.com/brickos-apps/brickos        # Single monorepo
|
|-- Cargo.toml                          # Rust workspace root
|-- pnpm-workspace.yaml                 # Node workspace root
|-- .github/
|   |-- workflows/                      # CI/CD for all apps
|   |   |-- ci-health.yml
|   |   |-- ci-finance.yml
|   |   |-- ci-platform.yml
|   |-- ISSUE_TEMPLATE/
|   |-- CODEOWNERS
|
|-- platform/                           # BrickOS core services (always running)
|   |
|   |-- core-api/                       # API gateway + shared services runtime
|   |   |-- src/
|   |   |   |-- gateway/                # Routes /health/* /finance/* to app APIs
|   |   |   |-- auth/                   # Login, sessions, Nostr nsec, JWT
|   |   |   |-- accounts/              # User profiles, cross-app identity
|   |   |   |-- billing/               # Stripe, Strike, subscriptions
|   |   |   |-- backup/                # Encrypted backup orchestrator
|   |   |   |-- notifications/         # Nostr DMs, email dispatch
|   |   |   |-- app_registry/          # App catalog, versions, health status
|   |   |   |-- admin/                 # Platform admin dashboard API
|   |   |-- migrations/
|   |   |-- Cargo.toml                  # depends on: brickos-auth, brickos-crypto, etc.
|   |
|   |-- dashboard/                      # Platform UI (app launcher, account, billing)
|   |   |-- src/app/
|   |   |   |-- page.tsx               # "My Apps" launcher grid
|   |   |   |-- account/              # Profile, Nostr identity, devices
|   |   |   |-- billing/              # Cross-app subscriptions
|   |   |   |-- admin/                # Platform admin
|   |   |-- package.json
|   |
|   |-- website/                        # brickos.io marketing site
|       |-- src/app/
|       |-- package.json
|
|-- crates/                             # Shared Rust libraries (no runtime)
|   |-- brickos-auth/                   # JWT + Nostr NIP-98 verification
|   |   |-- src/lib.rs
|   |   |-- Cargo.toml
|   |-- brickos-crypto/                 # AES-256-GCM, key derivation, blob encryption
|   |   |-- src/lib.rs
|   |   |-- Cargo.toml
|   |-- brickos-db/                     # Pool helpers, common types, migration utils
|   |   |-- src/lib.rs
|   |   |-- Cargo.toml
|   |-- brickos-backup/                 # Encrypted backup protocol
|       |-- src/lib.rs
|       |-- Cargo.toml
|
|-- packages/                           # Shared Node/React libraries (no runtime)
|   |-- ui/                             # Design system (shadcn-based)
|   |   |-- src/components/
|   |   |-- package.json
|   |-- i18n/                           # Translation framework
|   |   |-- src/
|   |   |-- package.json
|   |-- pwa/                            # Service worker, offline sync, blob cache
|       |-- src/
|       |-- package.json
|
|-- apps/                               # Domain-specific applications
|   |
|   |-- health/                         # Health domain (can contain multiple apps)
|   |   |
|   |   |-- sovereign-health/           # Sovereign Health Intelligence
|   |   |   |-- api/                    # Rust: biomarkers, measurements, trends
|   |   |   |   |-- src/
|   |   |   |   |-- migrations/
|   |   |   |   |-- Cargo.toml         # depends on: brickos-auth, brickos-crypto
|   |   |   |-- frontend/              # Next.js app
|   |   |   |   |-- src/app/
|   |   |   |   |-- package.json       # depends on: @brickos/ui, @brickos/i18n
|   |   |   |-- website/               # sovereignhealth.io
|   |   |   |-- startos/               # StartOS package wrapper
|   |   |   |-- ops/                   # Docker, deploy scripts
|   |   |
|   |   |-- symptom-journal/           # Future: symptom tracking app
|   |       |-- api/
|   |       |-- frontend/
|   |
|   |-- finance/                        # Finance domain
|   |   |
|   |   |-- btc-tracker/               # Bitcoin portfolio tracker
|   |   |   |-- api/
|   |   |   |-- frontend/
|   |   |   |-- startos/
|   |   |
|   |   |-- expense-tracker/           # Future: privacy-first expense tracking
|   |       |-- api/
|   |       |-- frontend/
|   |
|   |-- node/                           # Infrastructure domain
|       |
|       |-- bitcoin-node/              # Bitcoin full node manager
|           |-- api/
|           |-- frontend/
|           |-- startos/
|
|-- docs/                               # Platform-wide documentation
|   |-- reports/
|   |-- specs/
|   |-- architecture/
|
|-- ops/                                # Platform-wide operations
    |-- docker-compose.dev.yml
    |-- docker-compose.prod.yml
    |-- deploy.sh
    |-- nginx/
```

### 2.2 Why This Structure

**Q: Why `apps/health/` and `apps/finance/` category folders?**

These are NOT just marketing groupings -- they serve real purposes:

1. **CI scoping:** `.github/workflows/ci-health.yml` only runs when `apps/health/**` changes
2. **CODEOWNERS:** Different teams/reviewers per domain
3. **Multiple apps per domain:** `apps/health/` can contain `sovereign-health/`, `symptom-journal/`, `food-intelligence/` -- all health apps sharing health-specific libraries
4. **Dependency boundaries:** Health apps can share health-specific types/models without polluting finance apps
5. **StartOS bundling:** A "BrickOS Health Suite" StartOS package could bundle all health apps

**Q: Why monorepo from day one?**

With only 1 app today, the monorepo has the same complexity as the current 3-repo setup. But it gives:
- Atomic changes: update a shared crate + all consuming apps in one commit
- Single CI: no cross-repo version coordination
- One `Cargo.lock`: consistent dependency versions
- One git history: `git log --all` shows everything
- One Claude Code context: CLAUDE.md at the root covers the whole platform

The migration is simpler now (1 app) than later (3 apps with diverged dependencies).

---

## 3. Platform Core-API Deep Dive

### 3.1 What the Core-API Does

The core-api is a running Rust service that handles everything shared across apps:

```
Internet
    |
    v
nginx (reverse proxy)
    |
    |-- brickos.io/*           --> platform/core-api:9000
    |-- app.brickos.io/*       --> platform/dashboard:3000
    |-- health.brickos.io/*    --> apps/health/sovereign-health/frontend:3001
    |-- api.brickos.io/health/*--> apps/health/sovereign-health/api:8081
    |-- api.brickos.io/finance/*-> apps/finance/btc-tracker/api:8082
    |
    v
platform/core-api:9000
    |
    |-- POST /auth/login       # Handles auth for ALL apps
    |-- POST /auth/nostr       # Nostr nsec login (NIP-98)
    |-- GET  /auth/me          # Current user + app permissions
    |-- POST /billing/checkout # Stripe/Strike for any app
    |-- GET  /billing/status   # Subscription status across apps
    |-- GET  /apps             # List installed/available apps
    |-- POST /backup/push      # Encrypted backup (any app)
    |-- GET  /backup/pull      # Restore encrypted backup
    |-- POST /notifications    # Nostr DM dispatch
    |
    v
App APIs (domain-specific, stateless auth via JWT from core-api)
    |
    |-- health-api:8081
    |   |-- GET /markers       # Biomarker list
    |   |-- POST /measurements # Record blood work
    |   |-- GET /trends        # Trend analysis
    |
    |-- finance-api:8082
        |-- GET /portfolio     # BTC holdings
        |-- GET /prices        # Price feeds
```

### 3.2 Auth Flow (Centralized)

```
1. User visits health.brickos.io
2. Frontend checks for JWT in cookie
3. No JWT? Redirect to app.brickos.io/login (platform dashboard)
4. User logs in (email/password OR Nostr nsec)
5. core-api issues JWT with: { user_id, apps: ["health", "finance"], tier: "focus" }
6. Redirect back to health.brickos.io with JWT
7. health-api validates JWT using shared brickos-auth crate (no DB call needed)
8. User is authenticated across ALL apps with one login
```

### 3.3 Billing Flow (Centralized)

```
Option A: Per-app subscriptions
  - Health Focus: EUR 9.99/mo
  - BTC Tracker Pro: EUR 4.99/mo
  - Total: EUR 14.98/mo

Option B: BrickOS Bundle (discount)
  - BrickOS Pro: EUR 12.99/mo (all apps included)
  - Savings: EUR 1.99/mo vs buying separately

Both managed by core-api billing, one Stripe customer per user.
```

### 3.4 Encrypted Blob Backup (Centralized)

```
core-api:
  POST /backup/push
    Body: {
      app: "health",
      encrypted_blob: "base64...",   # Client-side AES-256-GCM
      checksum: "sha256...",
      schema_version: 3
    }
    --> Stores blob in platform DB (cannot decrypt)

  GET /backup/pull?app=health
    --> Returns latest encrypted blob
    --> Client decrypts with their key (nsec-derived or standalone)

  GET /backup/list
    --> Returns all apps with backup status
    --> { health: { last_backup: "2026-03-16", size: "2.3MB" },
          finance: { last_backup: "2026-03-15", size: "128KB" } }
```

### 3.5 PWA Integration (Offline-First)

Each app frontend becomes a PWA with:

```
packages/pwa/
  |-- service-worker.ts        # Shared service worker template
  |-- offline-sync.ts          # Queue mutations when offline, sync when online
  |-- blob-cache.ts            # Cache encrypted blobs in IndexedDB
  |-- manifest-helper.ts       # Generate web manifest per app
```

**How it works for Sovereign Health as PWA:**

```
1. User installs PWA from health.brickos.io (Add to Home Screen)
2. Service worker caches: app shell, static assets, last API responses
3. User goes offline (airplane, remote area)
4. User enters a new measurement
5. PWA stores measurement in IndexedDB (encrypted with local key)
6. User comes back online
7. Service worker syncs queued measurements to API
8. API processes, calculates GKI, updates trends
9. User sees updated dashboard
```

**Blob encryption + PWA synergy:**

```
StartOS device (home)  <-->  PWA on phone  <-->  BrickOS cloud (optional)
     |                          |                      |
     |-- primary data store     |-- offline cache      |-- encrypted backup
     |-- Tor onion access       |-- service worker     |-- zero-knowledge
     |-- full sovereignty       |-- IndexedDB          |-- sync relay
```

---

## 4. GitHub for Project Management

### 4.1 Organization Structure

```
github.com/brickos-apps/
  |
  |-- brickos (monorepo)          # All code
  |
  |-- .github (org-level)
      |-- profile/README.md       # Org description
```

### 4.2 Agile with GitHub Issues + Projects

**Labels (consistent across all work):**

| Label | Color | Purpose |
|-------|-------|---------|
| `app:health` | Blue | Sovereign Health specific |
| `app:finance` | Amber | BTC Tracker specific |
| `app:node` | Green | Bitcoin Node specific |
| `platform` | Purple | Core-api, dashboard, billing |
| `shared` | Cyan | Crates/packages changes |
| `bug` | Red | Bug fix |
| `feature` | Green | New feature |
| `security` | Orange | Security issue |
| `i18n` | Teal | Translation |
| `p0-critical` | Red | Must fix now |
| `p1-high` | Orange | This sprint |
| `p2-medium` | Yellow | Next sprint |
| `p3-low` | Gray | Backlog |

**Milestones = Releases:**

```
v0.20.0-rc1 (Sovereign Health)     # Due: 2026-04-01
v0.1.0-rc1 (BTC Tracker)           # Due: 2026-06-01
v1.0.0 (BrickOS Platform)          # Due: 2026-08-01
```

**GitHub Projects Board:**

```
Board: "BrickOS Sprint"
Columns:
  Backlog | Ready | In Progress | In Review | Done

Views:
  - By App (filter by app:health, app:finance, etc.)
  - By Priority (group by p0/p1/p2/p3)
  - By Sprint (filter by milestone)
```

### 4.3 Claude Code + GitHub Automation

**CCPM (Claude Code Project Management):**

```
1. Create GitHub Issue: "B-0100: Add Tor support to BTC Tracker"
   - Labels: app:finance, feature, p2-medium
   - Milestone: v0.1.0-rc1

2. Claude Code reads the issue:
   claude "work on issue #100"
   - Reads issue title, description, labels
   - Creates branch: feature/B-0100-tor-support
   - Makes changes
   - Creates PR linked to issue

3. GitHub Actions:
   - Runs CI (only finance/ tests, scoped by path)
   - Auto-labels PR with app:finance
   - Adds to Project board "In Review"

4. On merge:
   - Issue auto-closes
   - Project board moves to "Done"
   - Deploy workflow triggers (if main branch)
```

**GitHub Actions CI (monorepo-aware):**

```yaml
# .github/workflows/ci-health.yml
name: CI - Health Apps
on:
  push:
    paths:
      - 'apps/health/**'
      - 'crates/**'
      - 'packages/**'
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
    steps:
      - uses: actions/checkout@v4
      - run: cargo test -p sovereign-health-api
      - run: cd apps/health/sovereign-health/frontend && pnpm test
```

Only runs when health app or shared code changes. Finance changes don't trigger health CI.

### 4.4 Issue Templates

```markdown
# .github/ISSUE_TEMPLATE/feature.yml
name: Feature Request
labels: [feature]
body:
  - type: dropdown
    id: app
    label: App
    options:
      - Sovereign Health
      - BTC Tracker
      - Bitcoin Node
      - Platform (core-api, billing, auth)
      - Shared (crates, packages)
  - type: textarea
    id: description
    label: Description
  - type: dropdown
    id: priority
    label: Priority
    options: [P0 Critical, P1 High, P2 Medium, P3 Low]
```

---

## 5. Cargo Workspace Configuration

### 5.1 Root Cargo.toml

```toml
[workspace]
resolver = "2"
members = [
  "platform/core-api",
  "crates/brickos-auth",
  "crates/brickos-crypto",
  "crates/brickos-db",
  "crates/brickos-backup",
  "apps/health/sovereign-health/api",
  "apps/finance/btc-tracker/api",
  "apps/node/bitcoin-node/api",
]

[workspace.dependencies]
# Shared dependency versions (all crates use the same version)
actix-web = "4"
sqlx = { version = "0.8", features = ["postgres", "runtime-tokio-rustls", "chrono", "macros", "uuid"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1", features = ["v4", "serde"] }
jsonwebtoken = "9"
reqwest = { version = "0.12", default-features = false, features = ["json", "rustls-tls"] }
```

### 5.2 App Cargo.toml (Sovereign Health API)

```toml
[package]
name = "sovereign-health-api"
version = "0.19.1"

[dependencies]
# Shared crates (workspace path dependencies)
brickos-auth = { path = "../../../crates/brickos-auth" }
brickos-crypto = { path = "../../../crates/brickos-crypto" }
brickos-db = { path = "../../../crates/brickos-db" }

# Workspace-inherited versions
actix-web.workspace = true
sqlx.workspace = true
serde.workspace = true
tokio.workspace = true
```

### 5.3 pnpm Workspace

```yaml
# pnpm-workspace.yaml
packages:
  - 'platform/dashboard'
  - 'platform/website'
  - 'packages/*'
  - 'apps/health/*/frontend'
  - 'apps/health/*/website'
  - 'apps/finance/*/frontend'
  - 'apps/node/*/frontend'
```

---

## 6. Migration Plan (Revised)

### Phase 1: GitHub Setup + Monorepo Migration (1 week)

```
Day 1: Create github.com/brickos-apps organization
Day 2: Create brickos monorepo with folder structure
Day 3: Move core-backend -> apps/health/sovereign-health/api/
        Move core-frontend -> apps/health/sovereign-health/frontend/
        Move saas/website -> apps/health/sovereign-health/website/
        Move ops/ -> apps/health/sovereign-health/ops/
Day 4: Set up GitHub Actions CI (replace .gitlab-ci.yml)
Day 5: Test deploy from GitHub, update deploy script
Day 6: Update all CLAUDE.md, README, license headers
Day 7: Archive GitLab repos, switch to GitHub
```

**What stays the same during migration:**
- All code, all git history (git push preserves everything)
- VPS, domains, Tor, SSL, Docker deployment
- Database, Redis, all data
- Production deployment method (docker save | ssh)

### Phase 2: Shared Library Extraction (2 weeks)

```
Week 1: Extract brickos-auth crate from sovereign-health-api/handlers/auth.rs
         Extract brickos-crypto crate from services/encryption.rs
         Extract brickos-db crate (pool helpers, common types)
Week 2: Extract @brickos/ui from sovereign-health frontend components
         Extract @brickos/i18n from i18n framework
         Sovereign Health API depends on crates/ instead of local code
```

### Phase 3: Platform Core-API (3-4 weeks)

```
Week 1: Create platform/core-api skeleton
         - Auth endpoints (JWT + Nostr)
         - Account management
Week 2: - Billing (move Stripe/Strike from health API to core)
         - App registry
Week 3: - Encrypted backup endpoints
         - Notification service (Nostr DMs)
Week 4: - Platform dashboard UI
         - Cross-app SSO
```

### Phase 4: Second App -- BTC Tracker (4-6 weeks)

```
Validates the entire shared infrastructure:
- Uses brickos-auth (no custom auth code)
- Uses brickos-crypto (same encryption)
- Uses @brickos/ui (same design system)
- Deploys as StartOS package
- Shares billing with core-api
```

### Phase 5: PWA + Offline (2-3 weeks)

```
- Create packages/pwa with service worker template
- Add PWA manifest to Sovereign Health frontend
- Implement offline measurement entry with IndexedDB queue
- Background sync when connection restored
- Encrypted blob cache for offline data access
```

---

## 7. Risk Analysis

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Monorepo CI complexity | MEDIUM | MEDIUM | Path-scoped workflows, only test what changed |
| Over-engineering shared crates too early | HIGH | HIGH | Extract only when second app needs it, not before |
| GitHub Actions learning curve | LOW | HIGH | Well-documented, many examples, Claude Code can write workflows |
| Core-api becomes bottleneck | MEDIUM | LOW | Keep it thin (auth + billing + routing), heavy logic stays in app APIs |
| Splitting auth from health API breaks existing users | HIGH | LOW | Deploy core-api alongside health API first, migrate gradually |
| Monorepo size grows too large | LOW | LOW | Cargo workspace + pnpm workspace handle this well, git shallow clone for CI |
| Losing GitLab CI test history | LOW | MEDIUM | Archive results before migration, fresh start on GitHub |

---

## 8. Why This Is Better Than Multi-Repo

For a solo developer building brick by brick:

| Concern | Multi-Repo (3+ repos) | Monorepo (1 repo) |
|---------|----------------------|-------------------|
| Update shared crate | Publish crate, update Cargo.toml in each app, merge 3 PRs | One commit, one PR |
| Claude Code context | Must switch between repos, different CLAUDE.md per repo | One CLAUDE.md, full context |
| CI | 3+ pipelines, version coordination | One pipeline, path-scoped |
| Dependency versions | Can drift between repos | One Cargo.lock, always aligned |
| GitHub Issues | Scattered across repos | One board, one backlog |
| Searching code | `gh search` across repos | `grep` or `rg` in one dir |
| Onboarding | Clone 3+ repos, set up each | Clone once, everything works |
| Atomic deploys | Coordinate 3 deploys | Deploy from one commit |

The category folders (`apps/health/`, `apps/finance/`) give you the organization of multi-repo without the coordination overhead.

---

## 9. Cost Estimate

| Item | Cost |
|------|------|
| GitHub Free (public repos) | $0 |
| GitHub Team (private repos, if needed) | $4/user/mo |
| GitHub Actions (free tier: 2000 min/mo) | $0 (likely sufficient) |
| Domain: brickos.io | ~$15/yr |
| Additional VPS resources (core-api) | ~$5-10/mo |
| **Total additional cost** | **~$20/mo** |

---

## 10. Recommendation

1. **Start the monorepo now** -- the migration is simpler with 1 app than with 3
2. **Keep category folders** (`apps/health/`, `apps/finance/`) -- they're not just marketing, they scope CI, ownership, and future app grouping
3. **Don't extract shared crates until Phase 4** (second app) -- premature abstraction is the biggest risk
4. **Use GitHub Issues + Projects from day one** -- replace the current sprint folders in `docs/specs/` with GitHub milestones and issue labels
5. **Add PWA in Phase 5** -- the offline-first + blob encryption synergy with StartOS is powerful but not urgent for launch

**The monorepo is the house. The category folders are the rooms. The shared crates are the plumbing. Build one room at a time, but lay the plumbing once.**
