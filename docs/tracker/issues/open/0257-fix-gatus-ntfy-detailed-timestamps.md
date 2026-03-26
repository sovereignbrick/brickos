---
number: 257
title: "fix: Gatus/ntfy alerts — include full datetime stamp and detailed error info"
labels: [fix, ops, monitoring]
milestone: infrastructure
---

## Description

Current Gatus → ntfy alert messages lack sufficient detail. Improve the notification payload to include:

1. **Full datetime stamp** — ISO 8601 format with timezone (e.g., `2026-03-26T14:32:00+01:00`)
2. **Service name** — which endpoint/service failed
3. **Error detail** — HTTP status code, response body snippet, timeout info
4. **Duration** — how long the check took
5. **Consecutive failures** — how many checks failed in a row

## Current Format (example)

```
sovereign-health-backend is DOWN
```

## Desired Format (example)

```
[2026-03-26T14:32:00+01:00] sovereign-health-backend DOWN
Status: 502 Bad Gateway
Response time: 12340ms (timeout: 5000ms)
Consecutive failures: 3
Endpoint: https://api.sovereignhealth.io/api/health
```

## Requirements

- [ ] Update Gatus alerting config with detailed message template
- [ ] Include ISO 8601 timestamp with timezone in every alert
- [ ] Include HTTP status code and response snippet
- [ ] Include response time and threshold
- [ ] Include consecutive failure count
- [ ] Test with ntfy to verify formatting renders correctly on mobile
- [ ] Update both staging and production Gatus configs
