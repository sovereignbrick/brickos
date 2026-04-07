---
github_number: 348
title: "feat: app registry page organized by pillar"
milestone: platform-admin-gui
labels: [feat, P2]
---

## Overview

Display all BrickOS apps organized by the 7 Pillars of Sovereign Life. Shows live status, version, environment, and key metrics per app.

## Requirements

- Group apps by pillar (Health, Technology, Attention, Finance, Data, Energy, Governance)
- Live apps: show version, prod/staging status, key metric (users, clicks, etc.)
- Planned apps: show milestone, description, "PLANNED" badge
- Actions per app: Open Console, Deploy (BrickOS admin), Settings

## Data Source

- App registry: hardcoded initially, later from `brickos.app_registry` table
- Version: from each app's `/health` endpoint
- Status: from service health aggregator

## Blocked By

- #0346 (admin layout)
- #0349 (service health -- for live status)
