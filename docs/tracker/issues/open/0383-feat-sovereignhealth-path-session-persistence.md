---
github_number: 383
title: "feat: /sovereignhealth/ path routing with full session persistence"
milestone: platform-admin-gui
labels: [feat, P2]
---

## Problem

SHI app at app.brickos.io/sovereignhealth/ loads but session drops when navigating between pages. The nginx rewrite strips the prefix, but the SHI app's internal links point to / which bypasses the /sovereignhealth/ prefix.

## Requirements

1. Cookie domain set to .brickos.io (#0381)
2. SHI app internal navigation works under /sovereignhealth/ prefix
3. Login/logout flow works correctly on brickos.io domain
4. No session drops between SHI pages

## Approach Options

A. nginx rewrite (current) -- works for initial load but internal links break
B. Next.js basePath: 'sovereignhealth' -- requires separate build
C. Reverse proxy with URL rewriting in both directions

Reference: docs/design/015-brickos-unified-app-routing.md Section 3

## Blocked By

- #0381 (cookie domain)
