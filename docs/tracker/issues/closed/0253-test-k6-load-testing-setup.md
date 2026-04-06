---
number: 253
title: "test: evaluate K6 for load testing — PoC setup"
labels: [test, infrastructure, performance]
milestone: infrastructure
---

## Description

Evaluate and set up [K6](https://k6.io/) (by Grafana Labs) as the load testing tool for BrickOS APIs.

## Why K6

- JavaScript-based test scripts (familiar, version-controllable)
- CLI-first, integrates with CI/CD
- Built-in metrics + Grafana dashboard integration
- Open source, self-hosted — aligns with sovereign philosophy

## Scope

- [ ] Install K6 locally and in CI
- [ ] Write baseline load test scripts for critical endpoints:
  - `POST /api/auth/login` — auth flow
  - `GET /api/markers` — marker listing
  - `POST /api/imports` — file import
  - `GET /api/health` — health check
- [ ] Define performance thresholds (p95 latency, error rate)
- [ ] Run baseline test against staging
- [ ] Document results + establish performance budget
- [ ] Integrate into CI as optional step (e.g., nightly or pre-release)

## Deliverables

- [ ] `tests/load/` directory with K6 scripts
- [ ] `tests/load/README.md` with usage instructions
- [ ] Baseline performance report
