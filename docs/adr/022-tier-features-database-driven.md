# ADR 022: Tier features managed via database tables, not hardcoded

**Date:** 2026-03-24
**Status:** Accepted
**Context:** Sprint 013 — Feature-details table overhaul

## Decision

License tier features are defined in `product_features` + `tier_features` database tables, served via API, and consumed by both the website feature comparison table and the app's tier enforcement logic.

## Context

Previously, tier features were:
- Partially in `license_tiers` columns (backend enforcement)
- Partially in website locale JSON (display)
- Partially in frontend code (UI gating)

This caused drift — website showed different features than what the app enforced.

## Design

- `product_features` table: feature definitions (name, description, tooltip, category, status, icon)
- `tier_features` table: per-tier assignments (included, limit_value, limit_label)
- 7 categories: data, ai, reporting, integrations, security, compliance, support
- API endpoint: `GET /api/tiers/features` returns the full matrix
- Website reads from API (feature-details page)
- Migrations are the change mechanism (not manual DB edits)

## Consequences

- 16 migrations in Sprint 013 to restructure the feature table
- Website feature-details page is now API-driven and always current
- Pricing page still uses static locale JSON (#236 — needs sync)
- Future: app enforcement should read from same tables (#237)
