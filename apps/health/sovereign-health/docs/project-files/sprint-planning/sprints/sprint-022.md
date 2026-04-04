# Sprint 022 -- Platform Presence: GitHub, GitLab & BrickOS Website

**Started:** 2026-04-04
**Duration:** multi-day
**Status:** PLANNED
**Goal:** Professional public presence across GitHub, GitLab, and brickos.io. Sovereign backup of source code on GitLab. Attractive READMEs with architecture diagrams, badges, and screenshots. BrickOS.io one-page website with brand guide compliance.

## Sprint Backlog

### M1: GitHub Presence

| # | Title | Area | Pts |
|---|-------|------|-----|
| #285 | GitHub org profile polish — .github repo, templates, community health | Docs/Ops | 8 |
| #254 | GitHub README optimization — rewrite with SVG diagrams, badges, screenshots | Docs | 8 |
| #231 | Update root README architecture — remove stale dirs, accurate tree (merged into #254) | Docs | 0 |

**#285 sub-tasks:**
1. Create `.github` org repo with `profile/README.md` (org landing page)
   - BrickOS logo/banner
   - Mission statement
   - Product overview (Sovereign Health Intelligence)
   - Tech stack badges (Rust, Next.js, PostgreSQL, Docker)
   - Links: website, demo, docs
2. `CONTRIBUTING.md` — fork, branch, PR, code style conventions
3. `CODE_OF_CONDUCT.md` — Contributor Covenant
4. `SECURITY.md` — vulnerability reporting policy, response SLA
5. `FUNDING.yml` — GitHub Sponsors / BTC address / custom URL
6. Issue templates: bug report, feature request, security vulnerability
7. PR template with checklist (tests, i18n, docs, screenshots)
8. Repository topics/tags (rust, health, privacy, self-hosted, biomarkers, etc.)
9. Social preview image (custom OG image for link sharing)
10. Pinned issues (roadmap or getting-started)

**#254 sub-tasks (includes #231):**
1. BrickOS root `README.md` full rewrite:
   - Hero banner/logo
   - Badges: license, version, Rust, Node, Docker
   - "What is BrickOS?" section (philosophy: sovereign-first, brick architecture, self-hostable)
   - Architecture SVG diagram (platform layer cake: crates → platform → apps → deployments)
   - Monorepo directory tree (accurate, remove stale dirs)
   - Quick start guide (3-step Docker setup)
   - Feature list with status (implemented/planned)
   - Distribution targets (SaaS, PWA, Flatpak planned, Start9 planned)
   - License section (AGPL-3.0)
2. Sovereign Health `apps/health/sovereign-health/README.md` rewrite:
   - What it is, the problem, the solution
   - Key features (PDF import, biomarker dashboard, AI assistant, data export, PWA)
   - Data flow SVG diagram (lab PDF → import → normalized markers → dashboard + AI)
   - Screenshot gallery (dashboard, trends, Dr. Alex, import)
   - Data sovereignty section
3. Delete stale placeholder dirs:
   - `apps/finance/tax-trainer/` (empty)
   - `apps/infrastructure/bitcoin-node/` (empty)
4. Update tech stack references (add @serwist/next, Sovereign Link, PWA capabilities)

### M2: BrickOS.io Website

| # | Title | Area | Pts |
|---|-------|------|-----|
| #315 | BrickOS.io one-page website with brand guide, animation, contact form | Frontend | 10 |

**Sub-tasks:**
1. Hero section — animated isometric blocks from `blockos-logo-v2.html`
2. Brand section — logo variants, typography (Space Mono + Cormorant Garamond), color palette
3. Platform overview — what BrickOS is, products (Sovereign Health), philosophy
4. Contact form — name, email, message → existing `POST /contact` endpoint
5. Footer — links, AGPL-3.0 notice, BTC donation
6. Mobile responsive design
7. SEO: meta tags, OG tags, structured data
8. Favicon set from existing brand assets
9. Deploy to brickos.io (Cloudflare Pages or VPS nginx)

**Brand guide compliance:**
- Background: `#070707` (near-black)
- Typography: Space Mono (UI/body) + Cormorant Garamond (headings)
- Colors: grayscale — `#e8e8e8`, `#b8b8b8`, `#888`, `#333`
- Film grain overlay (SVG noise filter, 4% opacity)
- Generous spacing, minimal, premium feel

**Assets available:**
- `blockos-logo-v2.html` — animated SVG logo
- `blockos-brand.html` — brand identity page
- `blockos-brandguide.html` — full brand guide
- `blockos-cube-*.png` — cube mark (512, 1024)
- `blockos-favicon-*.png` — favicons (16, 32, 64)

### M3: GitLab Mirror & Social Previews

| # | Title | Area | Pts |
|---|-------|------|-----|
| #248 | GitLab sovereign backup mirror | Ops | 3 |
| #220 | Social link previews (OG tags) across platforms | Docs/UX | 3 |

**#248 sub-tasks:**
1. Create GitLab org: `gitlab.com/sovereignbrick`
2. Create mirror repo: `gitlab.com/sovereignbrick/brickos`
3. Match GitHub org design (avatar, description, profile)
4. Add remote: `git remote add gitlab git@gitlab.com:sovereignbrick/brickos.git`
5. deploy.sh: add optional GitLab push after production deploy
6. Initial push: all branches + tags
7. Document in deployment docs which releases warrant a GitLab push

**#220 sub-tasks:**
1. Verify OG meta tags on: sovereignhealth.io, app.sovereignhealth.io, brickos.io
2. Test link previews on: LinkedIn, X/Twitter, WhatsApp, Telegram, Slack, Discord
3. Create/update social preview images (1200x630) for all properties
4. Fix any missing or broken previews

## Dependency Graph

```
M1: GitHub Presence (do first — content feeds into M2 + M3)
══════════════════════════════════════════════════════════
  #285 .github org repo + community health files
    ↓ (social preview image reused)
  #254 README rewrite + SVG diagrams + screenshots
    ↓ (architecture diagrams reused in website)

M2: BrickOS.io Website (after M1 — reuses diagrams + content)
═════════════════════════════════════════════════════════════
  #315 One-page website
    ├─ Hero (animated logo)
    ├─ Brand section
    ├─ Platform overview (from README content)
    ├─ Contact form
    └─ Deploy

M3: GitLab Mirror + Social (independent, can parallel with M2)
══════════════════════════════════════════════════════════════
  #248 GitLab setup + deploy.sh integration
  #220 OG tag verification (after M1 social preview is created)
```

## Execution Order

```
PHASE 0 — Housekeeping
════════════════════════
  Delete stale dirs (tax-trainer, bitcoin-node)
  cargo fmt (if needed)

PHASE 1 — GitHub Org + README (M1)
═══════════════════════════════════

  1a. Create .github org repo
      - profile/README.md with banner + mission + badges
      - CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md
      - FUNDING.yml
      - Issue templates + PR template

  1b. BrickOS root README.md rewrite
      - Architecture SVG diagram
      - Badges, quick start, feature list
      - Accurate directory tree

  1c. Sovereign Health README.md rewrite
      - Data flow SVG diagram
      - Screenshots, features, sovereignty section

  1d. Repo polish
      - Topics/tags, social preview image
      - Pinned issues, labels cleanup

PHASE 2 — BrickOS.io Website (M2)
══════════════════════════════════

  2a. Site structure + hero (animated logo)
  2b. Brand section + platform overview
  2c. Contact form (wire to existing API)
  2d. Mobile responsive + SEO + favicons
  2e. Deploy to brickos.io

PHASE 3 — GitLab Mirror + Social (M3)
══════════════════════════════════════

  3a. GitLab org + repo setup
  3b. Match design to GitHub (avatar, description)
  3c. deploy.sh integration
  3d. Initial push (all branches + tags)
  3e. OG tag verification across platforms

PHASE 4 — Review
═════════════════
  Verify all links, previews, and pages
  Screenshot documentation
```

## Total Points: 32

## Key Design Decisions

### GitHub org profile: .github repo approach
GitHub renders `sovereignbrick/.github/profile/README.md` as the org landing page. This is the standard approach and doesn't require a separate website.

### README: SVG diagrams over Mermaid
SVGs render consistently across GitHub, GitLab, and local. Mermaid depends on renderer support. SVGs also allow brand-compliant styling.

### BrickOS.io: Static HTML, not Next.js
The website is a single page with an animated logo. No framework needed — simple HTML/CSS/JS keeps it fast, dependency-free, and easy to maintain.

### GitLab: Manual push, not auto-mirror
Auto-mirroring wastes GitLab compute on every commit. Manual push on critical releases is sovereign and intentional.

## Risk Assessment

- **#315 (website):** Brand guide compliance requires exact typography and color matching. Use the existing HTML assets as reference, not from memory.
- **#254 (SVG diagrams):** Creating good architecture diagrams takes time. Keep them simple — boxes and arrows, not detailed UML.
- **#248 (GitLab):** SSH key management across GitHub + GitLab. Use separate deploy keys per platform.
- **#285 (.github repo):** GitHub org settings may require owner permissions. Verify access before starting.
