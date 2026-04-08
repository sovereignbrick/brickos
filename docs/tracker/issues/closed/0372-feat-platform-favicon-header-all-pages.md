---
github_number: 372
title: "feat: BrickOS favicon and header on all /platform/* pages"
milestone: platform-admin-gui
labels: [feat, P2]
---

## Problem

Some platform pages (e.g., `/platform/analytics`) still show the SHI favicon and header instead of BrickOS branding. The BrickOSHead component in the layout should apply to all child pages but may not be triggering on client-side navigation.

## Fix

Ensure the BrickOSHead useEffect runs on every platform page load, not just the initial layout render. May need to move favicon/title logic to a shared hook that runs per-page.
