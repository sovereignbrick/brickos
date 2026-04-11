---
number: 516
title: "ops: [manual] deploy SHI api + frontend + website to staging"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [ops, sprint-041, phase-g, manual, deploy]
created: 2026-04-11
priority: P0
sprint: 041
phase: G
estimate: 0.3d
blocked_by: [492, 493, 494, 495, 496, 497, 498, 499, 500, 501, 502, 510, 511, 512, 513, 514, 515]
---

Deploy the Sprint 040 + Sprint 041 Phase A-F code to staging. This is the moment of truth -- if staging is broken, the sprint does not ship to production.

## Prerequisites

- All Phase A-F green (every checkbox above)
- Dev dev DB has Life Algorithm fixtures intact (for before/after comparison)
- Latest `main` is pushed to origin
- Staging credentials + SSH access ready

## Steps

1. Pre-flight: `git status --short` clean, `git log origin/main -1` matches expected SHA
2. Stash any untracked worktree files (per memory `feedback_stash_before_promote.md`)
3. Run: `bash apps/health/sovereign-health/ops/deploy.sh staging`
4. Watch the output for:
   - Docker build success
   - Image push success
   - Remote pull + compose up success
   - Post-deploy health check returning 200
5. Once deploy returns green, verify:
   - `curl https://api.staging.brickos.io/health` returns 200
   - `curl -I https://staging.sovereignhealth.io` returns 200
   - `curl -I https://app.staging.brickos.io` returns 200 (if configured)
6. Check container creation timestamps on the VPS:
   - `ssh root@vps 'docker ps --format "{{.Names}}\t{{.RunningFor}}"'` -- new containers should show "Up X seconds"

## Expected result

- All 3 services (api, frontend, website) running on staging with the new image
- Version endpoint returns `0.41.0` (Sprint 040 version)
- No startup errors in logs

## Who

User (manual). Claude can help monitor logs via ssh if needed.

## Verification

If ANY staging service fails to come up cleanly, file P0 bug and halt all subsequent Phase G issues.

Memory relevant: `feedback_preflight_staging_test.md`, `feedback_staging_build_numbers.md`, `feedback_version_bump_production.md`.
