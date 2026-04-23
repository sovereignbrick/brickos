# Sovereign Health Self-Hosted v1.0.1

**Release date:** 2026-04-23 (same day as v1.0.0)
**Tag:** `selfhosted/v1.0.1`
**Type:** Hotfix -- both issues blocked every first-install on Docker Hub images.

---

## Fixes

### 1. `ENCRYPTION_KEY` must be hex, not base64

`sh-install.sh` generated the key via `openssl rand -base64 32`, producing a string with `+/=` that `brickos-crypto::Encryptor::new` rejected with `Invalid ENCRYPTION_KEY hex: InvalidHexCharacter { c: 'u', index: 2 }`. Backend panicked on every boot; health check hit the 120s install timeout.

Now: `openssl rand -hex 32` (64 hex chars, matches `hex::decode` expectation).

Recovery for an install that hit this on v1.0.0:

```bash
sudo sed -i "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$(openssl rand -hex 32)|" /etc/sovereign-health/.env
docker compose -p sovereign-health --env-file /etc/sovereign-health/.env \
  -f apps/health/sovereign-health/ops/docker-compose.selfhosted.yml restart backend
```

(No data loss -- encryption key was never successfully used to write anything.)

### 2. Frontend routes API calls to the right host on localhost

The Docker Hub `sovereignbrick/shi-web` image bakes `NEXT_PUBLIC_API_URL=https://api.sovereignhealth.io` at build time. Self-host users on `localhost:3000` inherited that URL, every fetch returned HTML, and signup/login blew up parsing HTML as JSON (`"unexpected character in line 1 column 1"`).

Now: `resolveApiBase()` in `frontend/src/lib/api.ts` routes `localhost` / `127.0.0.1` to `http://<host>:8080` at runtime while keeping the prod URL for `*.sovereignhealth.io`. One image serves both surfaces.

### 3. Signup UX clarity (docs only)

OSS mode already auto-verifies signup in the backend (`handlers/auth.rs` sets `email_verified = true, email_verified_at = NOW()` when `is_oss()`). The frontend still shows the SaaS "check your email to verify" message post-signup, which makes users think they need a real inbox.

Added a "**Email can be fake** -- just log in with the credentials you entered" callout to:

- `SELFHOSTED.md` quick-start
- `sh-install.sh` post-install banner

(Proper frontend fix -- suppress the verify screen when `NEXT_PUBLIC_MODE=oss` -- tracked for Sprint 053.)

## Upgrading

```bash
./sh-install.sh --upgrade
```

Then hard-refresh your browser (Ctrl+Shift+R) so the new frontend bundle replaces the cached one.

## By the numbers

- **Commits:** 3 on develop, merged to main
- **Lines changed:** ~10 code, ~20 docs
- **Docker Hub images pushed:** `sovereignbrick/shi-web:1.0.1` + `:latest`
- **Time from first bug report to fix-pushed-to-Hub:** ~2 hours
