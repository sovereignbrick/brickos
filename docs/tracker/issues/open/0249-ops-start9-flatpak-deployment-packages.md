---
number: 249
title: "ops: specify deployment packages for Start9 and Flatpak"
labels: [ops, infrastructure, sovereign-link, packaging]
milestone: infrastructure
---

## Description

Define and document the deployment packaging for two distribution channels:

1. **Start9 (StartOS)** — Self-hosted sovereign deployment via the Start9 marketplace
2. **Flatpak** — Desktop Linux distribution via Flathub or sideloading

## Requirements

### Start9 Package
- [ ] Create `manifest.yaml` for StartOS packaging
- [ ] Define service interfaces (HTTP, PostgreSQL)
- [ ] Tor/LAN access configuration
- [ ] Health check endpoint integration
- [ ] Backup/restore procedures for Start9
- [ ] Document resource requirements (RAM, disk, CPU)

### Flatpak Package
- [ ] Create `io.brickos.SovereignHealth.yml` Flatpak manifest
- [ ] Define runtime dependencies (org.freedesktop.Platform)
- [ ] Desktop entry + icons (scalable SVG)
- [ ] Sandbox permissions (network, filesystem)
- [ ] Test build on Flathub build infrastructure
- [ ] AppStream metadata for discoverability

## Notes

- Start9 package leverages the existing `sovereign-link` crate dual-mode architecture
- Flatpak may wrap the PWA or ship a Tauri-based desktop build
- Both channels align with the data-sovereignty philosophy — user-controlled deployment
