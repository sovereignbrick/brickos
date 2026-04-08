---
github_number: 382
title: "feat: shared app switcher navigation bar across BrickOS apps"
milestone: platform-admin-gui
labels: [feat, P2]
---

## Overview

When on app.brickos.io, a top-level app switcher shows all available apps:

```
[Platform]  [Health]  [Links]  [Voice]    User Menu
```

Clicking an app navigates to its path (/platform, /sovereignhealth/, /sovereignlink, /sovereignvoice).

## Requirements

- Shared header component rendered above the app content
- Highlights the current app based on URL path
- Shows only apps the user has access to (based on tier/org)
- Can be injected via the platform layout or a shared React package

Reference: docs/design/015-brickos-unified-app-routing.md Section 4

## Blocked By

- #0381 (cookie domain -- needed for session persistence across app paths)
