# ADR-047: Feature slug naming convention for brickos-licensing

**Status:** Accepted
**Date:** 2026-04-10
**Sprint:** 040

## Context

The `brickos-licensing` crate ships with a `brickos.feature_registry` table that holds every gate-able feature across every BrickOS app. The table is the master catalogue -- it's what the admin GUI multi-app feature picker reads, it's what JWT `features` arrays reference, and it's what the `has_feature("...")` runtime check uses as its source of truth.

Early sprints used ad-hoc feature names: `csv_export`, `api_access`, `custom_domain`, `mfa_totp`, etc. These worked when there was one app (SHI) but collide the moment a second app wants its own version -- `csv_export` in SHI is "export biomarker measurements as CSV", but `csv_export` in Sovereign CRM is "export leads + contacts as CSV". Same slug, different semantics, different implementation, different tier mapping. The `brickos.tier_features` join table cannot represent "CRM Horizon has crm's csv_export but not SHI's csv_export" without namespacing.

We also need cross-app features that don't belong to any single app: `custom_domain`, `priority_support`, `role_labels`. These are owned by the platform, not by SHI or CRM.

## Decision

Every feature slug in `brickos.feature_registry` MUST be namespaced as `{app}.{feature}`, where:

- **`app`** is one of the canonical app slugs (`sovereign-health`, `sovereign-crm`, `sovereign-link`, ...) or the literal string `_platform` for cross-app features.
- **`feature`** is a short, stable, lowercase, underscore-separated feature name within that app's namespace.

The `brickos.feature_registry.app_slug` column stores the namespace explicitly for fast filtering in the admin GUI feature picker. The full slug (`shi.csv_export`, `crm.lead_capture`, `_platform.custom_domain`) is the primary key and the string passed to `has_feature(...)`.

**Canonical namespaces in use today:**
- `shi.*` -- Sovereign Health Intelligence features (28 as of Sprint 040)
- `crm.*` -- Sovereign CRM features (8 as of Sprint 040 #486)
- `link.*` -- Sovereign Link features (5 as of Sprint 040 #486)
- `branding.*` -- cross-app white-label branding (`_platform` app_slug)
- `support.*` -- cross-app support tiers (`_platform` app_slug)

**Rules:**

1. **Slugs are append-only**, never renamed. Once a JWT has been issued with `features: ["shi.csv_export"]`, renaming the slug to `shi.measurement_export` would silently break every existing customer until their license is reissued. If a rename is genuinely needed, add the new slug, mark the old slug `is_active = false` in `feature_registry`, and migrate the tier_features + runtime checks in a separate step. Keep the old slug alive as a deprecated alias until no active license references it.

2. **Feature slugs are flat strings in code, not typed enums.** The string `"shi.csv_export"` is the contract. This is intentional: centralizing feature names in a Rust enum would force every app that wants to check a feature to depend on the enum crate and regenerate when features are added. Flat strings let apps call `has_feature("crm.fancy_thing")` without a code change to the shared crate. The tier-feature regression matrix test (#470) catches typos at CI time, which is safer than a type check here anyway.

3. **Categories are free-form strings, not an enum.** Each feature has a `category` field (`data`, `reporting`, `ai`, `branding`, `security`, `integrations`, `support`, `communication`). These are grouping labels for the admin GUI feature picker, not enforcement gates. Add new categories as needed; the registry is the single source of truth.

4. **Every feature carries EN + DE name + description.** The admin GUI picker is bilingual by construction. No monolingual feature may be added.

5. **Cross-app features use `_platform` as `app_slug`** and a category prefix matching the feature domain (e.g. `branding.custom_domain` with `app_slug='_platform'` and `category='branding'`).

## Alternatives Considered

- **Untyped flat slugs without namespacing** (`csv_export`, `api_access`). Collides across apps. Forces every call site to know which app's `csv_export` is meant. Rejected: this is exactly what the refactor is trying to get away from.
- **Rust enum** (`pub enum Feature { ShiCsvExport, CrmLeadCapture, ... }`). Shared crate that every app imports. Type-safe at compile time. Rejected: forces every feature addition to touch the shared crate and rebuild every downstream binary. Also forces per-app binaries to depend on the enum for every other app's features, even features they don't care about. The flat-string + registry approach avoids the dependency graph entirely.
- **Nested JSON paths** (`shi.reporting.csv_export`). More expressive but the tier_features join becomes awkward and the admin GUI picker has to render a tree instead of a flat list. Rejected as premature structure for a catalogue that's currently ~50 items.
- **UUID feature IDs with a separate lookup table for the display slug.** Strictly safer against rename since the UUID is the primary key. Rejected: makes debugging miserable (every `has_feature` call becomes a UUID, every log line becomes opaque) and trades human ergonomics for a problem that append-only slugs already solve.

## Consequences

**What becomes easier:**
- A new app can register its features in a single migration (see `brickos-db` migration 012 for the CRM + Link pattern) without touching any other app's code.
- The admin GUI feature picker (#479) is app-agnostic: it groups by `app_slug` and renders whatever is in the registry. When a new app registers features, the picker just shows them.
- `has_feature("crm.fancy_thing")` is self-documenting -- you read the call site and immediately know which app owns the feature.
- The matrix test (#470) validates the whole catalogue regardless of which app owns which slug.

**What becomes harder:**
- Slug typos at call sites are not compile errors -- they're silent test failures. Mitigation: the matrix test (#470) is mandatory for every new feature and CI-gated.
- Deprecating a feature is a two-step process (mark `is_active=false`, wait for all active licenses to expire, then drop rows in a later migration). This is strictly harder than renaming, but rename would break existing customers so this tradeoff is correct.
- Every feature needs an EN + DE name at insert time. A "TODO translation" pattern was considered and rejected -- if DE is missing at add time, it will be missing forever.

**What we learned in Sprint 040:**
- The 41-feature catalogue from migrations 011 + 012 loads and serves correctly from the new `/admin/licensing/feature-registry` endpoint (verified via smoke test on localhost).
- The multi-app feature picker in the org License tab (#479) groups features by `app_slug` and renders them in a stable order. The pattern scales naturally as new apps register.
- Rename risk is real: the retrospective notes that `GLIMPSE_MARKERS` hardcoded const promising "8 markers" silently disagreed with the canonical seed's "10 markers". The matrix test caught this. Future: when registering a new feature, always grep the codebase for the bare feature name first.

## Applies to

- Every row in `brickos.feature_registry`
- Every `has_feature("...")` call in any BrickOS app
- Every migration that inserts into `feature_registry` or `tier_features`
- The admin GUI multi-app feature picker (#479)
