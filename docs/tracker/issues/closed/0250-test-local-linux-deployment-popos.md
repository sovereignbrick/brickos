---
number: 250
github_number: 428
title: "test: local Linux deployment on Pop!_OS laptop"
labels: [test, ops, infrastructure]
milestone: infrastructure
---

## Description

Validate the full local deployment workflow on a Pop!_OS laptop to ensure BrickOS can run entirely on a developer's local Linux machine without cloud dependencies.

## Test Plan

- [ ] Docker + Docker Compose installed and working on Pop!_OS
- [ ] Clone repo, `pnpm install`, `cargo build` — all dependencies resolve
- [ ] `docker compose up` — all containers start (backend, frontend, DB, Redis)
- [ ] Database migrations run successfully
- [ ] Frontend accessible on `localhost`
- [ ] Backend API responds on health endpoint
- [ ] Import a lab result PDF and verify parsing
- [ ] AI assistant (Dr. Alex) responds with local/proxy config
- [ ] PWA installable from local instance
- [ ] Full data round-trip: register → import → view markers → export

## Environment

- Pop!_OS (Ubuntu-based)
- Document any Pop!_OS-specific quirks (e.g., nvidia drivers, systemd vs cosmic)
- Note hardware minimum specs from real-world testing

## Deliverables

- [ ] Step-by-step local setup guide for Linux
- [ ] List of any issues/workarounds specific to Pop!_OS
- [ ] Confirm sovereign-link local mode works
