---
github_number: 352
title: "feat: member management for org admins (invite, roles, remove)"
milestone: platform-admin-gui
labels: [feat, P2]
---

## Overview

Org admins (Owner, Tech Admin) can invite members, assign roles, and manage team.

## Requirements

- Invite by email (sends invitation link)
- Assign role on invite (editor, consumer, admin)
- View member list with: name, role, apps, last seen
- Change member role
- Disable/remove member (soft-delete, preserve data)
- Seat limit enforcement (reject invite if at capacity)

## Blocked By

- #0346 (admin layout)
- #0351 (org roles)
