---
number: 227
title: "ops: move development environment to cloud VPS for location-independent work"
labels: [enhancement, infrastructure, ops]
milestone: infrastructure
---

## Problem

Development is currently tied to a single desktop machine at home. This creates:
- **Location dependency** — can't develop while traveling, at conferences (BTC Prague), or from a different location
- **Single point of failure** — if the desktop has hardware issues, development stops
- **No mobile development** — can't do quick fixes from a laptop/tablet
- **Long deploy times** — Docker builds run locally, then images transfer to VPS over home internet upload speeds

## Goal

Move the full development environment to a cloud VPS so work can happen from any device with SSH/browser access.

## Options Evaluated

### Option A: Dedicated Dev VPS (Hetzner/OVH)

| Spec | Recommendation |
|------|----------------|
| Provider | Hetzner Cloud (EU, GDPR-compliant) |
| Instance | CPX31 (4 vCPU, 8 GB RAM, 160 GB NVMe) |
| Cost | ~€15/month |
| Location | Nuremberg or Helsinki (low latency to production VPS) |

**Pros:**
- Full control, same as current setup
- Fast deploys — VPS→VPS transfer is datacenter-speed, not home upload
- Persistent state — tmux/screen sessions survive disconnects
- SSH from any device (laptop, phone terminal, tablet)

**Cons:**
- Need to set up from scratch (Rust toolchain, Node, Docker, etc.)
- No GUI — pure terminal (fine for Claude Code + vim/nano)
- Need to manage SSH keys, firewall, backups

**Access methods:**
- SSH from terminal (any device)
- VS Code Remote SSH (from any laptop with VS Code)
- Claude Code CLI over SSH
- Mosh for unstable connections (travel wifi)

### Option B: GitHub Codespaces

| Spec | Recommendation |
|------|----------------|
| Machine | 4-core, 16 GB RAM |
| Cost | ~$0.36/hr (~€25-40/month for 3-4h/day usage) |
| Storage | 32 GB default |

**Pros:**
- Zero setup — `.devcontainer.json` defines the environment
- Pre-built with Docker, Node, Rust (via devcontainer features)
- Browser-based VS Code — works from any device including tablets
- GitHub integration (no SSH key setup needed)
- Automatic shutdown on idle (cost control)

**Cons:**
- More expensive than dedicated VPS at consistent usage
- Cold starts (1-2 min to spin up if idle)
- 32 GB storage may be tight for Rust target/ + Docker images
- Relies on GitHub (contradicts sovereignty philosophy)

### Option C: Gitpod / Coder

| Spec | Recommendation |
|------|----------------|
| Gitpod | Self-hosted possible, browser IDE |
| Coder | Self-hosted on own VPS, VS Code in browser |
| Cost | Free (self-hosted) + VPS cost |

**Pros:**
- Self-hosted = sovereign
- Browser-based IDE
- Coder can run on existing production VPS or separate dev VPS

**Cons:**
- Setup complexity (Kubernetes or Docker Compose for Coder)
- Resource overhead of the platform itself
- Gitpod cloud pricing is steep ($25-50/month)

### Option D: Tailscale + Existing Desktop (Hybrid)

| Spec | Recommendation |
|------|----------------|
| Cost | Free (up to 3 users) |
| Setup | Install Tailscale on desktop + any remote device |

**Pros:**
- Zero cost
- Desktop stays the primary dev machine
- SSH in from anywhere via Tailscale's WireGuard mesh
- Wake-on-LAN for power management

**Cons:**
- Desktop must be powered on and connected
- Home internet upload speed bottleneck
- Not truly independent — still tied to hardware

## Recommendation

**Option A (Hetzner Dev VPS)** is the best fit for BrickOS:

1. **Sovereignty aligned** — own infrastructure, no Microsoft/GitHub dependency
2. **Fast deploys** — datacenter→datacenter transfer instead of home→datacenter
3. **Low cost** — €15/month fixed, predictable
4. **Simple** — just a Linux box with SSH, same tools as current setup
5. **Conference-ready** — SSH from hotel wifi or phone tethering

### Setup Plan

```
1. Provision Hetzner CPX31 (4 vCPU, 8 GB, 160 GB NVMe)   ~10 min
2. Install: Rust, Node (pnpm), Docker, Git, Claude Code    ~30 min
3. Clone repo, configure SSH keys, .env files               ~15 min
4. First build (cargo build + pnpm install)                 ~10 min
5. Configure Mosh + tmux for persistent sessions            ~5 min
6. Update deploy.sh to skip image transfer (same datacenter) ~15 min
7. VS Code Remote SSH from laptop                           ~5 min
```

**Total setup: ~1.5 hours**

### Optional Enhancements

- **Tailscale** between dev VPS and production VPS for direct access
- **Syncthing** or Git for config sync between desktop and VPS
- **Code-server** (VS Code in browser) for tablet/phone access
- **Scheduled snapshots** on Hetzner for dev environment backup

## Decision

Pending discussion. Key questions:
- Do we need GUI access (browser testing) or is headless sufficient?
- Should the existing desktop remain as a backup dev environment?
- Budget constraint? (€15/month vs €25-40/month for Codespaces)
