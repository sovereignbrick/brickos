---
name: Sovereign CRM MVP
description: Privacy-first, self-hosted contact relationship management for BrickOS -- Phase 1 foundation with full auth, SHI-parity base UI, and AI provider abstraction
design: 017-sovereign-crm
pillar: data
app_key: sovereign-crm
prefix: scr
---

# Sovereign CRM MVP

Privacy-first CRM with camera-to-CRM pipeline, meeting intelligence, and relationship graph -- all locally processed without PII leaving the infrastructure.

## MVP Scope (Sprint 036 -- Phase 1 Foundation)

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
- i18n EN + DE
- Docker deployment to staging

## Issues

### Scaffold (L0)
- #401 Database creation + platform registration
- #390 API crate scaffold (two-pool)
- #391 Frontend scaffold (full SHI-parity base UI)
- #413 brickos-ai crate (AiProvider trait, Anthropic + Ollama, fallback chain)

### Schema + Auth (L1)
- #402 Core table migrations (contacts, companies, projects)
- #403 Tags + search migrations
- #404 Auth handlers (signup, login, MFA, password reset, email verify)

### Middleware + Crypto (L2)
- #414 Auth middleware + org-scoping
- #405 Per-field encryption

### Core CRUD (L3)
- #406 Contact CRUD + frontend
- #407 Company CRUD + frontend
- #408 Project CRUD + frontend

### Cross-cutting (L4)
- #409 Universal tagging
- #410 i18n (EN + DE)
- #415 Settings page (profile, security/MFA, account, data & privacy)

### Deploy + Test (L5)
- #411 Docker + deploy
- #412 Smoke + integration tests

## Future Phases

- Phase 2: Email ingestion pipeline, web enrichment, vCard import/export, smart lists
- Phase 3: Meeting intelligence (Whisper transcription via brickos-ai, AI summaries)
- Phase 4: Quick capture mode, lead pipeline Kanban
- Phase 5: Relationship graph (Cytoscape.js)
- Phase 6: Platform integration, NOSTR export, Lightning addresses
- SHI migration: Replace hardcoded call_claude() with brickos-ai (separate sprint)
