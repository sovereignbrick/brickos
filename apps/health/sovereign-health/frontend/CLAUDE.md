# core-frontend — Claude Context

## Project
Next.js 16 frontend for the Sovereign Health platform.
- Package name: `sovereign-health-frontend`
- Port: 3000
- Output: `standalone` (set in `next.config.ts` — required for Docker)
- Backend API: `http://localhost:8080` (dev), `https://api.sovereignhealth.io` (prod)

## Tech Stack
| Concern | Tool | Notes |
|---|---|---|
| Framework | Next.js 16 | App Router, TypeScript |
| React | React 19 | |
| Styling | Tailwind CSS v4 | Dark theme, `@tailwindcss/postcss` |
| Components | shadcn/ui | Config in `components.json` |
| Charts | Recharts | |
| Package manager | pnpm | Workspace: `pnpm-workspace.yaml` |
| Font | Geist / Geist Mono | Via `next/font/google` |

## Structure
```
src/
  app/
    layout.tsx      — root layout, metadata, fonts
    page.tsx        — landing page (health zones + backend status)
    globals.css     — global styles
  components/
    ui/             — shadcn/ui primitives (button, etc.)
  lib/
    utils.ts        — cn() helper (clsx + tailwind-merge)
public/             — static assets
```

## Key Files
- `next.config.ts` — `output: "standalone"` (do not remove)
- `components.json` — shadcn/ui config
- `src/app/layout.tsx` — page title: "Sovereign Health", metadata
- `src/app/page.tsx` — main landing page

## Dev Commands
```bash
pnpm install        # install dependencies
pnpm dev            # dev server on :3000
pnpm build          # production build (standalone output)
pnpm start          # serve production build
pnpm lint           # eslint
```

## Domains
- Local dev: http://localhost:3000
- Production app: https://app.sovereignhealth.io
- Production API: https://api.sovereignhealth.io

## Conventions
- All pages are TypeScript (`.tsx`)
- Use `cn()` from `src/lib/utils.ts` for conditional class merging
- New shadcn components: `pnpm dlx shadcn@latest add <component>`
- `standalone` output must be preserved for Docker deployment
- No external JS dependencies at runtime if avoidable
