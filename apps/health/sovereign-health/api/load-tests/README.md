# K6 Load Tests -- Sovereign Health API

## Prerequisites

K6 must be installed: https://k6.io/docs/getting-started/installation/

```bash
# Verify installation
k6 version
```

## Test Scripts

| Script | Auth | Description |
|---|---|---|
| `baseline.js` | No | Public endpoints (health, search, demo, tiers) with ramp profile |
| `health.js` | No | Minimal smoke test (health + hello endpoints only) |
| `api.js` | Yes | Full authenticated API (login, zones, markers, measurements, etc.) |

## Quick Start

```bash
# Smoke test (local Docker, 2 VUs, 10s)
k6 run --duration 10s --vus 2 load-tests/baseline.js

# Full baseline with ramp profile (local)
k6 run load-tests/baseline.js

# Against staging
k6 run -e API_URL=https://api-demo.sovereignhealth.io load-tests/baseline.js

# Authenticated test against staging
k6 run \
  -e BASE_URL=https://api-demo.sovereignhealth.io \
  -e EMAIL=demo@sovereignhealth.io \
  -e PASSWORD=SovereignDemo1 \
  load-tests/api.js
```

## Using Make Targets

```bash
make load-smoke    # k6 smoke (health.js, 1 VU, 10s)
make load-test     # k6 load (health.js, 50 VUs, 2 min)
```

## Test Profiles

### baseline.js Ramp Profile
- 0-30s: ramp to 10 VUs
- 30s-1m30s: steady at 10 VUs
- 1m30s-1m40s: ramp down to 0

### Thresholds
- `http_req_duration`: p(95) < 500ms
- `http_req_failed`: < 1% error rate
- `health_duration`: p(95) < 100ms
- `search_duration`: p(95) < 500ms

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `API_URL` / `BASE_URL` | `http://localhost:8080` | API base URL |
| `EMAIL` | `demo@sovereignhealth.io` | Login email (api.js only) |
| `PASSWORD` | `SovereignDemo1` | Login password (api.js only) |

## Output

```bash
# JSON output for CI
k6 run --out json=results.json load-tests/baseline.js

# Summary export
k6 run --summary-export=summary.json load-tests/baseline.js
```
