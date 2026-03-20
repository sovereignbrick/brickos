# ADR-006: Next.js + React Frontend

**Status:** Accepted
**Date:** 2026-03-08

## Context
The health dashboard needs fast page loads, SEO for the marketing website, server-side rendering for initial data, and a strong component ecosystem for charts and forms.

## Decision
Use **Next.js 16** with **React 19**, App Router, TypeScript, and `standalone` output mode for Docker deployment.

**Key libraries:**
- `shadcn/ui` + Tailwind CSS v4 — component library with dark theme enforcement
- `recharts` — biomarker trend charts
- `react-hook-form` + `zod` — form validation
- `next-intl` — i18n (EN + DE minimum)
- `sonner` — toast notifications

## Alternatives Considered
- **Plain React (Vite):** No SSR, no file-based routing, manual setup for everything Next.js provides.
- **SvelteKit:** Smaller bundle but smaller ecosystem for health-specific components (charts, forms, data tables).
- **Remix:** Strong data loading patterns but less mature ecosystem and hosting story.

## Consequences
- **Easier:** File-based routing, SSR for fast dashboards, static export for self-hosted deployments, large ecosystem.
- **Harder:** `NEXT_PUBLIC_*` vars baked at build time (separate Docker images per environment), Turbopack can serve stale i18n (rename keys to bust cache).
- **Convention:** All text through i18n (no hardcoded strings), dark theme enforced as default, no white backgrounds on any component.
