# ADR-042: Three-Character App Prefix Naming Convention

**Status:** Accepted
**Date:** 2026-04-08

## Context

BrickOS has multiple apps, each needing identifiers across many layers: database names, Docker images, container names, environment variable prefixes, service accounts, URL shortener prefixes, and deployment scripts. Without a consistent convention, naming drifts (e.g., `sovereign-health` in some places, `sh` in others, `SHI` elsewhere).

## Decision

Each app has a canonical 3-character prefix derived from its product name. This prefix is used consistently across all infrastructure layers.

| app_key | Product | Prefix |
|---------|---------|--------|
| `sovereign-health` | Sovereign Health Intelligence | `shi` |
| `sovereign-link` | Sovereign Link | `sli` |
| `sovereign-voice` | Sovereign Voice | `svo` |
| `sovereign-crm` | Sovereign CRM | `scr` |
| `sovereign-exchange` | Sovereign Exchange | `sex` |
| `sovereign-identity` | Sovereign Identity | `sid` |

The prefix drives:
- **Database name:** `shi`, `sli`, `scr`, `svo`
- **Docker image:** `sovereignbrick/shi-api`, `sovereignbrick/sli-api`
- **Container name:** `shi-api` (prod), `shi-staging-api` (staging)
- **Env prefix:** `SHI_`, `SLI_`, `SCR_`, `SVO_`
- **Port allocation:** `shi=8080`, `sli=8082`, `scr=8084`, `svo=8086` (prod); +1 for staging
- **URL shortener prefix (app_prefixes table):** 3-char prefix for affiliate codes

Platform services use the `brickos-` prefix (not a 3-char code): `brickos-platform-api`, `brickos-auth`, `brickos-crypto`.

## Alternatives Considered

- **2-character prefixes:** (`sh`, `lk`, `sv`) -- too short, conflicts likely as apps grow, cannot be used as env prefix (e.g., `SH_` conflicts with shell conventions).
- **Full product name everywhere:** (`sovereign-health-api`, `sovereign-health-frontend`) -- verbose, hard to type in ops commands, inconsistent abbreviation across layers.
- **Arbitrary short names:** (`health`, `link`, `crm`) -- no relationship to product brand, collides with common terms.

## Consequences

**Easier:**
- One lookup from prefix to all infrastructure names (mechanical derivation)
- Short enough for quick typing in ops: `docker logs shi-api`, `SHI_PORT=8080`
- Database names are short: `\c shi` in psql
- Clear visual distinction in logs, monitoring, and container lists

**Harder:**
- Existing SHI infrastructure uses `sovereign-health-backend` (Docker) and `sh` (2-char prefix in app_prefixes). Migration required.
- 3-char prefix must be unique across all current and future apps
- Renaming Docker images is a breaking change (managed via coordinated deploy)
