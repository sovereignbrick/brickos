---
number: 565
title: "chore(nginx): decommission *.brickos.io + *.demo.brickos.io wildcard blocks (Option A)"
milestone: "Sprint 045 -- Domain Realignment"
labels: [chore, nginx, p1, white-label]
created: 2026-04-19
priority: P1
estimate: 0.25d
blocked_by: [561, 562, 563, 564]
parent: 559
phase: 5
---

Phase 5 of Design 025. Per user decision 2026-04-19: **Option A (remove)** for both staging and production, starting with staging. If staging removal causes no issues, apply to production.

## Scope

File: `apps/platform/brickos-website/ops/nginx-brickos-app.conf`

### Staging (`*.demo.brickos.io`) -- remove first

Delete the server block at lines ~321-388 (the `*.demo.brickos.io` wildcard added in Sprint 044 + my #556 Accept-header fix).

Also remove `*.demo.brickos.io` from the HTTP -> HTTPS server_name list at the bottom.

Reload nginx, verify `test-clinic.demo.brickos.io` returns default upstream behaviour (probably Cloudflare error page, or nothing, depending on how the IP resolves). That's fine -- staging is throwaway.

### Production (`*.brickos.io`) -- remove after staging confirmed

Delete the server block at lines ~245-312 (the `*.brickos.io` wildcard).

Remove `*.brickos.io` from the HTTP -> HTTPS redirect server_name list.

Cloudflare DNS: remove the `*.brickos.io` A record wildcard (optional -- leaving it means misdirected traffic gets served by app.brickos.io's catch-all, which 302s to `/platform`, effectively also acting as a soft dead-end).

## Acceptance

- After staging removal: `curl https://anything.demo.brickos.io/` returns no-such-server behaviour (or Cloudflare default); `*.demo.sovereignhealth.io` replacement works
- After prod removal: same for `*.brickos.io`; `*.sovereignhealth.io` replacement works
- No regressions on `app.brickos.io`, `demo.brickos.io`, `api.brickos.io`, `api-demo.brickos.io`, `status.brickos.io`
- `nginx -t` passes both times

## Rollback

If removal causes unexpected regressions, restore the block from git (`git show main:apps/platform/brickos-website/ops/nginx-brickos-app.conf`) -- the config is versioned.
