---
github_number: 386
title: "fix: Members and Branding pages not accessible from platform sidebar"
milestone: platform-admin-gui
labels: [fix, P2]
---

## Problem

The Members page (/platform/members) and Branding page (/platform/branding) work when accessed directly via URL, but are not reachable from the platform sidebar navigation. Need to verify these nav items are visible for the correct roles (Members for org admins, Branding for org tech admin/owner).

## Note

Members is visible only for org admin role (not platform admin). Branding is visible only for org owner/tech admin. Since the current user is a platform admin without org context, these items are hidden by design. Need to either:
1. Show them for platform admin too (as they manage all orgs)
2. Or add org context switching in the platform admin
