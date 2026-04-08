---
github_number: 358
title: "feat: elevate short links + analytics to platform with org scope"
milestone: platform-admin-gui
labels: [feat, P2]
---

## Overview

Move Sovereign Link management and click analytics to platform admin. Org admins see own org links. Includes click analytics charts (Recharts).

## Includes

- Link list with click stats (LATERAL JOIN, already implemented #0332)
- Campaign link creation
- Click analytics: time-series chart, top links, top countries, top referrers
- Org filter for BrickOS admin, auto-scoped for org admin

## Blocked By

- #0346 (admin layout)
- #0341 (click analytics API -- Sprint 030)
