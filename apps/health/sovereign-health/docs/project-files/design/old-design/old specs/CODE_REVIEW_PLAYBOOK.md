# Code Review Playbook — swickDoctor

## Role
swickDoctor acts as **code reviewer** for the Sovereign Health project.
Review happens via GitLab raw file fetch after each push.

## GitLab Repositories

### Public (core/)
| Repo | URL | Raw Access |
|------|-----|---|
| Backend | https://gitlab.com/sovereign-health/core/backend | `/-/raw/main/{path}` ✅ works |
| Frontend | https://gitlab.com/sovereign-health/core/frontend | `/-/raw/main/{path}` ✅ works |

### Private (saas/, ops/) — Cannot fetch raw files without auth
| Repo | URL | Raw Access |
|------|-----|---|
| Admin | https://gitlab.com/sovereign-health/saas/admin | ❌ needs token |
| Homepage | https://gitlab.com/sovereign-health/saas/homepage | ❌ needs token |
| Infra | https://gitlab.com/sovereign-health/ops/infra | ❌ needs token |

**TODO:** Set up GitLab personal access token (read_repository scope) for private repo access.

## Review Checklist (per push)

### Backend (Rust)
- [ ] No `unwrap()` or `expect()` in handler code (use `?` operator + error types)
- [ ] No `println!` (use `tracing::info!`, `tracing::error!`)
- [ ] No hardcoded secrets or connection strings
- [ ] All endpoints return structured JSON errors `{ error, code, details? }`
- [ ] SQL queries use SQLx compile-time checking where possible
- [ ] Migrations are reversible (up + down)
- [ ] CORS headers configured for frontend origin
- [ ] Auth middleware on protected routes
- [ ] Tests exist for new handlers

### Frontend (Next.js/TypeScript)
- [ ] No `any` types
- [ ] No hardcoded URLs (use env vars `NEXT_PUBLIC_*`)
- [ ] Components in proper directories (components/, lib/, hooks/)
- [ ] Proper error boundaries
- [ ] Loading states for async operations
- [ ] Accessibility: proper labels, keyboard navigation, contrast ratios
- [ ] Health zone colors match spec exactly

### Both
- [ ] Conventional commit messages (feat:, fix:, chore:, docs:)
- [ ] No AI co-author tags
- [ ] .env files not committed
- [ ] README updated if API changes

## Review Process
1. Helmut says "pushed task-XXX"
2. I fetch key files from GitLab raw URLs
3. Run review checklist
4. Report: ✅ pass / ⚠️ warnings / ❌ blockers
5. Provide Claude Code fix prompt if needed

## Key Files to Always Check
```
Backend:
  src/main.rs           — app config, routes, middleware
  src/handlers/*.rs     — endpoint logic
  src/models/*.rs       — data structures
  Cargo.toml            — dependencies
  migrations/           — DB changes

Frontend:
  src/app/page.tsx      — main page
  src/app/layout.tsx    — root layout
  src/components/*.tsx   — UI components
  package.json          — dependencies
  .env.example          — env template
```

## Historical Reviews

### 2026-03-07 — Hello World (Score: 8.4/10)
**Backend:**
- ✅ Actix-web 4, SQLx+PostgreSQL, dotenvy, versioned API /api/v1/, migrations
- ⚠️ Missing: .env.example, CORS, tracing, expect() usage, zone field on /hello

**Frontend:**
- ✅ Next.js 16, TS strict, TailwindCSS 4, shadcn/ui, Recharts, 8 zones correct colors
- ⚠️ Missing: package rename (nextjs-init→sovereign-health-frontend), env var for API_BASE, folder structure
