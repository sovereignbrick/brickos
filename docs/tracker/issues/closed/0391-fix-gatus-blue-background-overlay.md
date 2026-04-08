---
github_number: 391
title: "fix: Gatus status page still has blue background overlay"
milestone: platform-admin-gui
labels: [fix, P3]
---

## Problem

status.brickos.io favicon and app name are fixed, but:
- Blue background persists (Gatus uses its own CSS class that overrides our injection)
- Logo area is empty (hidden via CSS but no replacement shown)
- Dark background only shows at bottom of page

The Gatus SPA loads CSS dynamically which overrides the sub_filter injected styles.
Need more aggressive CSS specificity or a different approach.
