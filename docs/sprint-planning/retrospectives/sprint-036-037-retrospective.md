# Sprint 036-037 Retrospective -- Sovereign CRM

**Date:** 2026-04-09
**Sprints:** 036 (Phase 1 Foundation) + 037 (Phases 2-6 Full Build)
**Version:** v0.43.0
**Duration:** 2 days (2026-04-08 to 2026-04-09)

---

## What Was Delivered

### Metrics

| Metric | Value |
|--------|-------|
| API endpoints | 77 |
| Handler files | 18 |
| Backend Rust lines | 7,302 |
| brickos-ai crate | 623 lines |
| Frontend pages | 12 (11 routes + conference mode) |
| Frontend lines | 2,278 |
| Migrations | 244 lines (13 tables) |
| Tests | 48 (32 unit/integration + 16 E2E) |
| ADRs written | 3 (043, 044, 045) |
| Design docs | 3 (019, 020, sprint plans) |
| Scaffold templates | 43 files |
| Tracker issues closed | 17 |
| Tracker issues opened | 9 (for Sprint 038) |

### Features Built

**Sprint 036 (Phase 1):**
- Scaffold generator v2 (refactored from 2,066 to 210 lines + 43 templates)
- Complete auth stack (signup, login, MFA, password reset, email verify, token refresh)
- Contacts, companies, projects CRUD with per-field encryption
- Universal tagging system
- Settings page (profile, security, account, data & privacy)
- i18n EN + DE (160+ keys)
- Staging database + deploy script

**Sprint 037 (Phases 2-6):**
- brickos-ai crate (Anthropic + Ollama + failover manager)
- Camera-to-CRM pipeline (photo capture -> AI vision extraction -> contacts/companies)
- Full-text search (tsvector, reindex, suggest)
- vCard 4.0 import/export
- Smart lists (saved JSONB filters)
- Meeting intelligence (CRUD, transcribe, AI summarize, action items)
- Lead pipeline Kanban (7 stages)
- Capture processing queue
- Conference mode (rapid scanning)
- Relationship graph API (nodes, edges, clusters)
- Platform stats, NOSTR NIP-02 export, Lightning address, Sovereign Link stub
- PWA manifest + capture page

---

## What Went Well

1. **Parallel agent architecture** -- launching background agents for independent handler files was extremely effective. Multiple CRUD handlers built simultaneously.

2. **Scaffold generator** -- having the foundation auto-generated meant zero time on boilerplate. The v2 refactor (template-based) paid off immediately when bugs were found.

3. **Design-first approach** -- Design 017 (CRM spec) and Design 018 (elevation) gave clear direction. No wasted work on features that weren't needed.

4. **E2E test suite** -- 16 E2E tests against live API caught real issues (SQL column mismatches, envelope unwrapping, export SQL joins).

5. **Two-pool architecture** -- following Sprint 035's pattern from day one eliminated cross-database issues.

---

## What Went Wrong

1. **11 deployment issues found during localhost testing** -- auth handler SQL referenced wrong column names (user_preferences, totp_secret, used vs used_at, country vs country_code). Root cause: agent-generated code assumed column names without reading actual schema.

2. **Frontend hydration failures** -- `next/image` Image component broke client-side hydration. Plain `<img>` tags also failed (Turbopack overrides global Image constructor). Solution: `next/image` with `unoptimized` prop.

3. **Missing postcss.config.mjs** -- Tailwind CSS v4 produced zero utility classes without it. White unstyled page. Not caught by any test.

4. **API response envelope mismatch** -- API wraps in `{data: {...}}` but frontend read `data.token` instead of `json.data.token`. Affected login, signup, all list pages.

5. **Port hardcoding** -- frontend defaulted to `localhost:8080` (SHI) instead of `localhost:8084` (CRM). Every frontend file had this bug.

6. **Migration FK references** -- cross-schema FK constraints caused sqlx migrate to hang. Fixed by removing FKs from Phase 2+ migrations.

---

## Lessons Learned

1. **Always test against the real database schema** -- `grep -r "column_name" handlers/` after every deployment to verify SQL matches reality.

2. **Never use `next/image` in scaffold templates** -- use `next/image` with `unoptimized` prop. Documented in memory.

3. **postcss.config.mjs is mandatory** -- add to scaffold and verify CSS loads in E2E tests.

4. **Single source for API_URL** -- `api-config.ts.tmpl` with `${PROD_PORT}` prevents port drift. Never inline API URLs.

5. **Run E2E tests after every handler change** -- the 16-test E2E suite catches schema drift, envelope mismatches, and missing tables.

6. **Migration FKs cause sqlx hangs** -- omit cross-table FKs in migrations when tables are in different schemas. App-layer enforces integrity.

7. **Scaffold test is essential** -- `ops/scaffold-test.sh` caught template compilation issues. Run after every template change.

---

## Velocity

| Sprint | Days | Points Planned | Points Delivered |
|--------|------|---------------|-----------------|
| 036 | 1 | 66 | 66 |
| 037 | 1 | 105 | 95 (stubs for 4 items) |
| **Total** | **2** | **171** | **161** |

---

## Open Items for Sprint 038

| # | Issue | Priority |
|---|-------|----------|
| #442 | Contact detail page (frontend) | P1 |
| #443 | Meeting detail page (frontend) | P1 |
| #444 | Search overlay Ctrl+K | P2 |
| #445 | Cytoscape.js interactive graph | P2 |
| #446 | Client-side E2E encryption (Web Crypto) | P1 |
| #447 | Audio recording (MediaRecorder) | P2 |
| #448 | Background capture queue worker | P2 |
| #449 | Staging nginx subdomain | P1 |
| #450 | Production deploy | P1 |
