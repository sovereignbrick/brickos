---
number: 460
github_number: 401
title: "chore: licensing schema migrations (feature_registry, tier_definitions, tier_features, org_licenses, revocation, audit log)"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-a, migration]
created: 2026-04-10
priority: P0
sprint: 040
phase: A
design: 022
estimate: 0.5d
---

Create the foundation tables for the brickos-licensing platform service. Adopts feature registry from day 1 (no boolean columns on tier_definitions).

## Scope

- [ ] `feature_registry` table (slug PK, app_slug, category, name_en, name_de, description, is_active)
- [ ] `tier_definitions` table (slug, name, tagline, description, price_monthly_eur, price_annual_eur, display_order, is_active) -- replaces today's `license_tiers`
- [ ] `tier_features` join table (tier_slug, feature_slug, included, limit_value, limit_label_en, limit_label_de) PRIMARY KEY (tier_slug, feature_slug)
- [ ] `org_licenses` table (id, org_id, tier_slug, features JSONB, max_owners, max_practitioners, max_members, issued_at, expires_at, revoked_at, jwt_token TEXT, issued_by, notes, stripe_invoice_id)
- [ ] `org_licenses_revoked` (jti, revoked_at, reason)
- [ ] `admin_audit_log` (id, actor_user_id, action, target_type, target_id, payload JSONB, created_at)
- [ ] All migrations in `crates/brickos-db/migrations/` with `IF NOT EXISTS`
- [ ] Migrations apply on a fresh DB and on a staging DB copy
- [ ] Backup taken before staging migration application

## Verification

- [ ] `psql` shows all six tables created
- [ ] Foreign keys are correct (org_licenses -> organizations)
- [ ] `idx_org_licenses_org_active` partial index created (WHERE revoked_at IS NULL)

## References

- design 022 §3.3, §4.7
- Memory: `feedback_migration_modified_warning.md` -- never modify already-applied migrations
- Memory: `feedback_migration_checksum_sha384.md` -- SQLx uses SHA-384
