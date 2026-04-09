---
name: Sovereign CRM MVP
description: Privacy-first, self-hosted contact relationship management for BrickOS -- Phase 1 foundation with full auth, SHI-parity base UI, and AI provider abstraction
design: 017-sovereign-crm
pillar: data
app_key: sovereign-crm
prefix: scr
status: nearly-complete
---

# Sovereign CRM MVP

Privacy-first CRM with camera-to-CRM pipeline, meeting intelligence, and relationship graph -- all locally processed without PII leaving the infrastructure.

## MVP Scope (Sprint 036-038)

- API crate scaffold with two-pool architecture (platform read-write + app read-write)
- Frontend scaffold with full SHI-parity base UI (registration, login, MFA, navbar, settings)
- Complete auth stack: signup, login, MFA, email verification, password reset
- Core CRUD: contacts, companies, projects with contact assignment
- Universal tagging system (polymorphic, org-scoped)
- Per-field AES-256-GCM encryption for PII
- Auth middleware with org-scoped data isolation
- Settings page: profile, security (MFA), account, data & privacy
- Brand-aware UI (sovereigncrm.io vs brickos.io)
- `brickos-ai` shared crate: AiProvider trait + Anthropic + Ollama + fallback manager
- Contact detail page with activity timeline
- Meeting detail page with AI extraction
- Search overlay (Ctrl+K)
- Interactive relationship graph (Cytoscape.js)
- E2E encryption (Web Crypto)
- Background capture queue worker
- AI extraction prompt quality tuning
- i18n EN + DE
- Docker deployment to staging + production

## Status

Nearly complete -- only audio recording integration remains (#447, #453).

## Closed Issues

### Scaffold (L0)
- [x] #401 Database creation + platform registration
- [x] #390 API crate scaffold (two-pool)
- [x] #391 Frontend scaffold (full SHI-parity base UI)
- [x] #413 brickos-ai crate (AiProvider trait, Anthropic + Ollama, fallback chain)

### Schema + Auth (L1)
- [x] #402 Core table migrations (contacts, companies, projects)
- [x] #403 Tags + search migrations
- [x] #404 Auth handlers (signup, login, MFA, password reset, email verify)

### Middleware + Crypto (L2)
- [x] #414 Auth middleware + org-scoping
- [x] #405 Per-field encryption

### Core CRUD (L3)
- [x] #406 Contact CRUD + frontend
- [x] #407 Company CRUD + frontend
- [x] #408 Project CRUD + frontend

### Cross-cutting (L4)
- [x] #409 Universal tagging
- [x] #410 i18n (EN + DE)
- [x] #415 Settings page (profile, security/MFA, account, data & privacy)

### Deploy + Test (L5)
- [x] #411 Docker + deploy
- [x] #412 Smoke + integration tests

### Phase 2 features (Sprint 038)
- [x] #442 Contact detail page
- [x] #443 Meeting detail page
- [x] #444 Search overlay (Ctrl+K)
- [x] #445 Cytoscape interactive graph
- [x] #446 E2E encryption (Web Crypto)
- [x] #448 Background capture queue worker
- [x] #449 Staging nginx subdomain
- [x] #450 Production deploy
- [x] #451 Testing findings fixes
- [x] #452 AI extraction prompt quality

### Open
- [ ] #447 Audio recording (MediaRecorder)
- [ ] #453 Audio recorder integration

## Future Phases

- Phase 3: Meeting intelligence (Whisper transcription via brickos-ai, AI summaries)
- Phase 4: Quick capture mode, lead pipeline Kanban
- Phase 5: Platform integration, NOSTR export, Lightning addresses
- SHI migration: Replace hardcoded call_claude() with brickos-ai (separate sprint)
