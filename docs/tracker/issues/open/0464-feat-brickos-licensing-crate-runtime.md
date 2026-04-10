---
number: 464
github_number: 405
title: "feat: brickos-licensing crate runtime (embedded + client modes, local cache, 370d offline grace)"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-b, feature]
created: 2026-04-10
priority: P0
sprint: 040
phase: B
design: 022
estimate: 1.5d
blocked_by: [462, 460]
---

Implement the two execution modes of `brickos-licensing` and the offline cache for self-hosted/disconnected scenarios.

## Scope

- [ ] **Embedded mode** -- direct SQL against brickos schema. Used by brickos-platform-api itself.
  - `LicensingProvider::embedded(brickos_pool)` constructor
  - All trait methods read from feature_registry, tier_definitions, tier_features, org_licenses
- [ ] **Client mode** -- HTTP + cache. Used by SHI, CRM, Link.
  - `LicensingProvider::client(platform_url, service_token, cache_dir)` constructor
  - HTTP calls to `https://platform.brickos.io/licensing/...`
  - Local cache in SQLite (`<cache_dir>/licensing-cache.db`) for self-hosted, in-mem + DB for SaaS
- [ ] **Cache freshness rules** (per design 022 §4.4):
  - Feature registry: refresh hourly, infinite stale tolerance
  - Tier definitions: refresh hourly, infinite stale tolerance
  - User license: 5-min cache, 1h warn, 24h enforce stale, **370d lockdown**
  - Org license: JWT exp is source of truth
  - Revocation list: 60s refresh
- [ ] 370-day offline grace logic: track `cache.last_successful_refresh`, lockdown to Glimpse if > 370d
- [ ] Unit tests for both modes against fixtures
- [ ] Integration test: client mode against in-process embedded mode (round trip)

## Verification

- [ ] `cargo test -p brickos-licensing` green for both modes
- [ ] Cache survives process restart
- [ ] Stale cache > 370d falls back to Glimpse with banner flag
- [ ] Embedded mode never makes HTTP calls

## References

- design 022 §4.3, §4.4
