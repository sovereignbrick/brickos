---
github_number: 346
title: "feat: admin GUI layout with role-based sidebar navigation"
milestone: platform-admin-gui
labels: [feat, P1]
---

## Overview

Create the foundational `/admin/` layout with:
- Collapsible sidebar (240px / 64px icon mode)
- Role-based nav filtering (BrickOS admin vs Owner vs Tech Admin vs Commercial Admin)
- BrickOS cube logo as app icon
- Title: "BrickOS Platform" / "BrickOS Platform - {OrgName}"

## Technical

- `/admin/layout.tsx` -- role check middleware, sidebar component
- `AdminContext` provider with `{ isPlatform, isOrg, orgId, role }`
- Sidebar sections: Overview, Manage, Commerce, Links, Content, AI, Ops, Security, Settings
- Each nav item has `visible` flag computed from role
- Dark theme (website baseline + SHI accent colors: orange, green, amber, red, blue)

## Design

Use the BrickOS website design as baseline aesthetic. Add SHI dashboard accent colors:
- Orange (#f97316) for primary actions and brand elements
- Green (#4ade80) for success/healthy states
- Amber (#fbbf24) for warnings
- Red (#ef4444) for errors/down states
- Blue (#60a5fa) for info/links

## Testing

- Role-based visibility unit tests (platform admin sees X items, tech admin sees Y)
- Responsive: sidebar collapses on mobile
- Dark theme only (no light mode)

## Blocked By

None (foundational -- everything depends on this)
