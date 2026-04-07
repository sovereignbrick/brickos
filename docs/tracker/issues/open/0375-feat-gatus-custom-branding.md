---
github_number: 375
title: "feat: Gatus status page with full BrickOS branding"
milestone: platform-admin-gui
labels: [feat, P3]
---

## Problem

Gatus at `status.brickos.io` shows the default Gatus logo and green color scheme. The title is "BrickOS Platform Status" (via config) but the visual style doesn't match BrickOS brand.

Current approach: nginx `sub_filter` CSS injection hides the logo and adds an orange square. This is fragile and limited.

## Options

1. Build a custom Gatus Docker image with modified frontend assets
2. Use Gatus API + custom status page frontend (more control, more work)
3. Keep current nginx injection approach (good enough for now)

## Decided

Defer to Sprint 032+. Current approach is functional. Full custom status page can be built as part of the platform admin service monitor (#0349).
