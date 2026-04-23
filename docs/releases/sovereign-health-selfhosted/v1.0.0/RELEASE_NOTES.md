# Sovereign Health Self-Hosted v1.0.0

**Release date:** 2026-04-23
**Sprint:** 052 (Self-Hosted Sovereign Health)
**Tag:** `selfhosted/v1.0.0`
**Supported platforms:** Pop!_OS 24.04+, Ubuntu 22.04+, Debian 12+, Fedora 38+ (all `linux/amd64`; `arm64` ships v1.1.0)

---

## Highlights

- **One-command install.** `./sh-install.sh` from a fresh `git clone` → running on `http://localhost:3000` in ~2 minutes once Docker Hub images are pulled.
- **OSS-mode defaults that just work.** Signup auto-verifies. No Stripe required. No Mailgun required. No AI key required. You sign up, you're the admin, you start tracking biomarkers.
- **Optional local AI.** `./sh-install.sh --with-ai` bundles an Ollama container you can wire up (full Dr. Alex adapter Sprint 053). Or use your own Anthropic key for full Dr. Alex today.
- **Persistent Docker volumes.** Your data lives in `shi-pgdata`, `shi-uploads`, `shi-reports`. Back them up, move them across machines, own them.
- **Full install guide.** `SELFHOSTED.md` covers install, config, backup, restore, LAN exposure via nginx + mkcert, and 10+ troubleshooting recipes.

## Installation

```bash
git clone https://github.com/sovereignbrick/brickos.git
cd brickos
./sh-install.sh
```

That's the entire install. Open http://localhost:3000, sign up, you're admin.

## What you get

- Biomarker tracker (measurements, trends, zones, thresholds)
- Lab PDF import pipeline (parsed into structured rows)
- Data export (CSV, JSON, GDPR-format)
- PWA install (from your browser's install prompt)
- Dark theme, EN + DE locales
- Offline-capable for already-loaded data

## What's disabled in OSS mode (by design)

- Email sending (signup auto-verifies, password reset disabled)
- Stripe billing (all users on unlimited "core" tier)
- Dr. Alex chat **unless** you add an Anthropic API key
- Multi-tenant / multi-org features (single-operator install)

## Key files

| File | Purpose |
|---|---|
| `sh-install.sh` | One-shot installer |
| `SELFHOSTED.md` | Full install + config + troubleshooting guide |
| `apps/health/sovereign-health/ops/.env.example` | Every env var documented |
| `apps/health/sovereign-health/ops/docker-compose.selfhosted.yml` | Main stack (pulls from Docker Hub) |
| `apps/health/sovereign-health/ops/docker-compose.selfhosted-ai.yml` | Optional Ollama overlay |
| `apps/health/sovereign-health/ops/publish-docker-hub.sh` | Release script for maintainers |

## Known limitations

- **`linux/amd64` only.** ARM64 (Apple Silicon, Raspberry Pi) via multi-arch buildx ships `selfhosted/v1.1.0`.
- **Ollama prompt adapter** for Dr. Alex chat is deferred to Sprint 053. Today, `AI_PROVIDER=ollama` gives you a running Ollama you can point tools at; Dr. Alex itself still needs Anthropic.
- **SELinux on Fedora** requires either `sudo setenforce 0` or adding `:z` labels to volume mounts (Sprint 053 chore).
- **No automated upgrade migration safety.** `./sh-install.sh --upgrade` pulls latest images + restarts; user responsibility to back up first.

## Follow-ups for v1.1.0

- Multi-arch Docker Hub images (`linux/arm64` + `linux/amd64`)
- Ollama adapter in `services/doctor_chat.rs` (real `AI_PROVIDER=ollama` support for Dr. Alex)
- SELinux `:z` volume labels
- `sh-install.sh --backup` subcommand (wraps pg_dump + volume tar)
- `.deb` / `.rpm` native packages (wrap the compose + systemd)

## How to upgrade

```bash
./sh-install.sh --upgrade
```

Backs up your DB first:

```bash
docker exec sovereign-health-db-1 pg_dump -U sovereign_health sovereign_health \
  > sovereign-health-$(date +%Y%m%d).sql
```

## How to uninstall (keep your data)

```bash
./sh-install.sh --uninstall
```

Your data stays in Docker volumes. Reinstall any time with `./sh-install.sh`.

## How to uninstall (wipe everything)

```bash
./sh-install.sh --uninstall
docker volume rm sovereign-health_shi-pgdata sovereign-health_shi-uploads sovereign-health_shi-reports
sudo rm -rf /etc/sovereign-health
```

---

*Privacy-first biomarker tracking. Your health data, your control.*
AGPL-3.0 · https://github.com/sovereignbrick/brickos
