---
number: 565
title: "feat: *.brickos.io restricted to admin plane (paired with plane gating in #564)"
milestone: "Sprint 045 -- Domain Realignment"
labels: [feat, nginx, frontend, p1, white-label]
created: 2026-04-19
priority: P1
estimate: 0.25d
blocked_by: [564]
parent: 559
phase: 5
---

Phase 5 of Design 025. `*.brickos.io` + `*.demo.brickos.io` wildcards STAY (serve per-tenant org admin UI) but the frontend gates which routes render based on plane (#564). This issue tracks the validation + any nginx-level cleanup.

**Note (2026-04-19):** originally this was "decommission the wildcards". User clarified: keep them, serve admin plane only. #564 does the frontend plane gating; this issue verifies the combined behaviour.

## Scope

### Nginx -- verify, no new changes

`nginx-brickos-app.conf` already has the `*.brickos.io` and `*.demo.brickos.io` server blocks (with my #556 Accept-header fix). No nginx changes needed for this issue -- the plane gating happens in the frontend via #564.

If the frontend plane gating decides to redirect cross-plane rather than 404, nginx also does nothing special -- the redirect is a client-side `router.replace` OR a response header from the Next.js route handler.

### Frontend (covered by #564)

Plane-detection + redirect/404 logic is in #564.

### Admin-only backend endpoints on `*.brickos.io`

Optional: gate backend endpoints like `/doctor-chat`, `/measurements`, etc. to require that the request hostname is `*.sovereignhealth.io` (or a resolved custom domain that's flagged end-user-plane). This is defense-in-depth; the frontend gating is the primary UX. Evaluate when #564 lands -- probably not worth the complexity unless we see misuse.

## Acceptance

- After #564 merges: visiting `{slug}.brickos.io/dashboard` redirects or 404s cleanly
- Org admin flows at `{slug}.brickos.io/org/*` work end-to-end
- End-user flows at `{slug}.sovereignhealth.io/dashboard` etc. work end-to-end
- No way to reach `/doctor-chat`, `/measurements`, `/dashboard` UI on `*.brickos.io`
- Test session: try bookmarking an end-user page on `*.brickos.io`, reload, verify graceful redirect

## Rollback

If plane gating causes issues with mixed-role users (someone who is both org admin and end user, wanting to context-switch), simplest rollback is to comment out the plane-gate redirect in `src/lib/plane.ts` and allow both planes to render anywhere. Cookies still work because each domain has its own scoped cookie.
