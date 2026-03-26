---
number: 254
title: "docs: optimize GitHub README for BrickOS + Sovereign Health — philosophy, visuals, SVGs"
labels: [docs, marketing, ux, sprint-014]
milestone: ux-and-onboarding
---

## Description

Revamp the GitHub README pages for both the BrickOS monorepo and the Sovereign Health app to clearly communicate the platform philosophy, benefits, and architecture.

## BrickOS Monorepo README

Explain the philosophy:
- **Sovereign-first** — users own their data, choose their deployment
- **Brick architecture** — modular apps composed from shared platform crates/packages
- **Multi-product monorepo** — one platform, many health/finance/infrastructure apps
- **Self-hostable** — Docker-based, runs on VPS, Start9, local laptop
- **Privacy by design** — encryption at rest, RLS, no third-party data sharing

Visual: Brief SVG showing the platform layer cake (crates → platform → apps → deployments).

## Sovereign Health App README

Explain:
- **What it is** — personal health data platform for biomarker tracking
- **The problem** — health data trapped in silos (lab portals, PDFs, doctor systems)
- **The solution** — import, normalize, own, and analyze your health data
- **Key features** — PDF import, biomarker dashboard, AI assistant, data export
- **Data sovereignty** — your data on your infrastructure

Visual: Brief SVG showing data flow (lab PDF → import → normalized markers → dashboard + AI).

## Requirements

- [ ] BrickOS root `README.md` rewrite with philosophy section
- [ ] Sovereign Health `apps/health/sovereign-health/README.md` rewrite
- [ ] SVG diagram for platform architecture (BrickOS)
- [ ] SVG diagram for data flow (Sovereign Health)
- [ ] Keep READMEs concise — link to docs/ for deep dives
- [ ] Bilingual consideration (EN primary, DE link)
