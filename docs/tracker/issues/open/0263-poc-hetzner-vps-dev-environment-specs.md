---
number: 263
title: "PoC: Hetzner VPS for development — specs, OS, GUI access, billing model"
labels: [poc, infrastructure, developer-experience]
milestone: infrastructure
---

## Description

Evaluate Hetzner Cloud VPS as a development environment. Answer key questions about specs, access, and cost.

## Questions to Answer

### Specs
- [ ] What VPS tiers are available? (vCPU, RAM, disk, bandwidth)
- [ ] Recommended spec for BrickOS development (build Rust + run Docker stack)
- [ ] Minimum: probably CX31 (4 vCPU, 8GB RAM) or CX41 (8 vCPU, 16GB RAM)
- [ ] NVMe vs network storage performance for cargo builds

### OS
- [ ] Which OS images are available? (Ubuntu, Debian, Fedora, etc.)
- [ ] Recommendation: Ubuntu 22.04/24.04 LTS for consistency with staging VPS
- [ ] Can I use a custom ISO? (e.g., Pop!_OS server, NixOS)

### GUI Access
- [ ] **No native GUI** — Hetzner VPS is terminal/SSH only
- [ ] Options for GUI access:
  - VS Code Remote-SSH (best option — local VS Code, remote compute)
  - VNC server (tigervnc/x11vnc) + lightweight DE (XFCE)
  - noVNC (browser-based VNC)
  - Hetzner Console (basic web terminal, emergency only)
- [ ] Claude Code CLI works fully over SSH — no GUI needed for AI coding

### Billing
- [ ] Hetzner bills **per hour** when server exists (running or stopped)
- [ ] **Pausing (stopping) does NOT stop billing** — you still pay for allocated resources
- [ ] To stop billing: **delete the server** (snapshot first to preserve state)
- [ ] Workflow: snapshot → delete → restore from snapshot when needed
- [ ] Snapshot storage: €0.0119/GB/month
- [ ] Alternative: Hetzner Cloud API to automate create/destroy cycle

## Cost Estimates

| Tier | vCPU | RAM | Disk | Monthly | Hourly |
|------|------|-----|------|---------|--------|
| CX22 | 2 | 4GB | 40GB | ~€4.35 | €0.006 |
| CX32 | 4 | 8GB | 80GB | ~€7.69 | €0.011 |
| CX42 | 8 | 16GB | 160GB | ~€15.59 | €0.023 |
| CX52 | 16 | 32GB | 320GB | ~€29.99 | €0.044 |

## Deliverables

- [ ] Document recommended Hetzner VPS spec for BrickOS dev
- [ ] Setup script: install Rust, Docker, pnpm, Claude Code on fresh VPS
- [ ] Cost comparison: always-on vs snapshot-cycle workflow
- [ ] Decision: use for dev, staging, or both?
