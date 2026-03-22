# Design: Monitoring & Resilience Strategy

**Status:** Draft
**Date:** 2026-03-22

## Problem

On 2026-03-22, a production outage occurred when the PostgreSQL container (`sovereign-health-db-1`) was inadvertently removed during a staging compose operation. The outage had the following characteristics:

- **Duration:** Unknown (discovered manually, not by monitoring)
- **Impact:** All DB-dependent endpoints returned 500; users saw "Internal server error" on login
- **Detection:** Manual — user reported, not automated alerting
- **Root cause:** `docker compose up -d` for staging resolved a naming conflict by recreating the production DB container, which failed and left no DB running

### Why monitoring failed to alert

Three compounding gaps prevented detection:

1. **Health endpoint is shallow.** `GET /health` returns `200 OK` with version/timestamp but does **not** check DB or Redis connectivity. Gatus saw `success=true` throughout the entire outage.

2. **ntfy had zero subscribers.** The server uses `NTFY_AUTH_DEFAULT_ACCESS=deny-all`, so unauthenticated subscriptions are silently rejected. The admin had subscribed without credentials, so no device was actually listening.

3. **No container-level monitoring.** Gatus monitors HTTP endpoints only. There is no check that verifies the DB/Redis containers are running, or that the backend can actually query the database.

## Current Architecture

### Notification Channels (Dual Dispatch)

All alerts are sent to **both** ntfy and Telegram via the `services/notify.rs` fire-and-forget service (5s timeout, failures logged but never block).

| Channel | Priority | Examples |
|---------|----------|----------|
| `sh-critical` | 4-5 | MFA brute force, security breaches, production down |
| `sh-errors` | 3 | Deploy failures, API errors |
| `sh-billing` | 3 | Subscriptions, payments, refunds |
| `sh-users` | 2 | Signups, account changes |
| `sh-info` | 1 | General status |
| `sh-status` | 4 | Gatus uptime alerts (via alerting config) |

### Gatus (Uptime Monitoring)

**Status page:** https://status.sovereignhealth.io

| Endpoint | Interval | Conditions |
|----------|----------|------------|
| Production API (`/health`) | 60s | HTTP 200, <3000ms |
| Production App | 60s | HTTP 200, <5000ms |
| Website | 120s | HTTP 200 |
| Staging API | 300s | HTTP <500 |
| Staging App | 300s | HTTP <500 |
| ntfy | 300s | HTTP 200 |

Alert config: failure-threshold 2, success-threshold 2, alerts via ntfy + Telegram.

### ntfy (Self-Hosted Notifications)

- **URL:** https://ntfy.brickos.io
- **Auth:** `deny-all` default, admin user required
- **Container:** `ntfy` on `sovereign-health_default` network
- **Cache:** 48h retention
- **Credentials:** admin / (password set via `NTFY_PASSWORD` env)

### Docker Restart Policies

All containers use `restart: unless-stopped`. Health checks exist only on DB containers (`pg_isready`).

### Deploy Script Notifications

`deploy.sh` sends start/finish/failure notifications to both channels. A `trap` handler sends failure alerts on unexpected exit.

## Gap Analysis

### Gap 1: Shallow Health Endpoint (Critical)

**Current:** `/health` returns static JSON without verifying dependencies.

**Risk:** Gatus reports "up" when the app is non-functional. This is the single biggest monitoring gap.

**Fix:** Add deep health checks:

```
GET /health          -> always 200 (for load balancer liveness)
GET /health?deep=1   -> checks DB + Redis, returns 503 if either is down
```

```rust
// Proposed response
{
  "status": "ok" | "degraded",
  "service": "sovereign-health-backend",
  "version": "0.24.0",
  "timestamp": "...",
  "checks": {
    "database": { "status": "ok", "latency_ms": 2 },
    "redis": { "status": "ok", "latency_ms": 1 }
  }
}
```

Gatus should monitor `/health?deep=1` and alert when status != 200.

**Effort:** Small (backend only, ~50 lines)

### Gap 2: No Container-Level Monitoring (High)

**Current:** Only HTTP endpoints are monitored. If a container disappears but the frontend still serves cached pages, nobody knows.

**Risk:** DB or Redis silently gone, backend returns errors on every request.

**Fix options:**

**Option A: Docker socket monitor (cron script on VPS)**

A lightweight shell script that runs every 60s via cron or systemd timer, checks that critical containers are running, and sends ntfy alerts if any are missing.

```bash
#!/bin/bash
# /opt/sovereign-health/scripts/container-watchdog.sh
REQUIRED="sovereign-health-db-1 sovereign-health-backend-1 sovereign-health-frontend-1 sovereign-health-redis-1"
NTFY_URL="http://127.0.0.1:2586/sh-critical"
NTFY_TOKEN="tk_rh3na8b04ul2gqv0w6dp8wsl4c6ma"

for name in $REQUIRED; do
  if ! docker inspect --format='{{.State.Running}}' "$name" 2>/dev/null | grep -q "true"; then
    curl -s -H "Authorization: Bearer $NTFY_TOKEN" \
         -H "Title: PROD: Container $name is DOWN" \
         -H "Priority: 5" \
         -H "Tags: rotating_light,skull" \
         -d "Container $name is not running on $(hostname) at $(date -u)" \
         "$NTFY_URL"
  fi
done
```

Run via systemd timer every 60s. Can also auto-restart containers (self-healing).

**Option B: Autoheal container**

Deploy `willfarrell/autoheal` alongside the stack. It monitors Docker health checks and auto-restarts unhealthy containers.

**Recommendation:** Both. Option A for alerting, Option B for self-healing.

**Effort:** Small (ops only, no code changes)

### Gap 3: Compose Project Isolation (High)

**Current:** Staging and production compose files both define a service called `db`. Running `docker compose` without explicit `--project-name` can cross-contaminate.

**Risk:** Exactly what happened — a staging operation destroyed the production DB container.

**Fix:**

1. Add explicit `name:` to each compose file:
   ```yaml
   # docker-compose.prod.yml
   name: sovereign-health

   # docker-compose.staging.yml
   name: sh-staging
   ```

2. Add a safety check to `deploy.sh` that verifies `--project-name` is set correctly before any compose operation.

3. Document: **never run raw `docker compose` on the VPS** — always use the deploy script.

**Effort:** Minimal (ops config only)

### Gap 4: ntfy Subscriber Verification (Medium)

**Current:** No way to know if anyone is actually listening. `subscribers=0` went unnoticed.

**Fix:**

1. Add a **daily heartbeat** notification to `sh-status` (e.g., "Sovereign Health monitoring: all systems OK"). If you stop receiving it, you know subscriptions are broken.

2. Add a Gatus endpoint that checks ntfy subscriber count (requires ntfy API).

3. Document the ntfy phone setup procedure (auth required, not anonymous).

**Effort:** Small

### Gap 5: No Backend Self-Diagnostics (Medium)

**Current:** Backend logs DB errors but doesn't proactively alert. The `services/notify.rs` fire-and-forget service only sends app-level events (signups, billing), not infrastructure events.

**Fix:** Add infrastructure-level notifications from the backend:

- On startup: send "Backend started, version X" to `sh-status`
- On DB connection failure (after N retries): send to `sh-critical`
- On Redis connection failure: send to `sh-errors`
- Periodic (every 5m): internal health self-check, alert on degradation

**Effort:** Medium (backend code changes)

### Gap 6: No Database Backup Monitoring (Medium)

**Current:** No automated production DB backups. No monitoring of backup freshness.

**Fix:**

1. Automated daily `pg_dump` via cron (already in staging deploy, not in production)
2. Monitor backup age — alert if last backup is >24h old
3. Store backups off-VPS (S3/Backblaze B2)

**Effort:** Medium (ops + storage setup)

### Gap 7: No SSL/TLS Certificate Monitoring (Low)

**Current:** Let's Encrypt certs auto-renew via certbot, but renewal failures are silent.

**Fix:** Add Gatus TLS expiry check:

```yaml
- name: "TLS: api.sovereignhealth.io"
  group: "Infrastructure"
  url: "https://api.sovereignhealth.io"
  interval: 6h
  conditions:
    - "[CERTIFICATE_EXPIRATION] > 7d"
  alerts:
    - type: ntfy
```

**Effort:** Minimal (Gatus config only)

### Gap 8: No Resource Monitoring (Low)

**Current:** Deploy script checks disk space pre-deploy, but there's no ongoing monitoring of disk, CPU, memory.

**Fix options:**

- **Lightweight:** Cron script that checks `df -h`, `free -m`, container memory usage, alerts via ntfy if thresholds exceeded
- **Full:** Deploy node_exporter + Prometheus + Grafana (overkill for single VPS)

**Recommendation:** Lightweight cron script for now. Prometheus when scaling to multiple nodes.

**Effort:** Small (cron) / Large (Prometheus)

## Platform-Level Monitoring (BrickOS Core)

As BrickOS extracts into a platform (`platform/core-api`), monitoring should be a platform concern, not per-app.

### Proposed Architecture

```
                    +------------------+
                    |   Gatus          |  HTTP endpoint monitoring
                    |   (status page)  |  + TLS cert checks
                    +--------+---------+
                             |
                    +--------v---------+
                    |   ntfy + Telegram |  Dual-channel alerting
                    |   (self-hosted)   |
                    +--------+---------+
                             ^
              +--------------+--------------+
              |              |              |
    +---------+--+  +--------+---+  +-------+--------+
    | Container  |  | App Health  |  | Resource       |
    | Watchdog   |  | Self-Check  |  | Monitor        |
    | (systemd)  |  | (backend)   |  | (systemd)      |
    +------------+  +-------------+  +----------------+
```

### Per-App Health Contract

Every BrickOS app should implement:

```
GET /health         -> 200 always (liveness)
GET /health?deep=1  -> 200/503 (readiness, checks DB/Redis/dependencies)
```

Response shape (standardized across platform):

```json
{
  "status": "ok | degraded | down",
  "service": "string",
  "version": "string",
  "timestamp": "ISO8601",
  "checks": {
    "database": { "status": "ok | down", "latency_ms": 2 },
    "redis": { "status": "ok | down", "latency_ms": 1 },
    "email": { "status": "ok | degraded", "provider": "mailgun" }
  }
}
```

This contract enables Gatus (or any future orchestrator) to monitor all apps uniformly.

## ntfy Phone Setup Guide

The ntfy mobile app (Android/iOS) requires **account-based auth** — it does not support OAuth or token-only auth from the app UI.

### Setup Steps

1. Open ntfy app
2. Go to **Settings** (gear icon)
3. Tap **Add account** (or "Manage users")
4. Enter:
   - Service URL: `https://ntfy.brickos.io`
   - Username: `admin`
   - Password: (set via `NTFY_PASSWORD` env on server)
5. Save the account
6. Tap **+** to subscribe to a topic
7. Select the `ntfy.brickos.io` server
8. Enter topic: `sh-critical`
9. Repeat for: `sh-errors`, `sh-status`

### Troubleshooting

- **"Login failed"**: The password may contain special characters that get mangled. Reset with: `docker exec -e NTFY_PASSWORD='newpass' ntfy ntfy user change-pass admin`
- **No notifications**: Check Android battery optimization is disabled for the ntfy app
- **Delayed notifications**: ntfy uses WebSocket/SSE; ensure the connection isn't being killed by the OS

## Implementation Priority

| # | Fix | Effort | Impact | Priority |
|---|-----|--------|--------|----------|
| 1 | Deep health endpoint (`/health?deep=1`) | S | Critical | P0 |
| 2 | Container watchdog (systemd timer) | S | Critical | P0 |
| 3 | Compose project name isolation | XS | High | P0 |
| 4 | Daily heartbeat notification | XS | Medium | P1 |
| 5 | Backend self-diagnostics (startup + DB failure alerts) | M | High | P1 |
| 6 | Gatus TLS cert expiry check | XS | Low | P1 |
| 7 | Automated production DB backups + monitoring | M | High | P1 |
| 8 | Resource monitoring (disk, memory, CPU) | S | Medium | P2 |
| 9 | Standardized health contract (platform-level) | M | Medium | P2 |

## Open Questions

- [ ] Should the container watchdog auto-restart failed containers, or only alert? (Recommendation: alert + auto-restart with a cooldown to prevent restart loops)
- [ ] Should we add a read-only DB user for health checks to avoid connection pool pressure?
- [ ] Do we want Prometheus/Grafana long-term, or is the lightweight approach sufficient for a single VPS?
- [ ] Should Gatus also monitor internal Docker network endpoints (DB:5432, Redis:6379) via a sidecar?

## References

- [ADR-016: GDPR & Privacy Architecture](../adr/016-gdpr-privacy-architecture.md) (audit log, pgaudit)
- [Design-014: Admin Notification System](014-admin-notification-system.md) (ntfy + Telegram dual dispatch)
- [Deployment README](../deployment/README.md)
- Incident: 2026-03-22 production DB container disappearance
- ntfy docs: https://docs.ntfy.sh
- Gatus docs: https://gatus.io
