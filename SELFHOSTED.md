# Sovereign Health -- Self-Hosted Install

Run the full Sovereign Health app on your own Linux box. Everything stays local: your measurements, your data, your hardware. No cloud account required.

**License:** AGPL-3.0.
**Supported:** Pop!_OS / Ubuntu 22.04+ / Debian 12+ / Fedora 38+. Other Linux flavors work if Docker does.
**Hardware:** 4 GB RAM minimum, 10 GB free disk, amd64 CPU.

---

## Quick start

```bash
git clone https://github.com/sovereignbrick/brickos.git
cd brickos
./sh-install.sh
```

That's it. If Docker isn't installed yet, the script detects that and offers to install it for you (uses the official `get.docker.com` script; requires sudo). Decline if you prefer to install Docker yourself -- the script prints the exact `apt` / `dnf` commands for your distro.

After ~2 minutes:

```
============================================================
  Sovereign Health is running.

    Open:  http://localhost:3000

  The first account you create will be promoted to admin.
============================================================
```

Open http://localhost:3000, click **Create account**, sign up with any email + password. You're now the admin of your own instance.

> **Email address can be fake.** Self-host mode has no outbound email -- signup is auto-verified internally, so ignore the "verification email sent" message on the confirmation screen and just log in with the credentials you entered. Password reset is also disabled (no email = no reset link); to recover a forgotten password, edit the DB directly or re-run `./sh-install.sh --uninstall` + wipe `shi-pgdata`.

---

## What you get

- **Biomarker tracker.** Log blood panels, monitor trends, visualize health zones, set personal thresholds.
- **Data import.** Upload lab PDFs; parsed into structured measurements.
- **Full data ownership.** PostgreSQL in a local Docker volume. Export anytime.
- **PWA.** Install as a desktop / mobile app via your browser's install prompt.
- **Dark theme, EN + DE localization, offline-capable.**

### What you don't get (by default)

- **Dr. Alex AI chat** -- disabled until you add an Anthropic key or enable local AI. See "Adding AI" below.
- **Email sending** -- signup auto-verifies; password reset is disabled. Add Mailgun credentials if you want emails.
- **Billing / tiers** -- every self-host user is on the unlimited "core" tier.

---

## Adding AI (optional)

Dr. Alex chat + AI-assisted lab import need an LLM provider.

### Option 1: Anthropic API (cloud, recommended)

```bash
sudo vim /etc/sovereign-health/.env
# Set:
#   AI_PROVIDER=anthropic
#   ANTHROPIC_API_KEY=sk-ant-...
docker compose -p sovereign-health --env-file /etc/sovereign-health/.env \
  -f apps/health/sovereign-health/ops/docker-compose.selfhosted.yml restart backend
```

Get a key at https://console.anthropic.com/ -- the free tier is enough for personal use.

### Option 2: Local Ollama (fully offline)

```bash
./sh-install.sh --with-ai       # bundles Ollama alongside the main stack
```

First startup downloads the default model (`llama3.1:8b`, ~4.7 GB). Use `OLLAMA_MODEL=llama3.2:3b` in `.env` for smaller / faster / CPU-only.

**Note:** Sprint 052 ships the Ollama container + env plumbing. The Dr. Alex adapter that actually talks to Ollama (instead of Anthropic) lands in Sprint 053 -- until then, `AI_PROVIDER=ollama` gives you a running Ollama you can point external tools at, but Dr. Alex chat still needs Anthropic. If you want Dr. Alex today, use Option 1.

---

## Configuration

Your config lives at `/etc/sovereign-health/.env`. Every setting is documented inline. After editing, restart the backend:

```bash
docker compose -p sovereign-health --env-file /etc/sovereign-health/.env \
  -f apps/health/sovereign-health/ops/docker-compose.selfhosted.yml restart backend
```

Key settings you might touch:

| Variable | Default | Purpose |
|---|---|---|
| `DB_PASSWORD` | auto-generated | Postgres password. Don't change after install unless you're also migrating data. |
| `JWT_SECRET` | auto-generated | Rotates = invalidates all sessions. |
| `ENCRYPTION_KEY` | auto-generated | Rotates = measurements become unreadable. **Back this up.** |
| `FRONTEND_URL` | `http://localhost:3000` | Override if fronting with nginx/Caddy on a custom domain. |
| `ANTHROPIC_API_KEY` | blank | See "Adding AI" above. |
| `MAILGUN_API_KEY` + `MAILGUN_DOMAIN` | blank | Only set if you want real email sends. |

---

## Managing your install

```bash
./sh-install.sh --upgrade     # pull latest images + restart
./sh-install.sh --uninstall   # stop + remove containers (data volumes preserved)

# Manual compose commands
docker compose -p sovereign-health logs -f backend         # tail backend logs
docker compose -p sovereign-health logs -f frontend        # tail frontend logs
docker compose -p sovereign-health ps                      # container status
docker compose -p sovereign-health down                    # stop stack (data kept)
docker compose -p sovereign-health down -v                 # stop + WIPE ALL DATA
```

### Backup

Your data lives in three Docker volumes. Back them up:

```bash
# PostgreSQL dump (structured, portable across versions)
docker exec sovereign-health-db-1 pg_dump -U sovereign_health sovereign_health \
  > sovereign-health-$(date +%Y%m%d).sql

# Uploads + generated reports (optional -- they can be regenerated from the DB)
docker run --rm -v sovereign-health_shi-uploads:/data -v "$PWD":/backup alpine \
  tar czf /backup/uploads-$(date +%Y%m%d).tar.gz -C /data .
docker run --rm -v sovereign-health_shi-reports:/data -v "$PWD":/backup alpine \
  tar czf /backup/reports-$(date +%Y%m%d).tar.gz -C /data .
```

Store backups somewhere OFF the same machine (external drive, encrypted cloud, another household laptop). Your `ENCRYPTION_KEY` in `/etc/sovereign-health/.env` must be backed up too -- without it, the measurement data in the dump is unreadable.

### Restore

```bash
# Reinstall clean
./sh-install.sh --uninstall && ./sh-install.sh
# Stop backend (so no writes during restore)
docker compose -p sovereign-health stop backend
# Restore DB
cat sovereign-health-20260423.sql | docker exec -i sovereign-health-db-1 \
  psql -U sovereign_health sovereign_health
# Put the ENCRYPTION_KEY from the old install into /etc/sovereign-health/.env
# Restart backend
docker compose -p sovereign-health start backend
```

---

## Exposing beyond localhost

Sovereign Health binds to `127.0.0.1:3000` and `127.0.0.1:8080` by default -- only reachable from the same machine. To access from your LAN or over Tor:

**LAN with nginx + self-signed TLS (recommended):**

```bash
# Install nginx + mkcert
sudo apt install -y nginx && sudo snap install mkcert --classic
mkcert -install && mkcert myhealth.lan

# /etc/nginx/sites-available/sovereign-health
server {
    listen 443 ssl http2;
    server_name myhealth.lan;
    ssl_certificate     /path/to/myhealth.lan.pem;
    ssl_certificate_key /path/to/myhealth.lan-key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
    }
    location ~ ^/(api|auth|admin|sovereign-health|settings|measurements|markers|trends|doctor-chat|user|health)(/|$) {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
    }
}
```

Then set `FRONTEND_URL=https://myhealth.lan` in `/etc/sovereign-health/.env` and restart backend.

**Tor hidden service:** see `apps/technology/sovereign-link/docs/self-hosting.md` for the same pattern applied to Sovereign Link.

---

## Troubleshooting

### "Cannot connect to the Docker daemon"

```bash
sudo systemctl start docker
sudo usermod -aG docker $USER && newgrp docker
```

### Port 3000 or 8080 already in use

Something else is listening. Find it:
```bash
sudo lsof -i :3000 -i :8080
```
Either stop the conflicting service or set different ports in the compose file (advanced).

### Backend loops restarting

```bash
docker compose -p sovereign-health logs backend --tail 50
```
Most common cause: missing `DB_PASSWORD`, `JWT_SECRET`, or `ENCRYPTION_KEY` in `/etc/sovereign-health/.env`. Rerun `./sh-install.sh` to regenerate.

### "AI provider is not configured" when clicking Dr. Alex chat

Expected if you haven't added an Anthropic key or enabled local AI. See "Adding AI" above.

### Signup says "verification email sent" but no email arrives

In OSS mode signup auto-verifies -- you don't need to wait for email. Just log in with the credentials you just created.

If you explicitly set `SHI_MODE=production` or added real Mailgun credentials, check your Mailgun dashboard for the bounce.

### Slow performance / high CPU

- Bundled Ollama is CPU-bound by default. Use a smaller model (`OLLAMA_MODEL=phi3:mini` or `llama3.2:3b`) or an external GPU via `nvidia-container-toolkit`.
- Postgres `shared_buffers` defaults are low. For 8 GB+ RAM boxes, add `-c shared_buffers=1GB` to the `db` service command list.

### Fedora / SELinux: volume mount permission denied

SELinux blocks Docker volume binds by default. Either:
```bash
sudo setenforce 0       # temporary (permissive mode)
```
Or add `:z` to volume mounts in the compose file (permanent; not documented here yet -- filed as Sprint 053 chore).

### Apple Silicon (M1/M2/M3) / Raspberry Pi 4-5

Docker Hub images are `linux/amd64` only today. Multi-arch (arm64) ships in Sprint 053. Until then:
- Pi 4/5: build locally with `docker-compose.selfhosted-build.yml` overlay.
- Mac: Docker Desktop emulates amd64 -- slower but works.

---

## What next

- **Import your first lab PDF:** Dashboard -> "+ Add measurement" -> "Import PDF".
- **Set personal thresholds:** Settings -> Reference Ranges.
- **Explore trends:** Trends -> pick a marker.
- **Learn the data model:** docs/design/ has 30+ architecture documents if you want to understand how it's built.

## Get help

- GitHub Issues: https://github.com/sovereignbrick/brickos/issues
- Source: AGPL-3.0, the code IS the documentation for anything this file doesn't cover.

---

*Privacy-first biomarker tracking. Your health data, your control.*
