# ADR 032: GitLab as backup mirror for code sovereignty

**Status:** Accepted
**Date:** 2026-04-04
**Context:** Sprint 022 -- platform presence

## Context
All source code lives on GitHub (github.com/sovereignbrick/brickos). For a platform named "Sovereign", having a single point of failure for code hosting contradicts the sovereignty principle. GitHub outages, account restrictions, or policy changes could block development and deployment.

## Decision
Maintain GitLab (gitlab.com/sovereignbrick/brickos) as an automatic backup mirror:

- `deploy.sh` pushes to both `origin` (GitHub) and `gitlab` (GitLab) on every deploy
- Both `main` and `develop` branches are mirrored
- GitLab remote configured in every local clone via `git remote add gitlab`
- GitLab uses a separate access token (`glpat-*`) from GitHub

## Alternatives Considered
- **Self-hosted Gitea**: Rejected for now -- adds VPS maintenance burden. GitLab SaaS is zero-ops.
- **Codeberg (non-profit)**: Considered as a more sovereign option. GitLab chosen for CI/CD capabilities if needed later.
- **GitHub only**: Rejected -- single point of failure for a sovereignty-focused platform

## Consequences
- Code is always available from two independent platforms
- Deploy script handles dual-push automatically -- no manual step
- If GitHub is blocked, development can continue via GitLab
- Minor overhead: two tokens to manage, dual push adds ~5s per deploy
- Future: GitLab CI/CD can serve as backup CI if GitHub Actions remain disabled for the brickos-apps account
