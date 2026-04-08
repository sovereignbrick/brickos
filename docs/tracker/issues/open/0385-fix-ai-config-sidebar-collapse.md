---
github_number: 385
title: "fix: clicking AI Config collapses the entire sidebar"
milestone: platform-admin-gui
labels: [fix, P2]
---

## Problem

When clicking "AI Config" in the platform sidebar, the entire left menu collapses instead of navigating to /platform/ai/config. The sidebar collapse behavior is being triggered on the AI config link click.

## Likely Cause

The AI Config link href `/platform/ai/config` may be conflicting with the sidebar collapse toggle, or the nav item path matching is incorrect.
