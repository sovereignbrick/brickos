---
github_number: 353
title: "feat: elevate users tab to platform admin"
milestone: platform-admin-gui
labels: [feat, P1]
---

## Overview

Move the SHI Users admin tab to `/admin/users` with cross-org filtering for BrickOS admin. Existing functionality: search, role change, tier change, license override.

## Changes

- Route: `/admin/users` (BrickOS admin only)
- Add org filter dropdown
- Reuse existing `users-tab.tsx` component with platform context
- Existing API endpoints: `GET /admin/users`, `PUT /admin/users/{id}/role`, etc.

## Blocked By

- #0346 (admin layout)
