# ADR-040: Service Accounts for Cross-App API Communication

**Status:** Accepted
**Date:** 2026-04-06

## Context

Sovereign Voice needs to create short links in Sovereign Link via API. This is a machine-to-machine (service-to-service) call, not a human user action. Using a regular user account with email/password would be insecure (credentials in config files) and semantically wrong (no human user involved).

## Decision

Create a dedicated `brickos.service_accounts` table for machine identities. Service accounts:
- Belong to an organization (typically the BrickOS platform org)
- Authenticate via API key (SHA256 hashed, stored securely)
- Have scoped permissions (e.g., `links:create`, `links:read`, `links:stats`)
- Have rate limits (per-day caps)
- Support key rotation (two active keys during transition)

API keys are stored in systemd encrypted credentials on the VPS, never in plaintext files. The key is injected as an environment variable at service start.

## Alternatives Considered

- **Shared JWT with long expiry:** Simple but no scoping, no rate limiting, no rotation. One leaked token = full access.
- **OAuth2 client credentials:** Standards-based but heavyweight for internal service calls. Requires an OAuth server.
- **mTLS (mutual TLS):** Strong identity but complex certificate management for 2-3 services. Overkill.
- **Shared database access:** Services read/write directly to shared tables. No API boundary, tight coupling, no audit trail.

## Consequences

**Easier:**
- Clean API boundary between services
- Audit trail: every service account action is logged with service identity
- Key rotation without downtime (overlap period)
- Scoped permissions prevent accidental overreach

**Harder:**
- Another credential to manage per service
- API key rotation requires coordinated deployment (deploy new key, then revoke old)
- Service account table adds a new entity to the platform model
