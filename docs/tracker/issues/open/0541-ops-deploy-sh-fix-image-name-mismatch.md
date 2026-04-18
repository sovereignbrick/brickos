---
number: 541
title: "ops: deploy.sh -- fix image name mismatch between script and compose"
milestone: "Sprint 044 -- White-Label Go-Live"
labels: [ops, deploy, p1]
created: 2026-04-18
priority: P1
estimate: 0.1d
blocked_by: []
---

deploy.sh builds `sovereignbrick/shi-api:latest` but docker-compose.prod.yml
on VPS references `sovereign-health-backend:latest`. Align to ADR-042 naming.

## Acceptance

- BACKEND_IMAGE in deploy.sh matches docker-compose.prod.yml and staging.yml
- No manual `docker tag` needed after deploy
- No dangling images under old name
