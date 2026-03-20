# Design: Admin Notification & Monitoring System

**Issue:** Backlog
**Milestone:** Operations / Observability
**Status:** Draft
**Date:** 2026-03-20

## Problem

BrickOS has **no admin notification system**. Critical events — new user signups, purchases, errors, failed deploys, backup failures — happen silently. The only way to discover them is to manually check the admin dashboard, server logs, or database. This is unacceptable for a production SaaS with real customers.

### What's missing today

| Event | Current visibility | Risk |
|---|---|---|
| New user signup | None — discovered via admin dashboard | Missed onboarding opportunities |
| New subscription purchase | Stripe dashboard only | Delayed fulfillment awareness |
| Payment failure | Stripe webhook logs | Revenue loss goes unnoticed |
| API error spike | Server logs only (must SSH in) | Downtime undetected |
| Backup failure | Cron job exits silently | Data loss risk |
| Deploy failure | Terminal output during deploy | If deploy runs unattended, failure is invisible |
| Security event (brute force, suspicious login) | audit_log table only | Active attacks go undetected |
| Certificate expiry | None | Surprise downtime |
| Disk/memory pressure | None | Gradual degradation until crash |

### What exists in the codebase

- **Stripe/Strike webhook receivers** (`billing.rs`, `billing_btc.rs`) — process incoming payment events but don't notify anyone
- **Contact form email** (`contact.rs`) — sends admin an email when someone submits the contact form
- **Audit log** (`audit_log` table) — stores events but no alerting on them
- **`tracing::warn!` / `tracing::info!`** — logs to stdout, not forwarded anywhere

## Design Goals

1. **Sovereign-first** — self-hosted, no dependency on third-party SaaS for critical alerting
2. **Simple** — HTTP POST to send a notification, no complex message brokers
3. **Channel separation** — different topics for different severity/domain (critical vs info vs billing)
4. **Mobile push** — admin gets push notifications on phone for critical events
5. **Platform-level** — works for BrickOS platform + all apps, not just Sovereign Health
6. **Composable** — monitoring tools (Uptime Kuma, Healthchecks) can feed into the same notification channels

## Tool Evaluation

### Notification backends

| Tool | Self-hosted | REST API | Mobile push | Topics/channels | Complexity | Verdict |
|---|---|---|---|---|---|---|
| **ntfy** | Yes (Go binary/Docker) | `curl -d "msg" server/topic` | iOS + Android (F-Droid) | Topics created on the fly | Minimal | **Recommended** |
| **Gotify** | Yes (Go/Docker) | Token-auth REST | Android only (no iOS) | "Applications" as channels | Low | Good but no iOS |
| **Telegram Bot** | No (Telegram servers) | Bot API with token | Telegram app | Forum topics in supergroup | Low | Not sovereign |
| **Matrix/Element** | Yes (Synapse/Conduit) | Client-Server API | Element app (iOS+Android) | Rooms as channels | High (needs Postgres, RAM) | Overkill |
| **Mattermost** | Yes (Go/Docker) | Webhooks + REST | iOS + Android | Native channels | Medium-High | Overkill for notifications |
| **Signal (signal-cli)** | Partial (needs phone #) | REST wrapper available | Signal app | Groups (limited) | Medium | Fragile, account bans |
| **Apprise** | Yes (Python/Docker) | REST | Routes to 130+ services | Tag-based routing | Low | Best as aggregation layer |

### Monitoring tools (complementary)

| Tool | Purpose | Notification output | Self-hosted |
|---|---|---|---|
| **Uptime Kuma** | HTTP/TCP/DNS uptime monitoring | 78+ integrations (ntfy, Telegram, email) | Yes (Node/Docker) |
| **Healthchecks.io** | Dead man's switch / cron heartbeat | 25+ methods (webhook, ntfy, email) | Yes (Python/Docker) |
| **Grafana Alerting** | Metric-based alerting (CPU, latency, error rates) | Webhook, email, Telegram, etc. | Yes (already common in stacks) |

## Recommended Architecture

### Notification flow: ntfy → Telegram

The system uses a **two-layer architecture**:

1. **ntfy (self-hosted)** — sovereign notification hub. All events flow through ntfy first. Acts as the backend, message store, and fallback if Telegram is down.
2. **Telegram (primary UI)** — where admins actually read and discuss notifications. ntfy forwards to Telegram automatically. Multiple Telegram accounts can join the admin group.

**Why this order?**
- ntfy is sovereign and always available (runs on your VPS)
- Telegram is where you already are — better UX for reading, discussing, and reacting to events
- If Telegram goes down, ntfy still captures all events and pushes to your phone via the ntfy app (fallback)
- ntfy has **built-in Telegram forwarding** — no custom bridge needed

### ntfy → Telegram integration

ntfy supports **upstream actions** on published messages. But the cleanest approach is ntfy's **UnifiedPush + webhook** feature or simply configuring ntfy to forward to Telegram on the server side.

**Option 1: ntfy server-side forwarding (recommended)**

ntfy supports `upstream-base-url` for push relay, but for Telegram the simplest path is:

Each ntfy topic can have a **webhook subscription** configured via the ntfy CLI or API. When a message arrives on a topic, ntfy POSTs it to a webhook URL — which can be a small relay script that formats and sends to the Telegram Bot API.

```bash
# Subscribe a topic to forward to Telegram via webhook
# (runs as a background process or systemd service)
ntfy subscribe \
  --from-config \
  sh-critical \
  'curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -d chat_id=${CHAT_ID} \
    -d message_thread_id=${CRITICAL_TOPIC_ID} \
    -d parse_mode=HTML \
    -d text="🔴 <b>${title}</b>%0A${message}"'
```

**Option 2: Dual-dispatch from Rust API**

The Rust `NotificationService` sends to both ntfy and Telegram simultaneously. Simpler code, no relay process, but Telegram is no longer downstream of ntfy — they're parallel.

**Option 3: Apprise as bridge**

Deploy Apprise between ntfy and Telegram. Apprise subscribes to ntfy topics via SSE and forwards to Telegram. Adds a dependency but supports 130+ other services if needed later.

**Recommendation:** Start with **Option 2 (dual-dispatch)** for simplicity. If you later want monitoring tools (Gatus, Healthchecks) to also appear in Telegram without configuring each one individually, switch to Option 1 (ntfy as central hub with webhook forwarding).

### Telegram setup: bot + admin group

**One bot, one supergroup with forum topics:**

| Component | Purpose | Setup |
|---|---|---|
| **@BrickOSBot** | Sends all automated messages | Created via @BotFather, added to group as admin |
| **BrickOS Admin** (supergroup, forum-enabled) | Admin notification hub | Private group, forum mode ON |
| → Topic: 🔴 Critical | Downtime, security, data loss | `message_thread_id` for critical |
| → Topic: ⚠️ Errors | 5xx errors, failed jobs | `message_thread_id` for errors |
| → Topic: 💳 Billing | Subscriptions, payments, cancellations | `message_thread_id` for billing |
| → Topic: 👤 Users | Signups, verifications, MFA events | `message_thread_id` for users |
| → Topic: ℹ️ Info | Deploys, backups, config changes | `message_thread_id` for info |
| → Topic: 🏥 Status | Gatus uptime alerts | `message_thread_id` for status |

**Multi-account access:** Telegram groups support unlimited members. You join with all your Telegram accounts — personal, work, testing. Each account sees the same forum topics and can respond.

**Bot permissions:** The bot only needs "Send Messages" permission in the group. No admin rights, no message reading, no user management.

### Status page: `status.sovereignhealth.io`

Customer-facing outage communication is a **separate concern** from admin alerting. Customers don't join your Telegram group — they check a public status page.

**Tool: Gatus** (self-hosted, Go binary/Docker)

| Feature | Details |
|---|---|
| Health checks | HTTP, TCP, DNS, ICMP with configurable intervals and conditions |
| Status page | Auto-generated, shows uptime %, response times, incident history |
| Alerting | Built-in support for ntfy, Telegram, email, Slack, PagerDuty, etc. |
| Self-hosted | Single Go binary or Docker container |
| License | Apache 2.0 |

**Replaces Uptime Kuma** — Gatus does monitoring + status page in one tool.

**Domain strategy:**

| Domain | Scope | Content |
|---|---|---|
| `status.sovereignhealth.io` | Sovereign Health app | API, frontend, staging health |
| `status.brickos.io` (future) | BrickOS platform | All apps, shared infrastructure, platform services |

Both can run from the same Gatus instance with different endpoint groups. Start with `status.sovereignhealth.io`, add the platform-level page when more apps exist.

**Gatus configuration example:**

```yaml
# gatus-config.yaml
endpoints:
  - name: "Sovereign Health API"
    group: "sovereign-health"
    url: "https://app.sovereignhealth.io/health"
    interval: 60s
    conditions:
      - "[STATUS] == 200"
      - "[RESPONSE_TIME] < 2000"
    alerts:
      - type: ntfy
        send-on-resolved: true
      - type: telegram
        send-on-resolved: true

  - name: "Sovereign Health Frontend"
    group: "sovereign-health"
    url: "https://sovereignhealth.io"
    interval: 60s
    conditions:
      - "[STATUS] == 200"

  - name: "Staging API"
    group: "sovereign-health"
    url: "https://staging.sovereignhealth.io/health"
    interval: 300s
    conditions:
      - "[STATUS] == 200"

  - name: "PostgreSQL"
    group: "infrastructure"
    url: "tcp://localhost:5432"
    interval: 30s
    conditions:
      - "[CONNECTED] == true"

  # Future: BrickOS platform endpoints
  # - name: "BrickOS Auth Service"
  #   group: "brickos-platform"
  #   url: "https://auth.brickos.io/health"

alerting:
  ntfy:
    topic: "brickos-critical"
    url: "https://ntfy.brickos.io"
    priority: 5
    token: "${NTFY_TOKEN}"
  telegram:
    token: "${TELEGRAM_BOT_TOKEN}"
    id: "${TELEGRAM_CHAT_ID}"
```

### Full architecture diagram

```
┌──────────────────────────────────────────────────────────────┐
│  BrickOS API (Rust)                                          │
│                                                              │
│  ┌─────────────────────────────┐                             │
│  │  NotificationService trait  │                             │
│  │  .send(channel, priority,   │                             │
│  │        title, body, tags)   │                             │
│  └──────────┬──────────────────┘                             │
│             │                                                │
│    ┌────────┴────────────┐                                   │
│    │  Dual-dispatch:     │                                   │
│    │  ├─ NtfyBackend     │  HTTP POST to ntfy topics         │
│    │  └─ TelegramBackend │  HTTP POST to Bot API             │
│    └────────┬────────────┘                                   │
└─────────────┼────────────────────────────────────────────────┘
              │
      ┌───────┴───────┐
      ▼               ▼
┌───────────┐   ┌─────────────────────────────────────┐
│  ntfy     │   │  Telegram: BrickOS Admin Group      │
│  (self)   │   │  (forum-enabled supergroup)          │
│           │   │                                      │
│ Sovereign │   │  Topics:                             │
│ fallback  │   │  ├─ 🔴 Critical                     │
│ + store   │   │  ├─ ⚠️ Errors                       │
│           │   │  ├─ 💳 Billing                       │
│  ↓        │   │  ├─ 👤 Users                         │
│ ntfy app  │   │  ├─ ℹ️ Info                          │
│ (iOS/     │   │  └─ 🏥 Status                        │
│  Android) │   │                                      │
│ = fallback│   │  Members:                            │
│ if TG down│   │  ├─ @BrickOSBot (sends)              │
└───────────┘   │  ├─ Admin account 1                  │
                │  ├─ Admin account 2                  │
                │  └─ Admin account N                  │
                └─────────────────────────────────────┘

┌───────────────────────────────┐
│  Gatus (self-hosted)          │
│                               │
│  Monitors:                    │
│  ├─ API /health (60s)         │
│  ├─ Frontend (60s)            │
│  ├─ Staging (300s)            │
│  └─ PostgreSQL TCP (30s)      │
│                               │
│  Outputs:                     │
│  ├─ status.sovereignhealth.io │  ← Customer-facing status page
│  ├─ → ntfy /critical          │  ← Sovereign fallback
│  └─ → Telegram /Status topic  │  ← Admin reads here
│                               │
│  Future:                      │
│  └─ status.brickos.io         │  ← Platform-wide status
└───────────────────────────────┘

┌───────────────────────────────┐
│  Healthchecks.io (self)       │
│  Cron heartbeats:             │
│  ├─ DB backup                 │
│  ├─ Token cleanup             │
│  └─ Retention policy          │
│                               │
│  Missed ping:                 │
│  ├─ → ntfy /critical          │
│  └─ → Telegram /Critical      │
└───────────────────────────────┘

┌───────────────────────────────┐
│  deploy.sh                    │
│  Success/failure:             │
│  ├─ → ntfy /deploys           │
│  └─ → Telegram /Info          │
└───────────────────────────────┘
```

### Notification flow summary

```
Normal operation:
  Event → API → dual-dispatch → ntfy (stored) + Telegram (read here)
                                                     ↑
                                          Admin reads & discusses
                                          in Telegram group

Telegram down:
  Event → API → dual-dispatch → ntfy (stored + push to ntfy app)
                                  ↑
                       Admin reads in ntfy app (fallback)

VPS down (everything down):
  Gatus (if on separate host) → Telegram directly
  Otherwise: no notification (see Open Questions — monitoring VPS)
```

## Channel / Topic Design

### Notification channels

| Channel | ntfy topic | Priority | Content | Push behavior |
|---|---|---|---|---|
| `critical` | `brickos-critical` | 5 (urgent) | Downtime, security incidents, data loss, deploy failures | Immediate push with alarm sound |
| `errors` | `brickos-errors` | 4 (high) | Unhandled 5xx errors, failed background jobs, payment webhook failures | Push notification |
| `billing` | `brickos-billing` | 3 (default) | New subscriptions, cancellations, payment failures, refunds | Normal push |
| `users` | `brickos-users` | 3 (default) | New signups, email verifications, MFA enabled, account deletions | Normal push |
| `info` | `brickos-info` | 2 (low) | Deployments, backups completed, config changes, affiliate events | Silent / badge only |
| `heartbeat` | `brickos-heartbeat` | 1 (min) | Cron job pings, health check results | No push (dashboard only) |

### Platform-level vs app-level

For the BrickOS platform with multiple apps, prefix topics by app:

```
Platform-wide:
  brickos-critical         ← infrastructure alerts (VPS, DB, certs)
  brickos-deploys          ← deploy success/failure across all apps

Per-app (Sovereign Health):
  sh-billing               ← SH subscription events
  sh-users                 ← SH user signups
  sh-errors                ← SH application errors

Future apps:
  fin-billing              ← finance app events
  fin-users                ← finance app users
```

Admin subscribes to the topics they care about. Platform topics for infrastructure, app topics for business events.

## Implementation in Rust

### NotificationService trait

```rust
/// Notification priority levels (maps to ntfy priorities 1-5)
pub enum NotifyPriority {
    Min = 1,       // heartbeat, background
    Low = 2,       // info, deployments
    Default = 3,   // billing, users
    High = 4,      // errors, failed jobs
    Urgent = 5,    // critical, downtime
}

/// Notification channels
pub enum NotifyChannel {
    Critical,
    Errors,
    Billing,
    Users,
    Info,
    Heartbeat,
}

/// Backend-agnostic notification dispatch
pub trait NotificationService: Send + Sync {
    fn send(&self, channel: NotifyChannel, priority: NotifyPriority,
            title: &str, body: &str, tags: &[&str]) -> impl Future<Output = ()>;
}
```

### ntfy backend (primary)

```rust
/// ntfy implementation — just HTTP POST
pub struct NtfyBackend {
    client: reqwest::Client,
    base_url: String,           // e.g., "https://ntfy.brickos.io"
    token: Option<String>,      // auth token for self-hosted
    app_prefix: String,         // e.g., "sh" for Sovereign Health
}

impl NotificationService for NtfyBackend {
    async fn send(&self, channel: NotifyChannel, priority: NotifyPriority,
                  title: &str, body: &str, tags: &[&str]) {
        let topic = match channel {
            NotifyChannel::Critical => format!("{}-critical", self.app_prefix),
            NotifyChannel::Billing => format!("{}-billing", self.app_prefix),
            // ... etc
        };
        let url = format!("{}/{}", self.base_url, topic);
        let _ = self.client.post(&url)
            .header("Title", title)
            .header("Priority", (priority as u8).to_string())
            .header("Tags", tags.join(","))
            .bearer_auth(self.token.as_deref().unwrap_or(""))
            .body(body.to_string())
            .send()
            .await;
        // Fire-and-forget — notification failure must never break the request
    }
}
```

### Integration points in existing handlers

| Handler | Event | Channel | Example message |
|---|---|---|---|
| `auth.rs` → signup | New user registered | `users` | "New signup: user@example.com (referred by: abc123)" |
| `auth.rs` → login (MFA) | MFA enabled/disabled | `users` | "MFA enabled for user@example.com" |
| `billing.rs` → webhook | New subscription | `billing` | "New subscription: Insight tier, €24.99/mo — user@example.com" |
| `billing.rs` → webhook | Payment failed | `billing` | "Payment failed: user@example.com — card declined" |
| `billing.rs` → webhook | Subscription cancelled | `billing` | "Cancelled: user@example.com — Insight tier" |
| `billing_btc.rs` → webhook | BTC payment received | `billing` | "BTC payment: 50,000 sats — user@example.com" |
| `purge.rs` → purge | Account deleted | `critical` | "Account purged: user@example.com — all data deleted" |
| `export.rs` → export | GDPR data export | `info` | "Data export requested: user@example.com" |
| `contact.rs` → submit | Contact form | `info` | "Contact form: user@example.com — Subject: ..." |
| Error middleware | 5xx response | `errors` | "500 Internal Server Error: POST /api/measurements — {error}" |
| `deploy.sh` | Deploy success/failure | `critical` / `info` | "Deploy v0.22.0 to staging: SUCCESS" |
| Backup cron | Backup completed | `heartbeat` | Ping to Healthchecks.io |
| Backup cron | Backup failed | `critical` | "Backup FAILED: staging DB — exit code 1" |

### Fire-and-forget pattern

Notifications must **never** slow down or break the API request:

```rust
// In a handler:
let notify = app_data.notification_service.clone();
tokio::spawn(async move {
    notify.send(
        NotifyChannel::Billing,
        NotifyPriority::Default,
        "New subscription",
        &format!("{} subscribed to {} (€{}/mo)", email, tier, amount),
        &["money_with_wings", tier_slug],
    ).await;
});
// Handler continues immediately
```

## Deployment

### Docker Compose — monitoring stack

```yaml
# docker-compose.monitoring.yml
services:
  ntfy:
    image: binwiederhier/ntfy
    container_name: ntfy
    command: serve
    restart: unless-stopped
    ports:
      - "2586:80"
    volumes:
      - ntfy-cache:/var/cache/ntfy
      - ntfy-etc:/etc/ntfy
    environment:
      NTFY_BASE_URL: "https://ntfy.brickos.io"
      NTFY_AUTH_DEFAULT_ACCESS: "deny-all"
      NTFY_AUTH_FILE: "/etc/ntfy/auth.db"

  gatus:
    image: twinproduction/gatus:latest
    container_name: gatus
    restart: unless-stopped
    ports:
      - "8082:8080"
    volumes:
      - ./gatus-config.yaml:/config/config.yaml
      - gatus-data:/data
    environment:
      GATUS_CONFIG_PATH: "/config/config.yaml"
      NTFY_TOKEN: "${NTFY_TOKEN}"
      TELEGRAM_BOT_TOKEN: "${TELEGRAM_BOT_TOKEN}"
      TELEGRAM_CHAT_ID: "${TELEGRAM_CHAT_ID}"

  healthchecks:
    image: healthchecks/healthchecks:latest
    container_name: healthchecks
    restart: unless-stopped
    ports:
      - "8001:8000"
    environment:
      DB: sqlite
      SITE_ROOT: "https://hc.brickos.io"
      SECRET_KEY: "${HEALTHCHECKS_SECRET}"
    volumes:
      - healthchecks-data:/data

volumes:
  ntfy-cache:
  ntfy-etc:
  gatus-data:
  healthchecks-data:
```

### Nginx reverse proxy

```nginx
# ntfy — notification backend
server {
    server_name ntfy.brickos.io;
    location / {
        proxy_pass http://127.0.0.1:2586;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";  # needed for WebSocket/SSE
    }
}

# Gatus — public status page
server {
    server_name status.sovereignhealth.io;
    location / {
        proxy_pass http://127.0.0.1:8082;
    }
}

# Future: platform-level status page
# server {
#     server_name status.brickos.io;
#     location / {
#         proxy_pass http://127.0.0.1:8082;  # same Gatus instance, different endpoint group
#     }
# }
```

### Configuration (.env)

```bash
# Notification system — dual-dispatch (ntfy + Telegram)
NOTIFY_BACKEND=both                          # "ntfy", "telegram", "both", "none"

# ntfy (sovereign backend + fallback)
NTFY_BASE_URL=https://ntfy.brickos.io
NTFY_TOKEN=tk_xxxxxxxxxxxxxxxxxxxx           # auth token
NTFY_APP_PREFIX=sh                           # topic prefix for this app

# Telegram (primary UI — admin reads notifications here)
TELEGRAM_BOT_TOKEN=123456:ABC-xxx            # from @BotFather
TELEGRAM_CHAT_ID=-100xxxxxxxxxx              # supergroup ID (negative number)
TELEGRAM_CRITICAL_TOPIC_ID=2                 # forum topic thread IDs
TELEGRAM_ERRORS_TOPIC_ID=3
TELEGRAM_BILLING_TOPIC_ID=4
TELEGRAM_USERS_TOPIC_ID=5
TELEGRAM_INFO_TOPIC_ID=6
TELEGRAM_STATUS_TOPIC_ID=7
```

## Monitoring Stack Integration

### Gatus → ntfy + Telegram (replaces Uptime Kuma)

Gatus handles both monitoring AND the public status page. It sends alerts to ntfy (sovereign store) and Telegram (admin UI) simultaneously.

**Monitored endpoints:**

| Endpoint | Group | Interval | Conditions |
|---|---|---|---|
| `https://app.sovereignhealth.io/health` | sovereign-health | 60s | `[STATUS] == 200`, `[RESPONSE_TIME] < 2000` |
| `https://sovereignhealth.io` | sovereign-health | 60s | `[STATUS] == 200` |
| `https://staging.sovereignhealth.io/health` | sovereign-health | 300s | `[STATUS] == 200` |
| `tcp://localhost:5432` | infrastructure | 30s | `[CONNECTED] == true` |
| `https://ntfy.brickos.io` | infrastructure | 300s | `[STATUS] == 200` |

**Status page:** `status.sovereignhealth.io` — auto-generated by Gatus. Shows uptime %, response times, incident history. Publicly accessible, no auth required.

**Future: `status.brickos.io`** — same Gatus instance, additional endpoint group for platform services. Add when more apps exist under the BrickOS umbrella.

### Healthchecks.io → ntfy + Telegram

Dead man's switch for scheduled tasks. Each cron job pings its unique Healthchecks URL on success. If a ping is missed within the expected window, Healthchecks alerts.

**Monitored cron jobs:**

| Job | Expected schedule | Grace period |
|---|---|---|
| Database backup (staging) | Daily 02:00 UTC | 1 hour |
| Database backup (production) | Daily 03:00 UTC | 1 hour |
| Stale token cleanup | Daily 04:00 UTC | 2 hours |
| Retention policy enforcement | Daily 05:00 UTC | 2 hours |
| Affiliate auto-approval | Daily 06:00 UTC | 2 hours |

**Alert routing:** Missed ping → Healthchecks sends to both ntfy (`brickos-critical`) and Telegram (`🔴 Critical` topic).

### deploy.sh → ntfy + Telegram

Add to `deploy.sh` after deploy success/failure. Uses a helper function for dual-dispatch:

```bash
# Notification helper — sends to both ntfy and Telegram
notify() {
  local title="$1" body="$2" priority="${3:-3}" topic="${4:-info}" tags="${5:-}"

  # ntfy (sovereign store)
  curl -s \
    -H "Title: ${title}" \
    -H "Priority: ${priority}" \
    -H "Tags: ${tags}" \
    -d "${body}" \
    "${NTFY_BASE_URL}/sh-${topic}" || true

  # Telegram (admin UI)
  if [ -n "${TELEGRAM_BOT_TOKEN}" ]; then
    local thread_id_var="TELEGRAM_$(echo ${topic} | tr '[:lower:]' '[:upper:]')_TOPIC_ID"
    local thread_id="${!thread_id_var}"
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d chat_id="${TELEGRAM_CHAT_ID}" \
      -d message_thread_id="${thread_id}" \
      -d parse_mode=HTML \
      -d text="<b>${title}</b>%0A${body}" || true
  fi
}

# Usage in deploy.sh:
notify "Deploy ${VERSION} to ${ENV}" \
  "Deploy completed. Containers recreated at $(date -u)." \
  2 "info" "rocket,${ENV}"

# On failure:
notify "Deploy ${VERSION} to ${ENV} FAILED" \
  "Deploy failed at step: ${STEP}. Check server logs." \
  5 "critical" "warning,${ENV}"
```

## BrickOS Platform Channel — Cross-App Communication

For platform-wide announcements (changelog, maintenance windows, cross-app updates):

| Topic | Purpose | Publisher | Subscribers |
|---|---|---|---|
| `brickos-platform` | Platform changelog, breaking changes, maintenance | BrickOS core team | All app developers |
| `brickos-maintenance` | Scheduled maintenance windows | ops/deploy scripts | All admins |
| `brickos-releases` | New version announcements | bump-version.sh / release flow | All admins |

These are **announcement channels** — published manually or from CI/CD, not from application code. Useful when BrickOS grows beyond a single app.

## Implementation Phases

### Phase 1: Telegram group + ntfy + deploy notifications (3 pts)
1. Create Telegram bot via @BotFather (`@BrickOSBot`)
2. Create private supergroup "BrickOS Admin", enable forum mode, create 6 topic threads
3. Add bot to group as admin (send messages permission only)
4. Deploy ntfy container on VPS (Docker Compose)
5. Configure nginx reverse proxy + Let's Encrypt cert for `ntfy.brickos.io`
6. Create ntfy auth token
7. Add `notify()` helper to `deploy.sh` (dual-dispatch to ntfy + Telegram)
8. Install ntfy app on phone as fallback (subscribe to `sh-critical`)

### Phase 2: Status page + monitoring (2 pts)
1. Deploy Gatus container, configure endpoints (API, frontend, staging, Postgres)
2. Configure nginx for `status.sovereignhealth.io`
3. Let's Encrypt cert for status subdomain
4. Configure Gatus alerting to both ntfy and Telegram
5. Deploy Healthchecks.io, create checks for cron jobs
6. Update backup/cleanup scripts to ping Healthchecks on success

### Phase 3: API notification service (3 pts)
1. `NotificationService` trait + `NtfyBackend` + `TelegramBackend` implementations
2. Wire into `AppState` (injected via `app_data`)
3. Add dual-dispatch notifications to: auth signup, billing webhook, purge, contact form
4. Add 5xx error notification middleware with deduplication
5. Configuration via `.env`

### Phase 4: Platform expansion (1 pt, future)
1. Add `status.brickos.io` as second Gatus endpoint group
2. Add platform-level ntfy topics (`brickos-critical`, `brickos-deploys`)
3. Cross-app notification routing as new apps are added

**Total: 8-9 pts across 2 sprints**

## Open Questions

- [ ] ntfy subdomain: `ntfy.brickos.io` or `notify.brickos.io`?
- [ ] Should Gatus and Healthchecks run on the same VPS as production or a separate monitoring VPS? Same VPS means a VPS crash kills both the service and the monitoring. A separate $5/mo VPS for monitoring only could solve this.
- [ ] Rate limiting on error notifications: if the API starts throwing 500s in a loop, don't spam 1000 notifications. Deduplicate/throttle to max 1 per error type per 5 minutes?
- [ ] Healthchecks dashboard: publicly accessible at `hc.brickos.io` or behind auth?
- [ ] ntfy topic access control: one admin token for all topics, or per-topic tokens?
- [ ] Should the Telegram group be invite-link based (easy to add new accounts) or manual-add only (more secure)?
- [ ] `status.sovereignhealth.io` branding: should the status page show a custom logo/CSS, or is Gatus's default UI sufficient?
- [ ] When `status.brickos.io` launches, should it aggregate all app statuses or link to per-app status pages?

## References

- [ntfy.sh](https://ntfy.sh/) — Self-hosted push notifications (v2.19.2)
- [ntfy publishing API](https://docs.ntfy.sh/publish/) — Simple HTTP POST interface
- [Gatus](https://github.com/TwiN/gatus) — Self-hosted monitoring + status page
- [Healthchecks.io](https://github.com/healthchecks/healthchecks) — Self-hosted cron monitoring (v4.0)
- [Telegram Bot API](https://core.telegram.org/bots/api) — Forum topics via `message_thread_id`
- [Telegram Forum Topics](https://core.telegram.org/method/channels.createForumTopic) — Thread-based organization
- [Gotify](https://gotify.net/) — Alternative notification server (no iOS)
- [Apprise](https://github.com/caronc/apprise) — Notification aggregation layer (130+ services)
