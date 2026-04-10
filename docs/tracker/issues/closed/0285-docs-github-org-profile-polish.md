---
number: 285
github_number: 498
github: 266
title: "docs: polish GitHub org profile and repo for public visibility"
labels: [docs, community, priority-medium]
milestone: community
---

## Description

Make the `sovereignbrick` GitHub organization and `brickos` repo attractive and professional for public visitors, open-source contributors, and potential partners. Maximize use of GitHub free tier features.

## Why

- First impression for developers, investors, and partners evaluating BrickOS
- Open-source credibility requires professional GitHub presence
- EU compliance (AGPL-3.0) benefits from clear contribution and security policies
- Free tier features are underutilized

## .github Org Repo

- [ ] `profile/README.md` -- Org profile page with:
  - BrickOS logo/banner
  - Mission statement (privacy-first sovereignty platform)
  - Product overview (Sovereign Health Intelligence)
  - Tech stack badges (Rust, Next.js, PostgreSQL, Docker)
  - Links to website, docs, demo
- [ ] `CONTRIBUTING.md` -- Contribution guidelines (fork, branch, PR, code style)
- [ ] `CODE_OF_CONDUCT.md` -- Contributor Covenant or similar
- [ ] `SECURITY.md` -- Security policy (how to report vulnerabilities, response SLA)
- [ ] `FUNDING.yml` -- Sponsor button (GitHub Sponsors, BTC address, or custom URL)

## brickos Repo Polish

### README.md
- [ ] Hero banner/logo
- [ ] Badges: build status, license, version, Rust, Node versions
- [ ] Clear "What is BrickOS?" section
- [ ] Architecture diagram (Excalidraw or Mermaid)
- [ ] Quick start guide (3-step Docker setup)
- [ ] Screenshot gallery (dashboard, trends, Dr. Alex)
- [ ] Feature list with status (implemented/planned)
- [ ] License section (AGPL-3.0 dual-license note)

### GitHub Features (Free Tier)
- [ ] **Discussions** -- Enable and create categories (Q&A, Ideas, Show & Tell)
- [ ] **Wiki** -- Basic docs or link to in-repo docs
- [ ] **Issue templates** -- Bug report, feature request, security vulnerability
- [ ] **PR template** -- Checklist (tests, i18n, docs)
- [ ] **Labels** -- Standardize label colors and names
- [ ] **Milestones** -- Clean up and align with roadmap
- [ ] **Projects board** -- Public Sprint Board view
- [ ] **Topics/Tags** -- Add relevant topics (rust, health, privacy, self-hosted, etc.)
- [ ] **Social preview image** -- Custom OG image for link sharing
- [ ] **Releases** -- Publish GitHub Releases with changelogs
- [ ] **Pinned issues** -- Pin roadmap or getting-started issue
- [ ] **Repository description** -- Concise, keyword-rich (already good)

### Community Health
- [ ] **Private vulnerability reporting** -- Enable (done)
- [ ] **Dependabot** -- Enabled with grouped security updates (done)
- [ ] **Secret scanning** -- Enabled (done)
- [ ] **Branch protection** -- Review rules for main branch
- [ ] **CODEOWNERS** -- Define code ownership per directory

## References

- GitHub community health: https://docs.github.com/en/communities
- GitHub org profile: https://docs.github.com/en/organizations/collaborating-with-groups-in-organizations/customizing-your-organizations-profile
- Issue #254: GitHub README optimization (existing related issue)
