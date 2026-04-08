---
github_number: 370
title: "fix: session drops when navigating between /platform and SHI pages on brickos.io"
milestone: platform-admin-gui
labels: [fix, P1]
---

## Problem

When logged in on `demo.brickos.io/platform`, navigating to SHI pages (`/affiliate`, `/dashboard`) causes "Session expired" and forces re-login. The auth cookie is set but SHI app pages fail to read it correctly when accessed via the brickos.io domain.

## Root Cause

The SHI auth context and the platform admin share the same cookie (`auth_token`) but the SHI app's client-side auth guard may be checking domain/origin or the cookie path isn't matching correctly across the nginx rewrite boundaries.

## Fix

Investigate and fix cookie persistence across `/platform/*` and `/*` (SHI) routes when both are served by the same Next.js app on the brickos.io domain. May need to ensure cookie `path=/` and `sameSite=lax` are consistently applied.
