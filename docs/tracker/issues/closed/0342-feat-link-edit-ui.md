---
github_number: 342
title: "feat: link edit UI for affiliate page"
milestone: ux-and-onboarding
labels: [feat, P2]
---

## Problem

The API supports `PUT /api/v1/links/{id}` for editing links (target_url, title, is_active), but the SHI frontend affiliate page has no edit flow. Users cannot:
- Change the target URL of an existing link
- Edit the link title
- Deactivate/reactivate a link
- Set an expiration date

## Requirements

1. Edit button on each link in the affiliate page link list
2. Inline edit or modal with fields: target URL, title, is_active toggle, expires_at
3. Save calls `PUT /api/v1/links/{id}`
4. Deactivate shows confirmation dialog

## Blocked By

- #0338 (vanity code UX) -- related UX, should be consistent
- #0340 (link expiration) -- expiration date field depends on enforcement being implemented
