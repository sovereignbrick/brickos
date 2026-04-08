---
github_number: 349
title: "feat: service health monitor with uptime timeline"
milestone: platform-admin-gui
labels: [feat, P1]
---

## Overview

Real-time health monitoring dashboard for all BrickOS services. BrickOS admin sees all environments. Self-hosted org tech admins see their own instance.

## Requirements

### Health Aggregator (Backend)

- Server-side poller that checks each service `/health` endpoint every 60s
- Caches results (no external API exposure for security)
- Stores 30-day uptime history in DB or in-memory ring buffer
- Returns: status (up/degraded/down), response time, version, uptime %

### Frontend

- Uptime timeline bar (24h or 7d or 30d) per service with color coding
- Container details table: version, CPU, memory, uptime
- Alert rules management (CRUD) -- all via ntfy + telegram
- Environment toggle (production / staging)

### Self-Hosted View

- Org tech admins see their own instance only
- Shows license validity, disk usage, backup status, update availability

## Monitoring

- Alert on aggregator failure itself (watchdog)
- Log every status change to audit log

## Testing

- Integration test: mock health endpoints, verify aggregation
- Alert rule CRUD tests

## Blocked By

- #0346 (admin layout)
