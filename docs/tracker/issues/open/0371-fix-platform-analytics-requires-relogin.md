---
github_number: 371
title: "fix: /platform/analytics requires re-login after navigating from /platform"
milestone: platform-admin-gui
labels: [fix, P1]
---

## Problem

Navigating from `/platform` (dashboard) to `/platform/analytics` sometimes triggers a re-login prompt. The session should persist across all `/platform/*` pages without interruption.

## Related

- #0370 (same root cause -- session persistence on brickos.io domain)
