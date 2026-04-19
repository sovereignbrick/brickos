---
number: 558
title: "ops: deploy.sh nginx sync is a silent no-op (sites-enabled is a stale copy)"
milestone: "Sprint 044 -- White-Label Go-Live"
labels: [ops, deploy, p1, bug]
created: 2026-04-19
priority: P1
estimate: 0.25d
blocked_by: []
---

`deploy.sh sync_compose_files()` scps `nginx-brickos-app.conf` to
`/etc/nginx/sites-available/brickos-app.conf` and then runs
`nginx -s reload`. But on the VPS today, `/etc/nginx/sites-enabled/brickos-app.conf`
is a PLAIN FILE COPY, not a symlink to sites-available. `nginx.conf`
includes `sites-enabled/*`, so the reload picks up the stale copy and
silently ignores the new config.

Discovered during #556 deploy on 2026-04-19: new `*.demo.brickos.io` and
`*.brickos.io` blocks were scp'd and `nginx -t` passed, but running
requests behaved exactly as the old config. `md5sum` revealed
sites-available and sites-enabled diverged by ~1.8KB.

## Fix (one-time on VPS)

```bash
ssh root@VPS
cp /etc/nginx/sites-enabled/brickos-app.conf /etc/nginx/sites-enabled/brickos-app.conf.bak-$(date +%s)
rm /etc/nginx/sites-enabled/brickos-app.conf
ln -s /etc/nginx/sites-available/brickos-app.conf /etc/nginx/sites-enabled/brickos-app.conf
nginx -t && nginx -s reload
```

Already applied manually on 2026-04-19 during #556 deploy.

## Fix in deploy.sh

In `sync_compose_files()`, after the scp of nginx configs, ensure
sites-enabled is a symlink:

```bash
ssh $VPS "[ -L /etc/nginx/sites-enabled/brickos-app.conf ] || (rm -f /etc/nginx/sites-enabled/brickos-app.conf && ln -s /etc/nginx/sites-available/brickos-app.conf /etc/nginx/sites-enabled/brickos-app.conf)"
```

Same idempotent fix for `sovereignhealth.conf`. Run before `nginx -t`.

## Acceptance

- `deploy.sh` idempotently ensures sites-enabled points at sites-available via symlink
- After any future nginx config change, a deploy run reflects the change after `nginx -s reload`
- Works whether sites-enabled is currently a file, stale symlink, or already correct

## Notes

- `sovereignhealth.conf` in sites-enabled may have the same issue -- audit when fixing
- This bug has been present since at least Sprint 043 (possibly earlier); nobody noticed because nginx changes during Sprint 044 (e.g. wildcard blocks) were edited directly on the VPS
