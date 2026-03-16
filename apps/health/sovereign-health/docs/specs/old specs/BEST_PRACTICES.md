# Best Practices — Sovereign Health Intelligence

*Created: 2026-03-12*
*Living document — update as processes evolve*

---

## 1. Agile Convention

### Hierarchy

| Level | ID Format | Description | Example |
|---|---|---|---|
| **Epic** | `E-XX` | Large feature area or initiative | E-05 Affiliate System |
| **User Story** | `S-XXX` | User-facing value statement | S-030 As a user, I can track referrals |
| **Task** | `T-XXXX` | Implementation unit (maps to a Claude Code prompt) | T-0300 DB migration for affiliate tables |
| **Bug** | `B-XXXX` | Defect found in testing | B-0016 Dr. Alex markdown not rendered |
| **Spike** | `SP-XXX` | Research/investigation | SP-001 Evaluate AI video tools |

### User Story Format
```
As a [user/admin/visitor],
I can [action],
so that [benefit].
```

### Task Sizing
- One task = one Claude Code prompt
- If a task is too large for one prompt session, split it
- Tasks should be independently testable

### Sprint Naming
`SPRINT-YYYY-MM-DD` (start date)

### Backlog Management
- Master record: `agile-project-planning.md` (all tasks, all sprints, full history)
- Active sprint + backlog: `PRODUCT_BACKLOG.md`
- Priorities: HIGH (before RC) > MEDIUM (before BTC Prague) > LOW (nice to have) > ICEBOX (future)
- Review backlog at start of each work session

### Sprint Planning Process
1. **Close current sprint:** Mark all completed tasks as done, update stats
2. **Review backlog:** Go through open items, re-prioritize if needed
3. **Select items for next sprint:** Pull from backlog into sprint, assign order
4. **Create/verify prompts:** Each sprint task needs a Claude Code prompt (.md file)
5. **Define execution order:** List exact filenames in sequence with dependencies
6. **Document in PRODUCT_BACKLOG.md:** Active sprint section with status tracking

### Sprint Execution
1. Feed prompts to Claude Code in order (exact filename, one at a time)
2. After each prompt: verify build succeeds, deploy if needed
3. Report findings to swickDoctor for next prompt or bug fix
4. Update task status in PRODUCT_BACKLOG.md as work completes
5. At end of day: close sprint, flush to memory, plan next sprint

### Task Numbering
- Tasks use continuous numbering across all sprints (T-0001, T-0002, ...)
- Never reuse a task number
- New tasks always get the next available number
- Historical tasks (batches, groups) are retroactively numbered for traceability

---

## 2. Prompt Engineering for Claude Code

### File Naming
```
{EPIC_SHORT}_{SEQUENCE}_{description}.md

Examples:
  AFFILIATE_prompt1_backend.md
  W2a_feature_db_api.md
  R-P1_quick_fixes.md
  A-P3_favicon_toasts.md
```

### Prompt Structure (template)

```markdown
# [Title] — [Short Description]

**Target:** Claude Code on VPS
**Scope:** [What this prompt covers — be specific]
**Dependencies:** [Which prompts must be done first, or "None"]
**Priority:** [CRITICAL / HIGH / MEDIUM]

---

## Context
[1-2 sentences: what exists, what we're changing, why]

## Task 1: [Name]
[Step-by-step instructions with exact file search commands]

## Task 2: [Name]
...

## Verification
- [ ] [Testable checklist items]
```

### Prompt Rules
1. **Always start with "find the code first"** — include `grep` / `find` commands
2. **Say "Before writing any code: inspect existing patterns and follow them"**
3. **Scope strictly** — tell Claude Code what NOT to do
4. **Include verification checklist** — testable pass/fail items
5. **One prompt = one deployable unit** — don't mix unrelated changes
6. **Provide SQL for migrations** — don't let Claude Code guess schema
7. **Include both EN and DE** for any user-facing text
8. **Specify exact API request/response shapes** — reduces guesswork
9. **Keep prompts under 10KB** — larger prompts lose focus
10. **If a prompt would exceed context, split it** — reference the dependency

### Prompt Detail Level (CRITICAL)
**Write detailed, step-by-step prompts. Never give Claude Code short vague instructions.**

A good prompt includes:
- **Exact grep/find commands** to locate code before changing it
- **Exact SQL** for any database changes (never let Claude Code guess schema)
- **Exact file paths** when known
- **Exact verification commands** (curl, grep) to check the fix worked
- **Exact i18n keys** in both EN and DE
- **Expected output** for verification commands (e.g., "should return 0", "should see createAccount")
- **What NOT to do** (scope boundaries)

A bad prompt: "Fix the registration page and deploy"
A good prompt: 200+ lines with exact SQL, exact grep commands, exact verification, exact deploy steps.

Short prompts (under 20 lines) give Claude Code too much freedom. It will improvise, skip steps, or do things differently than expected. The more detailed the prompt, the more predictable the result.

### Cost Optimization
- Use focused prompts (2-5KB) over full spec dumps (15KB+)
- Claude Code doesn't need "why" — it needs "what" and "how"
- Strip marketing text, roadmap items, and philosophical reasoning
- Only include what's needed to write code

---

## 3. Translation / i18n Standards

### Authority Chain
```
1. User DB preference    ← HIGHEST
2. URL param (?lang=de)
3. Cookie / localStorage
4. Browser Accept-Language
5. Default: EN           ← LOWEST
```

### Rules
- **Zero hardcoded strings** in components — everything through `t()` function
- **Translation files** structured by section: `common.*`, `settings.*`, `dashboard.*`, etc.
- **Both EN and DE** required for every string before merge
- **German text must use proper Umlaute** (ä, ö, ü, ß) — never ASCII substitutes
- **No emdashes** (— or –) anywhere in any language
- **App name:** "Sovereign Health Intelligence" (stored as constant, not translated)
- **Admin-editable:** Content strings stored in DB (`content_strings` table), editable via admin panel
- **Fallback:** If DE translation missing, fall back to EN (never show blank)

### Terminology (canonical)
| English | German | Notes |
|---|---|---|
| blood markers | Blutmarker | NOT "health markers" |
| Health Zone | Gesundheitszone | Always capitalized |
| measurement | Messung | |
| threshold | Schwellenwert | |
| trend | Trend | Same in both |
| fasting protocol | Fastenprotokoll | |
| diet protocol | Ernährungsprotokoll | |

### Marketing Pages
- Use "85+ blood markers" / "85+ Blutmarker" on all pages
- Exception: `/markers` page shows real calculated count from DB

---

## 4. Testing & Deployment

### Development Workflow: LOCAL DEV → DOCKER REBUILD → LOCAL TEST → VPS DEPLOY
**Claude Code runs on Helmut's laptop (Pop!_OS). VPS has NO build tools.**
**Everything runs in Docker containers locally. Do NOT use `npm run dev` or `cargo run` directly.**

1. Claude Code implements changes **locally** on the dev machine
2. **Rebuild and restart the changed containers:**
   ```bash
   # After frontend changes:
   cd ~/projects/sovereign-health
   docker compose build frontend
   docker compose up -d frontend

   # After backend changes:
   cd ~/projects/sovereign-health
   docker compose build backend
   docker compose up -d backend

   # After both changed:
   cd ~/projects/sovereign-health
   docker compose build frontend backend
   docker compose up -d frontend backend

   # Quick verify containers are healthy:
   docker compose ps
   ```
3. **Local URLs (all via Docker):**
   - `localhost:3000` — app (frontend container)
   - `localhost:8080` — backend API (backend container)
   - DB + Redis: also in Docker (`docker compose up -d db redis`)
4. **Local DB must have correct `app_settings`** (payment_enabled, registration_enabled = true)
5. Verify all changes work locally in browser
6. Only when localhost is **stable and tested**: transfer images to VPS + deploy

**CRITICAL: Do NOT run `npm run dev` or `cargo run` directly.** The full stack runs in Docker. Killing node/next processes can kill the browser and other apps. Always use `docker compose build` + `docker compose up -d`.

**CRITICAL: Every Claude Code prompt MUST end with a Docker rebuild + restart step.** Without it, changes are invisible.

**CRITICAL: Frontend container bakes `NEXT_PUBLIC_API_URL` at build time.** The Dockerfile defaults to `https://api.sovereignhealth.io` (production). For local dev, you MUST pass the build arg:
```bash
# Local dev rebuild (points frontend to local backend):
cd ~/projects/sovereign-health
docker compose -f docker-compose.dev.yml build --build-arg NEXT_PUBLIC_API_URL=http://localhost:8080 frontend
docker compose -f docker-compose.dev.yml up -d frontend

# Backend rebuild:
docker compose -f docker-compose.dev.yml build backend
docker compose -f docker-compose.dev.yml up -d backend

# Both:
docker compose -f docker-compose.dev.yml build --build-arg NEXT_PUBLIC_API_URL=http://localhost:8080 frontend backend
docker compose -f docker-compose.dev.yml up -d frontend backend
```
Without `--build-arg`, the frontend container calls the production API instead of localhost.

**VPS is production. Do not use it as a dev/test environment.**

### Automated Testing Standard
- **Backend tests** (`core-backend/tests/`): `cargo test` before every deploy
  - All new endpoints need: 1 happy-path test, 1 auth test, 1 validation test
  - Files: `smoke.rs`, `auth_test.rs`, `integration.rs`, `e2e.rs`, `measurement_test.rs`, `property.rs`, `health_snapshot_snap`
  - Update test files when adding features or changing API contracts
- **E2E tests** (`e2e/`): Playwright (TypeScript)
  - Suites: smoke, onboarding, payment, billing, auth, admin, i18n, performance, security
  - Run before releases: `npx playwright test`
  - Spec: `T-0710_e2e_testing_spec.md`
- **Regular test maintenance**: review and update backend test files when code changes. Add to sprint checklist.

### Deployment Checklist (LOCAL BUILD → VPS)

Claude Code runs on the **local dev machine**. VPS has NO build tools (no node, npm, pnpm, cargo).

```bash
# 1. Build backend Docker image (locally)
cd ~/projects/sovereign-health/core-backend
docker builder prune -af  # if migrations changed
docker build -t registry.gitlab.com/sovereign-health/core-backend:latest .

# 2. Build frontend Docker image (locally)
cd ~/projects/sovereign-health/core-frontend
docker build -t registry.gitlab.com/sovereign-health/core-frontend:latest .

# 3. Build website static export (locally)
cd ~/projects/sovereign-health/saas/website
rm -rf .next out
pnpm build

# 4. Transfer to VPS
docker save registry.gitlab.com/sovereign-health/core-backend:latest | ssh root@72.61.154.115 "docker load"
docker save registry.gitlab.com/sovereign-health/core-frontend:latest | ssh root@72.61.154.115 "docker load"
rsync -avz --delete ~/projects/sovereign-health/saas/website/out/ root@72.61.154.115:/opt/sovereign-health/coming-soon/

# 5. Deploy on VPS
ssh root@72.61.154.115 "cd /opt/sovereign-health && docker compose -f docker-compose.prod.yml up -d --force-recreate backend frontend && docker image prune -f"

# 6. Purge Cloudflare cache (CRITICAL for JS bundle updates)

# 7. Verify
curl -s -o /dev/null -w "%{http_code}" https://sovereignhealth.io/
curl -s -o /dev/null -w "%{http_code}" https://app.sovereignhealth.io/
curl -s https://api.sovereignhealth.io/health
```

### IP Whitelist Testing
- Whitelisted IPs: `212.103.60.5`, `212.103.61.58`
- Whitelist managed in `app_settings` table (admin UI)
- Always uses `CF-Connecting-IP` header (Cloudflare)

---

## 5. File Transfer (OpenClaw ↔ Laptop)

```bash
# VPS (SSH as root):
docker cp openclaw-pgrt-openclaw-1:/data/.openclaw/workspace-swick-doctor/<FILE> /tmp/<FILE>

# Laptop (VS Code terminal):
scp root@72.61.154.115:/tmp/<FILE> ~/projects/sovereign-health/docs/specs/

# Wildcard for multiple files:
scp root@72.61.154.115:/tmp/<PREFIX>*.md ~/projects/sovereign-health/docs/specs/
```

---

## 6. Design Principles

### Content
1. No emdashes anywhere
2. Single source of truth for: marker count, features, tiers, pricing (all from DB)
3. Consistent tile styling across all pages
4. Colorful sub-headline per page (from color scheme)
5. Dr. Alex website = short, sales funnel, links. Dr. Alex app = full feature, detailed.
6. "blood markers" not "health markers"
7. All mailto: links replaced with /contact form

### Navigation
1. Settings page uses URL tab params: `/settings?tab=license`, `/settings?tab=profile`, etc.
2. Tab state persisted in URL — bookmarkable, shareable, survives refresh
3. Tab order: Profile, Devices, Thresholds, Medications, License, Security, Data & Privacy

### Fixed Header + Scrollable Content (standard pattern)
Use **flex layout** for pages with a fixed header/tab area — NOT `position: sticky`.

```tsx
{/* Page wrapper — full viewport minus global nav */}
<div className="flex flex-col h-[calc(100vh-64px)]">

  {/* Fixed header — never scrolls */}
  <div className="flex-shrink-0 bg-[#09090b] border-b border-border px-4 pt-6 pb-0">
    <h1>Page Title</h1>
    <nav>Tab bar here</nav>
  </div>

  {/* Scrollable content */}
  <div className="flex-1 overflow-y-auto px-4 pt-6 pb-12">
    {/* Tab content renders here */}
  </div>

</div>
```

**Why this over `position: sticky`:**
- No offset calculations (`top-0`, `top-64px`, etc.)
- No z-index stacking bugs
- No transparent-background bleed-through issues
- No content hidden behind the header
- Header and content are separate DOM areas — clean separation

**Rules:**
- `64px` in the calc = global app nav height (adjust to match)
- Header MUST have an opaque background color (e.g. `bg-[#09090b]` for dark mode)
- Do NOT add `position: sticky` to table headers — it causes overlapping. If column headers need to stay visible, use a separate scrollable `<div>` with fixed height for the table body instead.

Apply this pattern to: Settings page, Admin pages, and any page with a fixed header + tabs.

### Technical
1. Admin bypasses ALL license/tier checks by role
2. Privacy by design: no IP storage, no fingerprinting, no third-party tracking
3. Feature gates read from DB (not hardcoded)
4. Toast messages: top-right, translated, color-coded, auto-dismiss
5. Server-side rate limiting for all public endpoints
6. All settings admin-configurable (app_settings table)

### Privacy
1. Affiliate codes are random (not derived from user identity)
2. No raw IP addresses stored (only ephemeral hashes for rate limiting)
3. First-party cookies only
4. Anonymous data sharing: opt-out (default ON)
5. Contact via /contact form (no email addresses exposed)

---

## 7. Communication with OpenClaw (swickDoctor)

### How to request work
1. Describe the problem or feature
2. swickDoctor analyzes, consolidates, structures
3. Produces Claude Code prompts (.md files)
4. Transfer prompts to laptop via docker cp + scp
5. Feed prompts to Claude Code on VPS
6. Test, report findings, iterate

### Test Report Format
```markdown
# Test Report — [Area] — [Date]

*Tester: [email]*

## Summary
| Category | Items | Priority |
|---|---|---|
| ✅ Passed | X | — |
| 🔴 Bug fixes | Y | HIGH |
| 🟡 Improvements | Z | MEDIUM |

## Findings
*) [status]: [page URL] [description]
*) [status]: [page URL] [description]
```

---

*Update this file when processes improve. It's how we work.*
