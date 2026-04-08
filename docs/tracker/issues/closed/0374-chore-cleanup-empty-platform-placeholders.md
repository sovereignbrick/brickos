---
github_number: 374
title: "chore: cleanup empty platform/ placeholder directories"
milestone: infrastructure
labels: [chore, P3]
---

## Problem

`platform/dashboard/` and `platform/website/` contain only placeholder README.md files and serve no purpose. They can cause confusion with the actual implementations at `apps/platform/brickos-website/` and `apps/health/sovereign-health/frontend/src/app/platform/`.

## Fix

Delete `platform/dashboard/` and `platform/website/`. Keep `platform/core-api/` (active Rust crate).
