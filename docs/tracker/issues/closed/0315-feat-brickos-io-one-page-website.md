# Issue #315: BrickOS.io one-page website with brand guide, animation, and contact form

**Type:** feature
**Priority:** medium
**Component:** website / brickos.io
**Found during:** planning (2026-04-02)

## Description

Build a simple, high-quality one-page website for brickos.io following the BlockOS brand guide. The page should showcase the platform identity and provide a contact form.

## Page Structure (top to bottom)

### 1. Hero — Animated isometric blocks
- Embed the BlockOS logo animation from `blockos-logo-v2.html`
- Isometric 3×2 grid with block drop animation, float, fade, repeat (~22s cycle)
- Full-width dark background, centered animation

### 2. Brand section
- BlockOS brand identity presentation from `blockos-brand.html`
- Logo mark in dark/light variants
- Lockup variants (horizontal, stacked)
- Typography showcase (Space Mono + Cormorant Garamond)
- Color palette

### 3. Contact form
- Reuse the existing Sovereign Health contact form pattern
- Backend: `POST /contact` endpoint already exists in `handlers/contact.rs`
- Frontend: adapt from `sovereign-health/website/src/components/contact-form.tsx`
- Fields: name, email, message
- Encrypted PII storage (GDPR compliant)

## Brand Guide Compliance

Follow `blockos-brandguide.html` strictly:
- **Background:** `#070707` (near-black)
- **Typography:** Space Mono (monospace, UI/body) + Cormorant Garamond (serif, headings)
- **Colors:** grayscale palette — `#e8e8e8` (white), `#b8b8b8` (hi), `#888` (text), `#333` (dim)
- **Texture:** film grain overlay (SVG noise filter at 4% opacity)
- **Spacing:** generous, minimal, premium feel
- **Letter-spacing:** uppercase labels with wide tracking

## Assets Available

- `/home/dev-comp/Projects/brickos-website/blockos-logo-v2.html` — animated SVG logo
- `/home/dev-comp/Projects/brickos-website/blockos-brand.html` — brand identity page
- `/home/dev-comp/Projects/brickos-website/blockos-brand(1).html` — brand identity (variant)
- `/home/dev-comp/Projects/brickos-website/blockos-cube-*.png` — cube mark (512, 1024, dark)
- `/home/dev-comp/Projects/brickos-website/blockos-favicon-*.png` — favicons (16, 32, 64)
- `/home/dev-comp/Projects/brickos-website/blockos-favicon.ico` — ICO favicon
- `/home/dev-comp/Downloads/blockos-brandguide.html` — full brand guide (colors, typography, spacing, usage rules)

## Technical

- Simple static HTML/CSS/JS or lightweight framework
- Mobile responsive
- Fast loading (no heavy dependencies)
- SEO basics: meta tags, OG tags, structured data
- Favicon set from existing assets
- Contact form submits to existing BrickOS API contact endpoint

## Location

- New: `apps/platform/brickos-website/` or standalone repo
- Reuse contact form from: `apps/health/sovereign-health/website/src/components/contact-form.tsx`
- Reuse contact backend: `apps/health/sovereign-health/api/src/handlers/contact.rs`
