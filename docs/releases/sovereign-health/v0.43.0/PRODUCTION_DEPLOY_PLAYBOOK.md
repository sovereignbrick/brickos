# v0.43.0 Production Deploy Playbook

**Generated:** 2026-04-20
**Target:** Sprint 045 + 046 combined release
**Current prod version:** v0.42.0
**New prod version:** v0.43.0

## Pre-flight state (verified 2026-04-20)

- Cloudflare: `*.sovereignhealth.io` A record already points at VPS, proxied ON ✓
- Let's Encrypt: wildcard cert `sovereignhealth.io-wildcard` present on VPS ✓
- `develop` is 44 commits ahead of `main` (Sprint 045 + 046 + release notes)
- Working tree has 7 untracked files that need to be committed or ignored before `promote` (step 0 below)

---

## Step 0 — Clean working tree

```bash
cd /home/dev-comp/Projects/brickos

# Playwright session state is machine-local -- gitignore it
cat >> apps/health/sovereign-health/frontend/e2e/.gitignore <<'GITIGNORE'

# Playwright storage state (session cookies) -- machine-local, per #542
.auth/
GITIGNORE

# Commit the Sprint 044 issue docs + Sprint 044 Sovereign Voice design
# doc that have been sitting untracked
git add \
  apps/health/sovereign-health/frontend/e2e/.gitignore \
  docs/design/024-sovereign-voice-v1-gui-content-pipeline.md \
  docs/tracker/issues/open/0550-feat-org-branding-main-ui.md \
  docs/tracker/issues/open/0551-feat-per-org-email-templates.md \
  docs/tracker/issues/open/0552-feat-org-scoped-data-isolation-rls.md \
  docs/tracker/issues/open/0553-feat-practitioner-dashboard.md \
  docs/tracker/issues/open/0554-feat-per-org-ai-model-override.md

git commit -m "chore: commit Sprint 044 artifacts + gitignore Playwright .auth/"
git push origin develop

# Verify clean
git status --short  # should print nothing
```

## Step 1 — Promote develop to main

```bash
bash apps/health/sovereign-health/ops/deploy.sh promote
```

Expected output:

```
[DEPLOY] Promoting develop -> main...
[DEPLOY] develop merged into main
Next steps:
  1. Review: git log --oneline -5
  2. Deploy: bash ops/deploy.sh production --confirm
  3. Push:   bash ops/deploy.sh git
```

Script switches you back to `develop` after the merge. `main` now holds the release commit.

## Step 2 — Deploy backend to production

```bash
bash apps/health/sovereign-health/ops/deploy.sh production backend --confirm
```

Expected: ~8–10 min total (Rust build + chunked scp of the 200MB image + container restart + verify).

The `[FAIL] Verification -- some endpoints failed` line at the end is the pre-existing `/api/v1/health` URL bug in the verify script, same as staging. **Platform smoke test should pass** -- that's the signal the backend is actually healthy.

## Step 3 — Sanity check

```bash
curl -sS https://app.brickos.io/health | python3 -m json.tool
```

Expected:

```json
{
  "status": "ok",
  "service": "sovereign-health-backend",
  "version": "0.43.0",
  ...
}
```

If version is still `0.42.0`, something's wrong -- stop and investigate before the frontend deploy.

## Step 4 — Deploy frontend to production

```bash
bash apps/health/sovereign-health/ops/deploy.sh production frontend --confirm
```

Expected: ~5 min total (Next.js build + 76MB transfer + container restart).

## Step 5 — Push main to GitHub + GitLab mirror

```bash
bash apps/health/sovereign-health/ops/deploy.sh git
```

Pushes `main` to both GitHub and GitLab per the existing mirror config.

## Step 6 — Production smoke test

Open fresh incognito tabs (or use `curl`). Expected: 200s + correct content.

### Platform landing

| URL | Check |
|---|---|
| `https://app.brickos.io/login` | BrickOS cube icon, "Sign in to BrickOS Platform" |
| `https://app.brickos.io/health` | `{"version":"0.43.0", ...}` |
| `https://app.brickos.io/platform` | Redirects to /login (unauth) |

### Default SHI

| URL | Check |
|---|---|
| `https://app.sovereignhealth.io/login` | SHI logo, default branding |
| `https://app.sovereignhealth.io/api/v1/org/branding` | `is_org: false`, default BrickOS branding |

### API tests (no auth required)

```bash
curl -sS https://app.brickos.io/health | jq '.version'
curl -sS https://app.sovereignhealth.io/api/v1/org/branding | jq '.data.is_org'
curl -sS -o /dev/null -w "HTTP %{http_code}\n" -H "Accept: text/html" https://app.brickos.io/admin  # expect 308
curl -sS -o /dev/null -w "HTTP %{http_code}\n" -H "Accept: text/html" https://app.brickos.io/org   # expect 308
```

### White-label verification (if a production org exists)

Create or reuse a production org, then:

```
https://{slug}.brickos.io/login                       # admin login, org branding
https://{slug}.sovereignhealth.io/login               # end-user login, org branding
https://{slug}.brickos.io/platform/org                # admin plane landing
https://{slug}.sovereignhealth.io/dashboard           # end-user plane landing
https://{slug}.brickos.io/dashboard                   # plane gate -> sovereignhealth.io
https://{slug}.sovereignhealth.io/platform/org        # plane gate -> brickos.io
```

If no prod org exists yet: skip the white-label block. The default-domain tests (above) cover the no-org path.

## Rollback plan

### Backend rollback

If v0.43.0 backend misbehaves:

```bash
ssh root@72.61.154.115 "cd /opt/sovereign-health && \
  docker tag sovereignbrick/shi-api:rollback sovereignbrick/shi-api:production && \
  docker compose -f docker-compose.prod.yml up -d sovereign-health-backend-1 && \
  sleep 5 && curl -sS https://app.brickos.io/health | python3 -m json.tool"
```

The deploy script retags the previous image as `:rollback` before swapping. No data migration in this release, so a rollback is safe any time.

### Frontend rollback

Same pattern for the frontend:

```bash
ssh root@72.61.154.115 "cd /opt/sovereign-health && \
  docker tag sovereignbrick/shi-web:rollback sovereignbrick/shi-web:production && \
  docker compose -f docker-compose.prod.yml up -d sovereign-health-frontend-1"
```

### Nginx rollback

Nginx configs on the VPS have timestamped backups. Find the one to revert to:

```bash
ssh root@72.61.154.115 "ls -lt /etc/nginx/sites-available/*.bak-* | head -5"
ssh root@72.61.154.115 "cp /etc/nginx/sites-available/<file>.bak-<ts> /etc/nginx/sites-available/<file> && nginx -t && nginx -s reload"
```

---

## Known noise you can ignore

- `[FAIL] Image size mismatch: sovereignbrick/shi-*:... local=76MB remote=214MB` -- gzipped vs uncompressed
- `[FAIL] Verification -- some endpoints failed` -- the `/api/v1/health` URL in the verify step is wrong (backend serves at `/health`, not `/api/v1/health`)
- `[WARN] conflicting server name "www.brickos.io"` -- pre-existing, harmless
- `[WARN] duplicate MIME type "text/html" in /etc/nginx/sites-enabled/brickos-app.conf:229` -- also pre-existing

## Post-deploy

1. Rotate the CF API token tracked in #569 (pasted in chat during #560 bootstrap)
2. Close Sprint 046 retro (summary of 8 hotfix rounds + #578 fixture gap)
3. File Sprint 047 kickoff for Design 027 (multi-app URL prefixes)
4. Update `project_sprint046_ready.md` -> `project_sprint046_shipped.md` memory

## Escalation

If any step fails unexpectedly (not just the known noise above), stop. Do not proceed to the next step. Ping me with:
- Which step failed
- The full terminal output of the failing command
- The state on the VPS (`docker ps`, recent nginx error log, `systemctl status nginx`)

I'll diagnose before you retry.
