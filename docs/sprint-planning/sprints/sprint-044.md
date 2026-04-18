# Sprint 044 -- Stabilization + Platform Quality

**Start:** 2026-04-19
**Previous:** Sprint 043 (v0.42.0, SHI Production Push)

## Goal

Stabilize the Sprint 043 production deploy, fix the nginx architecture
lessons learned, and clean up the technical debt identified during the
deployment.

## Carry-overs from Sprint 043

| # | Priority | Title | Why carried |
|---|----------|-------|-------------|
| #490 | P3 | Licensing dead code cleanup (items 2-8) | Deferred -- needs #539 first |
| #526 | P1 | brickos.io URL namespace (remaining) | Code shipped, production nginx needs brickos.io frontend |
| #539 | P2 | Migrate load_tier_features to brickos.tier_features | The real handler cutover |

## New issues from Sprint 043 retro

| # | Priority | Title | Source |
|---|----------|-------|--------|
| NEW | P1 | deploy.sh: use scp chunked transfer instead of docker save pipe | SSH broken pipe on every deploy |
| NEW | P1 | deploy.sh: fix image name mismatch (sovereignbrick/shi-api vs sovereign-health-backend) | Blocked production deploy |
| NEW | P2 | E2E: shared login session to avoid rate limiter cascade | 8/11 Playwright tests fail on staging |
| NEW | P2 | Platform audit logs endpoint returns 404 | Found during staging testing |
| NEW | P2 | Validate AI model IDs in seed migrations | claude-sonnet-4-5 broke Dr. Alex on staging + production |
| NEW | P3 | Nginx: single source of truth for backend route prefixes | 4 iterations to get right in Sprint 043 |

## Candidate work

### Infrastructure (P1)
- Fix deploy.sh transfer mechanism (chunked scp)
- Fix deploy.sh image tag resolution (compose file vs deploy script mismatch)
- Production nginx for app.brickos.io frontend (currently only API routes work)

### Platform quality (P2)
- #539: Migrate load_tier_features to brickos.tier_features
- Platform audit logs endpoint
- E2E test infrastructure (shared session, rate limiter bypass)
- AI model validation in seed/migration pipeline

### Cleanup (P3)
- #490 items 2-8 (after #539)
- Nginx route prefix list as shared config
