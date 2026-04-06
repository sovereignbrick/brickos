# Installation Report — Sovereign Health on Windows

**Date:** 2026-03-18
**Auditor:** Claude Code (automated)
**Related issue:** [#116 — extend Analysis tab with richer visualizations](https://github.com/sovereignbrick/brickos/issues/116)

---

## Summary

This report documents the current state of installing and running Sovereign Health on a **Windows PC** from the GitHub repository. As of this date, there is **no native Windows installer** — the application is deployed exclusively via Docker containers.

| Question | Answer |
|---|---|
| **Native Windows app (.exe / .msi)?** | No |
| **Electron / Tauri desktop build?** | No |
| **PWA support?** | Not yet (old design spec exists: `E-26_PWA_APP.md`) |
| **Docker-based self-hosting on Windows?** | Yes, via Docker Desktop + WSL2 |
| **StartOS package?** | Planned (`startos/` directory exists, currently empty) |

---

## Architecture Overview

Sovereign Health is a **web application** consisting of three Docker containers:

| Container | Technology | Purpose |
|---|---|---|
| **API** | Rust / Actix-Web | Backend REST API, auth, business logic |
| **Frontend** | Next.js 16 (Node.js) | Web UI (standalone output mode) |
| **PostgreSQL** | PostgreSQL + pgaudit | Data storage with audit logging |

All components are containerized and orchestrated via Docker Compose.

---

## Windows Installation Steps

### Prerequisites

| Requirement | Details |
|---|---|
| **OS** | Windows 10/11 (64-bit) |
| **WSL2** | Required — must be enabled before Docker Desktop install |
| **Docker Desktop** | v24+ with Docker Compose v2 (bundled) |
| **RAM** | 2 GB minimum available for containers |
| **Git** | For cloning the repository |

### Step 1 — Enable WSL2

```powershell
wsl --install
```

Restart the machine if prompted. Verify with:

```powershell
wsl --version
```

### Step 2 — Install Docker Desktop

1. Download Docker Desktop from https://www.docker.com/products/docker-desktop/
2. Run the installer — select **"Use WSL 2 instead of Hyper-V"**
3. Restart if prompted
4. Open Docker Desktop and confirm the engine is running

### Step 3 — Clone the Repository

```bash
git clone https://github.com/sovereignbrick/brickos.git
cd brickos/apps/health/sovereign-health
```

### Step 4 — Configure Environment

Copy the example environment file and configure for self-hosted (OSS) mode:

```bash
cp .env.example .env
```

Key environment variables:

| Variable | Value | Purpose |
|---|---|---|
| `SHI_MODE` | `oss` | Unlocks all features, no tier restrictions |
| `DATABASE_URL` | (set by compose) | PostgreSQL connection string |
| `JWT_SECRET` | (generate a secure random value) | Token signing |

Full configuration reference: `docs/src/getting-started/configuration.md`

### Step 5 — Build and Start

```bash
docker compose -f ops/docker-compose.selfhosted.yml up -d
```

This builds all images **locally from source** — no Docker registry access required.

### Step 6 — Verify

```bash
docker compose -f ops/docker-compose.selfhosted.yml ps
```

All three containers (api, frontend, postgres) should show status `Up`.

### Step 7 — Access

Open a browser and navigate to:

```
http://localhost:<frontend-port>
```

(Check `ops/docker-compose.selfhosted.yml` for the exposed port mapping.)

---

## OSS Mode vs SaaS Mode

| Aspect | OSS (`SHI_MODE=oss`) | SaaS (default) |
|---|---|---|
| **Features** | All unlocked | Tier-gated (Glimpse → Horizon) |
| **Measurements** | Unlimited | Tier limit |
| **Markers** | All available | Tier-dependent |
| **AI key** | User-provided (optional) | Platform-managed |
| **Registration** | Open by default | Controlled |

For self-hosting on a personal Windows PC, **`SHI_MODE=oss`** is the recommended setting.

---

## Production Considerations

For exposing the instance beyond localhost (e.g., on a home network or public internet):

| Concern | Recommendation |
|---|---|
| **HTTPS** | Use Caddy (automatic Let's Encrypt) or nginx + certbot |
| **Domain** | Required for HTTPS certificate issuance |
| **Firewall** | Open only ports 80/443; keep DB port internal |
| **Backups** | Configure automated PostgreSQL backups (see self-hosting guide) |

---

## Relevant Documentation

| Document | Path |
|---|---|
| Quick start | `docs/src/getting-started/quick-start.md` |
| Self-hosting guide | `docs/src/getting-started/self-hosting.md` |
| Configuration reference | `docs/src/getting-started/configuration.md` |
| FAQ | `docs/src/faq.md` |
| Self-hosted Compose | `ops/docker-compose.selfhosted.yml` |
| Dev Compose | `ops/docker-compose.dev.yml` |
| PWA design (old) | `docs/project-files/design/old-design/old specs/E-26_PWA_APP.md` |

---

## Future Distribution Options

| Option | Status | Notes |
|---|---|---|
| **Docker self-hosted** | Available now | Primary distribution method |
| **StartOS package** | Planned | `startos/` directory exists, empty |
| **PWA** | Design spec only | Old spec `E-26_PWA_APP.md`, not implemented |
| **Native desktop (Electron/Tauri)** | Not planned | No config or dependencies present |

---

## Conclusion

Sovereign Health can be installed and run on a Windows PC today using **Docker Desktop with WSL2**. The self-hosted Docker Compose file (`docker-compose.selfhosted.yml`) builds all images from source locally and requires no external registry. Setting `SHI_MODE=oss` unlocks all features for personal use. The official self-hosting docs target Linux, but the Docker abstraction makes Windows a fully viable platform.
