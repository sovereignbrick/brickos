---
github_number: 334
title: "feat: BrickOS admin panel - service dashboard with health monitoring"
milestone: infrastructure
labels: [feat, P1]
---

## Vision

The BrickOS admin panel should provide a unified dashboard showing all apps and services across both production and demo environments, with real-time health status indicators.

## Requirements

### Service Registry
Display all BrickOS services in a grid/table:

| Service | Production | Demo/Staging |
|---------|-----------|-------------|
| SHI Backend API | green | green |
| SHI Frontend | green | green |
| Sovereign Link (redirect) | green | yellow |
| Sovereign Voice (NOSTR) | green | -- |
| PostgreSQL | green | green |
| Redis | green | green |
| Gatus (monitoring) | green | green |
| ntfy (notifications) | green | green |

### Health Indicators
- **Green**: service up, response time < threshold, no errors in last hour
- **Yellow**: service up but degraded (slow response, elevated error rate, high memory)
- **Red**: service down or critical errors

### Data Sources
- **Gatus**: Already running on VPS -- has health check data for all services. Integrate via Gatus API or embed Gatus dashboard.
- **ntfy**: Already configured for deploy notifications and alerts. Wire alerts from the dashboard to ntfy channels.
- **Docker stats**: Container CPU, memory, restart count from Docker API on VPS.

### Dashboard Features
1. **Overview grid**: All services at a glance with traffic light status
2. **Per-service detail**: Click into a service to see uptime %, latency chart, recent incidents
3. **Environment toggle**: Switch between production / staging / all
4. **Version display**: Current deployed version for each service
5. **Alert config**: Configure ntfy notification thresholds per service (e.g., alert if response > 500ms)
6. **Uptime history**: 30-day uptime percentage per service

### Technical Approach
- Server-rendered admin page at `/admin/services` (or dedicated BrickOS admin app)
- Backend: aggregate data from Gatus API + Docker stats + version endpoints
- Polling interval: 60s for status, 5min for historical charts
- Store incident history in `brickos.service_incidents` table

## Existing Infrastructure
- Gatus: running on VPS at port 8082, monitors all endpoints
- ntfy: running on VPS, channels for deploy + alerts
- Each service exposes `/health` endpoint with version info
- Deploy script already posts to ntfy on success/failure
