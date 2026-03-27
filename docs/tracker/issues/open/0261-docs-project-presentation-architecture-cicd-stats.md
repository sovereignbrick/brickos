---
number: 261
title: "docs: project presentation — architecture, CI/CD, stats, features, lessons, outlook"
labels: [docs, presentation, marketing]
milestone: ux-and-onboarding
---

## Description

Create a comprehensive project presentation covering all aspects of BrickOS / Sovereign Health. Suitable for investor meetings, conference talks, or team onboarding.

## Presentation Sections

### a) Architecture
- Monorepo structure (Cargo workspace + pnpm workspace)
- Platform layer cake: crates → platform services → apps
- Deployment topology: VPS, Docker, Start9, local
- Data flow: import → parse → normalize → store → visualize → AI

### b) Processes
- CI/CD pipeline (GitHub Actions → Docker build → VPS deploy)
- Sprint planning methodology (named sprints, design-first)
- Issue tracking (local-first + GitHub sync)
- Release workflow (semver, RC testing, staging → production)

### c) Stats
- Lines of code (Rust, TypeScript)
- Number of crates, packages, migrations
- Test coverage
- Sprint velocity over time
- Deployment frequency

### d) Features
- **User features**: PDF import, biomarker dashboard, AI assistant, data export, PWA
- **Tech features**: field-level encryption, RLS, pgAudit, i18n, dark theme, Gatus monitoring

### e) Lessons Learned
- Design-first sprints = zero rework
- Docker cache busting for i18n
- Migration checksum gotchas (SHA-384)
- Staging pre-flight saves deploy cycles

### f) Next Steps / Outlook
- Multi-product platform (health, finance, infrastructure)
- Start9 marketplace listing
- EU compliance certification path
- Mobile native (Tauri/Capacitor)

## Deliverables

- [ ] Slide deck (Gamma, PDF, or Reveal.js)
- [ ] Speaker notes per slide
- [ ] Architecture SVG diagrams (reuse from #254)
- [ ] Stats auto-generated from repo (script)
