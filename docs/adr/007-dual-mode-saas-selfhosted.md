# ADR-007: Dual-Mode — SaaS + Self-Hosted (AGPL-3.0)

**Status:** Accepted
**Date:** 2026-03-08

## Context
The platform's core value is health data sovereignty. Some users want a managed service for convenience; others want full control over their data by running the software on their own infrastructure.

## Decision
Offer both:
- **SaaS** at `sovereignhealth.io` with subscription tiers (Glimpse free → Horizon $99.99/mo)
- **Self-hosted** via Docker Compose under **AGPL-3.0** license

The backend checks `SHI_MODE` env var (`saas` or `oss`). In OSS mode: no Stripe, no Mailgun, no rate limiting, no tier enforcement. Registration is open by default.

## Alternatives Considered
- **SaaS only:** Simpler but contradicts sovereignty mission. Privacy-conscious users won't trust a hosted service with health data.
- **Self-hosted only:** No recurring revenue. Unsustainable for a small team.
- **MIT/Apache license:** Allows proprietary forks without contributing back. AGPL ensures derivatives remain open.

## Consequences
- **Easier:** Captures both market segments, AGPL protects against closed-source forks, self-hosted users become advocates.
- **Harder:** Must maintain two deployment paths, features must work without Stripe/Mailgun, OSS users expect support without paying.
- **Trade-off:** Higher maintenance cost for broader reach and alignment with sovereignty values.
