---
number: 255
title: "PoC: WSL Ubuntu as development environment — capabilities and limitations"
labels: [poc, infrastructure, developer-experience]
milestone: infrastructure
---

## Description

Evaluate whether the installed WSL (Windows Subsystem for Linux) Ubuntu instance on the company laptop can serve as a viable development environment for BrickOS.

## Questions to Answer

### What can I do from WSL?
- [ ] Run Claude Code CLI for AI-assisted coding
- [ ] Run Docker / Docker Compose (Docker Desktop or native dockerd)
- [ ] Build Rust (`cargo build`, `cargo test`)
- [ ] Build frontend (`pnpm install`, `pnpm build`)
- [ ] SSH into VPS for deployment
- [ ] Git operations (clone, push, pull)
- [ ] Run local development stack (backend + frontend + DB)

### SSH from laptop — what's possible?
- [ ] SSH into VPS from WSL terminal
- [ ] Port forwarding for accessing staging services
- [ ] SCP/rsync for file transfer
- [ ] Can I get GUI? (X11 forwarding, WSLg, VNC, RDP)
- [ ] VS Code Remote-SSH from Windows host through WSL

### GUI Access
- [ ] WSLg (Windows 11) — does it work for GUI apps?
- [ ] X11 forwarding over SSH — latency, usability
- [ ] Alternative: VS Code Server on VPS, access via browser
- [ ] Alternative: Tailscale/WireGuard for direct VPS access

## Deliverables

- [ ] Document WSL dev setup steps
- [ ] Capabilities matrix (what works, what doesn't, workarounds)
- [ ] Performance comparison: WSL vs native Linux vs Mac
- [ ] Recommendation: viable as primary/secondary dev environment?
