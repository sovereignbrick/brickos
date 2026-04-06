# BrickOS Platform Documentation

Central documentation for the BrickOS platform. Platform-level docs live here, while app-specific docs remain in their respective `apps/` directories.

## Structure

```
docs/
|-- design/              # Platform design specifications
|-- adr/                 # Architecture Decision Records (platform-wide)
|-- sprint-planning/     # Sprint planning, sprints, and retrospectives
|-- releases/            # Release notes and templates
|   |-- shi/             # Sovereign Health release notes
|   |-- sovereign-link/  # Sovereign Link release notes
|-- security/            # Security policies and incident response
|-- reports/             # Project reports and summaries
|-- compliance/          # Compliance documentation
|-- strategy/            # Platform strategy docs
|-- templates/           # Document templates
|-- tracker/             # Tracking docs
|-- screenshots/         # Platform screenshots
```

## Design Documents

| # | Document | Description |
|---|----------|-------------|
| 001 | [Sovereign Stack Vision](design/001-sovereign-stack-vision.md) | Overall platform vision |
| 002 | [Nostr/Bitchat Integration](design/002-nostr-bitchat-integration.md) | Nostr and Bitchat integration design |
| 003 | [Sovereign Identity Roadmap](design/003-sovereign-identity-roadmap.md) | Identity and authentication roadmap |
| 004 | [Cashu/Tollgate/Zapstore](design/004-cashu-tollgate-zapstore.md) | Payment and distribution integration |
| 005 | [Platform Multi-Tenant](design/005-platform-multi-tenant.md) | Multi-tenant specification |
| 006 | [Platform Schema Elevation](design/006-platform-schema-elevation.md) | Schema elevation to platform level |
| 007 | [Sovereign Voice](design/007-sovereign-voice.md) | Sovereign Voice app specification |
| 008 | [Enterprise SSO](design/008-enterprise-sso.md) | Enterprise single sign-on |
| 009 | [Affiliate Hierarchy](design/009-affiliate-hierarchy.md) | Affiliate tracking and hierarchy |
| 010 | [Multi-Tenant Platform Offering](design/010-multi-tenant-platform-offering.md) | Platform-as-a-service offering |
| 011 | [Deployment Architecture](design/011-deployment-architecture-scaling.md) | Deployment and scaling architecture |
| 012 | [URL Shortener Service](design/012-url-shortener-service.md) | Sovereign Link URL shortener |

## Architecture Decision Records

Platform-wide ADRs in `adr/`. These cover technology choices, infrastructure, security, billing, and DevOps decisions that affect all BrickOS apps.

Key ADRs:
- 001 - Rust/Actix backend
- 002 - SQLx (no ORM)
- 003 - PostgreSQL with pgaudit and RLS
- 004 - Field-level encryption
- 005 - Rustls (no OpenSSL)
- 007 - Dual-mode SaaS/self-hosted
- 008 - Local CI/CD (no external services)
- 009 - Docker-only development
- 010 - Monorepo structure
- 012 - Dual payment (Stripe + Strike)
- 016 - GDPR privacy architecture
- 022 - Tier features (database-driven)
- 024 - Cache middleware (layered)
- 025 - Unified AI credit pool
- 026 - PostgreSQL full-text search
- 030 - Affiliate hierarchical tracking
- 031 - Organizations multi-tenant
- 032 - GitLab backup mirror
- 034 - Staging Docker cache, production no-cache

App-specific ADRs remain in their respective app directories (e.g., SHI frontend, health-specific, AI assistant decisions).

## Sprint Planning

- [Sprint Planning Guide](sprint-planning/SPRINT_PLANNING.md) - Process and workflow
- [GitHub Project Setup](sprint-planning/GITHUB_PROJECT_SETUP.md) - Project board configuration
- `sprint-planning/sprints/` - Individual sprint plans (001-028)
- `sprint-planning/retrospectives/` - Sprint retrospectives

## Releases

- [Release Template](releases/RELEASE_TEMPLATE.md) - Template for release notes
- `releases/shi/` - Sovereign Health releases (v0.20.0 through v0.32.0)
- `releases/sovereign-link/` - Sovereign Link releases

## Security

- [Incident Response](security/incident-response.md) - Incident response procedure

## Reports

Project reports and summaries covering architecture, value propositions, and weekly status.
