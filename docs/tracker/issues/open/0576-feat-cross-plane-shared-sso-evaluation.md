---
number: 576
title: "feat(evaluate): shared SSO across planes -- decision gate, NOT Sprint 046 work"
milestone: "Sprint 047+ -- Backlog"
labels: [feat, backend, frontend, p3, admin, security]
created: 2026-04-20
priority: P3
estimate: 1.5d (if approved)
blocked_by: [568]
parent: design-026
status: deferred
---

Design 026 ships with **two sessions by default** (cookie per plane). This issue tracks the OPEN QUESTION of whether to add a cross-plane SSO handoff later, and is NOT scheduled for Sprint 046.

## When to revisit

- After v0.43.0 ships and real org admins start using both planes
- If >X% of org admins show repeat cross-plane logins per day (instrumentation needed first)
- If user feedback flags the double-login friction as a top-5 complaint

## Proposed implementation (if approved)

1. Backend: `POST /api/v1/auth/cross-plane-token` -- requires valid JWT, returns a short-lived (60s) single-use token scoped to the other plane
2. Frontend: "Admin" / "Open Sovereign Health" profile-menu links become:
   - Call `/api/v1/auth/cross-plane-token`
   - Redirect to `{other-plane}/auth/sso?t={token}`
   - `/auth/sso` endpoint exchanges token for a plane-scoped cookie, then redirects to the target path
3. Security hardening:
   - Token bound to origin IP + user-agent hash
   - Single-use (consume = delete)
   - 60-second TTL
   - Rate-limit issuance per user
   - CSRF protection on the exchange endpoint

## Tradeoffs documented

See Design 026 "Cross-plane SSO tradeoffs" section. Summary:
- **Pro**: one login for users who straddle both planes
- **Con**: extra endpoint, open-redirect risk, expanded blast radius on compromise

## Acceptance (when / if this ever runs)

- Users logged in on one plane can navigate to the other plane's profile-menu link and arrive without re-entering credentials
- No regression on non-admin users (they never see the cross-plane links)
- Security review signs off on the token + exchange flow
- Audit log captures every cross-plane session issuance

## Decision point

**Block on**: 30 days of production telemetry after v0.43.0 ships showing repeat cross-plane logins.
