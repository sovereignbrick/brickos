# 004 - BrickOS Platform Schema Elevation

**Version:** 1.0
**Date:** 2026-04-06
**Status:** Draft
**Scope:** Cross-cutting (affects all BrickOS apps)
**Related:**
- `003-platform-multi-tenant-specification.md` (triggers this work)
- `apps/health/sovereign-health/docs/project-files/design/021-multi-tenant-platform-offering.md`
- `api/migrations/20260316000076_organizations.sql` (current location of platform tables)

---

## 1. Executive Summary

39 tables in the SHI database are not health-specific. They serve the entire BrickOS platform: identity, authentication, organizations, billing, email, audit, and infrastructure. As BrickOS expands beyond SHI (Sovereign Link, Sovereign Voice, future apps), these tables must be elevated to a shared platform schema.

This document classifies every SHI table, defines the migration strategy, analyzes impact on the running SHI application, and identifies opportunities that this architectural change unlocks.

---

## 2. The Problem

```
CURRENT STATE:
+================================================================+
|  PostgreSQL Database (single DB, public schema)                 |
|                                                                 |
|  "SHI tables"           "Platform tables"       "Shared?"       |
|  measurements           users                   license_tiers   |
|  markers                organizations            user_profile   |
|  zones                  org_members              user_prefs     |
|  devices                app_roles                app_settings   |
|  doctor_chat_*          data_shares                             |
|  medications            audit_log                               |
|  reference_ranges       refresh_tokens                          |
|  calculated_markers     email_verifications                     |
|  import_sessions        user_mfa                                |
|  ...                    subscriptions                           |
|                         payment_events                          |
|                         short_links                             |
|                         ...                                     |
|                                                                 |
|  ALL in public schema. ALL managed by SHI migrations.           |
|  ALL require SHI API to be running for any app to access.       |
+================================================================+

PROBLEMS:
1. Sovereign Link needs users + orgs tables but shouldn't depend on SHI
2. Sovereign Voice needs service_accounts but can't add tables to SHI
3. Every new app creates coupling to SHI's migration pipeline
4. "Who owns the users table?" becomes unclear as apps multiply
5. SHI's 100+ migrations mix platform infra with health domain logic
```

---

## 3. Complete Table Classification

### Category 1: PLATFORM - Identity & Auth (4 tables)

Move to `brickos` schema. Zero SHI-specific columns.

| Table | Migration | Notes |
|---|---|---|
| `users` | 000003 | Core identity: email, password_hash, role, language, timezone, nostr_pubkey, affiliate_code, last_login_at |
| `refresh_tokens` | 000009 | JWT refresh tokens: token_hash, user_id, expires_at, device_info |
| `email_verifications` | 000037 | Password reset + email verification tokens |
| `user_mfa` | 000039 | TOTP secrets, recovery codes, backup codes |

### Category 2: PLATFORM - Organizations (5 tables)

Move to `brickos` schema. Zero SHI-specific columns.

| Table | Migration | Notes |
|---|---|---|
| `organizations` | 000076 | name, slug, org_type, tier_id, billing_email |
| `org_members` | 000076 | org_id, user_id, role, invited_by |
| `app_roles` | 000076 | org_id, user_id, app_key, role |
| `data_shares` | 000076 | owner_user_id, granted_to_user_id, org_id, app_key, scope |
| `audit_log` | 000076 | user_id, org_id, action, resource_type, metadata |

### Category 3: PLATFORM - Licensing & Billing (17 tables)

Move to `brickos` schema. Structure is app-agnostic.

| Table | Migration | Notes |
|---|---|---|
| `subscriptions` | 000038 | Stripe subscription records |
| `payment_events` | 000038 | Stripe webhook event log |
| `btc_payments` | 000050 | Strike/Lightning payment records |
| `refunds` | 000060 | Refund records |
| `invoices` | 000091 | Local Stripe invoice mirror |
| `invoice_line_items` | 000091 | Invoice detail |
| `payment_methods_cache` | 000091 | Cached Stripe payment methods |
| `customer_tax_ids` | 000091 | VAT/tax ID storage |
| `payment_gateway_status` | 000061 | Gateway health tracking |
| `promotions` | 000049 | Promo codes |
| `promotion_redemptions` | 000049 | Promo usage per user |
| `user_licenses` | 000035 | User-to-tier assignment |
| `license_events` | 000035 | License change audit trail |
| `affiliate_clicks` | 000051 | Affiliate click tracking |
| `affiliate_conversions` | 000051 | Affiliate conversion tracking |
| `affiliate_payouts` | 000051 | Affiliate payout records |
| `affiliate_commission_rates` | 000094 | Multi-level commission config |

### Category 4: PLATFORM - Communication (5 tables)

Move to `brickos` schema. Generic notification/email infrastructure.

| Table | Migration | Notes |
|---|---|---|
| `email_campaigns` | 000036 | Admin-initiated email campaigns |
| `email_sends` | 000036 | Individual email send log |
| `push_subscriptions` | 324000003 | Web Push API subscriptions |
| `newsletter_subscribers` | 000062 | GDPR double opt-in newsletter |
| `contact_submissions` | 000054 | Contact form submissions |

### Category 5: PLATFORM - Audit & Monitoring (4 tables)

Move to `brickos` schema. App-agnostic logging infrastructure.

| Table | Migration | Notes |
|---|---|---|
| `data_access_log` | 000085 | GDPR Art. 15 data access audit |
| `db_audit_log` | 404000003 | DB-level trigger audit |
| `pgaudit_events` | 406000003 | Queryable pgAudit log mirror |
| `content_audit_log` | 000044 | Content change log |

### Category 6: PLATFORM - Infrastructure (4 tables)

Move to `brickos` schema. Already designed for multi-app.

| Table | Migration | Notes |
|---|---|---|
| `app_prefixes` | 324000002 | 2-char app routing codes |
| `short_links` | 324000002 | URL shortener with app_key |
| `short_link_clicks` | 324000002 | Privacy-preserving click analytics |
| `search_index` | 405000001 | Full-text search (needs app_key column) |

### Category 7: AMBIGUOUS - Requires Refactoring Before Move (10 tables)

These have platform-appropriate structure but SHI-specific columns or data.

| Table | Issue | Refactoring |
|---|---|---|
| `license_tiers` | 20+ SHI feature columns (max_markers, chat_monthly, body_composition) | Split: generic tier (slug, name, price) stays platform. Feature limits move to `tier_features` with `app_key`. |
| `product_features` | Generic structure, but all seeded features are SHI | Add `app_key` column. Seed data becomes per-app migration. |
| `tier_features` | Generic structure, data is SHI-only | Add `app_key` column. Keep in platform. |
| `user_preferences` | 6 generic + 8 health-unit columns | Split: `brickos.user_preferences` (date_format, time_format, language). `shi.health_preferences` (glucose_unit, ketones_unit, etc.) |
| `user_profile` | gender/age (generic) + height/weight (health) + billing fields | Split into 3: `brickos.user_profile` (gender, age), `brickos.billing_profile` (vat, address), `shi.health_profile` (height, weight, waist) |
| `user_segments` | Generic email segmentation + SHI columns (diet_protocol) | Split: platform keeps engagement/onboarding columns. Health columns move to SHI. |
| `app_settings` | Key-value store, all keys SHI-specific | Add optional `app_key` column for namespacing. Table stays platform, seeded data per-app. |
| `search_index` | FTS structure generic, entity_types are SHI | Add `app_key` column. Each app seeds its own entity types. |
| `ai_usage_log` | Generic (user, model, tokens, cost) + health session_types | Add `app_key` column. Move to platform. Each app defines its own session types. |
| `ai_credit_usage` | Monthly credit pool per user | Add `app_key` for per-app credit tracking. |

### Category 8: SHI-SPECIFIC - Stays in Health Schema (53 tables)

These are purely health domain. They stay in `public` (or move to a `shi` schema for clarity).

**Health Data (13):** zones, zone_translations, zone_markers, markers, marker_translations, measurements, reference_ranges, calculated_markers, calculated_marker_values, marker_relations, protocol_effects, marker_corrections, learned_aliases

**Health Features (25):** devices, device_types, device_type_translations, labs, doctor_chat_conversations, doctor_chat_messages, doctor_chat_ratings, doctor_chat_quota, chat_agent_quota, measurement_templates, user_medications, medication_catalog, medication_marker_effects, medication_categories, medication_category_translations, influence_factors, import_sessions, import_history, report_quota, report_history, diet_protocols, diet_protocol_translations, eating_patterns, eating_pattern_translations, ai_credit_usage (health-specific quotas)

**Health Content (15):** marker_content, marker_foods, marker_supplements, marker_tests, marker_references, food_categories, food_category_translations, web_pages, web_content_sections, web_content_translations, ui_strings, ui_string_translations, content_strings

---

## 4. Summary

```
+================================================================+
|                    TABLE CLASSIFICATION                          |
|                                                                 |
|  PLATFORM (brickos schema)           SHI (shi/public schema)   |
|  ─────────────────────────           ────────────────────────   |
|  Identity & Auth:    4 tables        Health Data:   13 tables   |
|  Organizations:      5 tables        Health Features: 25 tables |
|  Licensing/Billing: 17 tables        Health Content: 15 tables  |
|  Communication:      5 tables                                   |
|  Audit/Monitoring:   4 tables        ────────────────────────   |
|  Infrastructure:     4 tables        Total SHI:     53 tables   |
|  ─────────────────────────                                      |
|  Total Platform:    39 tables        AMBIGUOUS:     10 tables   |
|                                      (refactor before moving)   |
+================================================================+
```

---

## 5. Target Architecture

```
+================================================================+
|  PostgreSQL Database                                            |
|                                                                 |
|  SCHEMA: brickos (platform services)                           |
|  ┌──────────────────────────────────────────────────────────┐  |
|  │                                                          │  |
|  │  Identity        Organizations    Billing                │  |
|  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │  |
|  │  │ users      │  │ orgs       │  │ subscriptions      │ │  |
|  │  │ refresh_   │  │ org_members│  │ payment_events     │ │  |
|  │  │   tokens   │  │ app_roles  │  │ btc_payments       │ │  |
|  │  │ email_     │  │ data_shares│  │ invoices           │ │  |
|  │  │   verifs   │  │ audit_log  │  │ affiliates_*       │ │  |
|  │  │ user_mfa   │  │            │  │ promotions         │ │  |
|  │  └────────────┘  └────────────┘  │ license_tiers (*)  │ │  |
|  │                                   │ user_licenses      │ │  |
|  │  Communication   Audit            │ tier_features (*)  │ │  |
|  │  ┌────────────┐  ┌────────────┐  └────────────────────┘ │  |
|  │  │ email_     │  │ data_      │                          │  |
|  │  │  campaigns │  │  access_log│  Infrastructure          │  |
|  │  │ email_sends│  │ db_audit   │  ┌────────────────────┐ │  |
|  │  │ push_subs  │  │ pgaudit    │  │ short_links        │ │  |
|  │  │ newsletter │  │ content_   │  │ short_link_clicks  │ │  |
|  │  │ contact    │  │   audit    │  │ app_prefixes       │ │  |
|  │  └────────────┘  └────────────┘  │ service_accounts   │ │  |
|  │                                   │ reserved_codes     │ │  |
|  │  Shared Config                    │ search_index (*)   │ │  |
|  │  ┌────────────┐                   │ app_settings (*)   │ │  |
|  │  │ user_prefs │                   └────────────────────┘ │  |
|  │  │  (*) split │                                          │  |
|  │  │ user_      │  (*) = refactored before move            │  |
|  │  │  profile   │                                          │  |
|  │  │  (*) split │                                          │  |
|  │  └────────────┘                                          │  |
|  └──────────────────────────────────────────────────────────┘  |
|                                                                 |
|  SCHEMA: shi (Sovereign Health Intelligence)                   |
|  ┌──────────────────────────────────────────────────────────┐  |
|  │  zones, markers, measurements, reference_ranges,         │  |
|  │  calculated_markers, devices, labs, doctor_chat_*,       │  |
|  │  medications, influence_factors, import_sessions,        │  |
|  │  reports, diet_protocols, eating_patterns,               │  |
|  │  marker_content, marker_foods, food_categories,          │  |
|  │  web_pages, web_content_*, ui_strings, ...               │  |
|  │                                                          │  |
|  │  health_preferences (split from user_preferences)        │  |
|  │  health_profile (split from user_profile)                │  |
|  │  ai_usage_log (health session types)                     │  |
|  └──────────────────────────────────────────────────────────┘  |
|                                                                 |
|  SCHEMA: link (Sovereign Link - standalone mode only)          |
|  ┌──────────────────────────────────────────────────────────┐  |
|  │  links, clicks, users (SQLite in standalone)             │  |
|  │  Not used in platform mode (uses brickos schema)         │  |
|  └──────────────────────────────────────────────────────────┘  |
|                                                                 |
+================================================================+
```

---

## 6. What This Unlocks (Opportunities)

### Immediate

| Opportunity | Value |
|---|---|
| **Any app can authenticate users** | Sovereign Link reads `brickos.users` directly. No SHI dependency. NOSTR NIP-98 login, email/password, MFA - all shared. |
| **Any app can check org membership** | `brickos.org_members` + `brickos.app_roles` determines access. One auth middleware, shared across apps. |
| **Service accounts for cross-app** | `brickos.service_accounts` enables Sovereign Voice -> Sovereign Link API calls without human credentials. |
| **Single billing stack** | Subscriptions, payments, invoices managed once. New apps inherit billing without reimplementing Stripe/Lightning integration. |
| **Unified affiliate system** | Affiliate clicks, conversions, and commissions work across all BrickOS apps. One affiliate code, multiple apps. |
| **Tor accessibility (.onion)** | BrickOS platform accessible over Tor with a .onion address, same as SHI. Shared Tor service configuration elevated to platform level so all apps benefit from .onion routing. |

### Medium-Term

| Opportunity | Value |
|---|---|
| **BrickOS Auth as a standalone service** | Extract `brickos` schema tables + auth handlers into a dedicated auth service. SHI and Sovereign Link become clients. Single sign-on across all apps. |
| **Platform admin panel** | Build once, serves all apps. User management, org management, billing, audit logs - not duplicated per app. |
| **Cross-app feature gating** | `brickos.tier_features` with `app_key` column: "Insight tier gets 50 SHI biomarkers + 100 Sovereign Link codes + 50 Sovereign Voice scheduled posts." One tier, multiple apps. |
| **Unified GDPR compliance** | Data access log, audit trail, right to erasure - implemented once at platform level. Each app inherits compliance. |
| **Cross-app analytics** | "User signed up via Sovereign Link affiliate -> activated SHI -> subscribed via BTC payment." Full funnel, one database. |

### Long-Term

| Opportunity | Value |
|---|---|
| **BrickOS as a platform-as-a-service** | Third parties deploy BrickOS with their own apps. The `brickos` schema is the platform foundation. Their app tables go in their own schema. |
| **Multi-database deployment** | Platform tables in a managed DB. App tables in app-specific DBs. Connected via foreign data wrappers or API gateway. Enterprise-scale separation. |
| **White-label platform distribution** | The entire `brickos` schema becomes the white-label package. Organizations run their own instance with platform services built in. |

---

## 7. Migration Strategy: How to Not Break SHI

### Principle: Zero Downtime, Zero Code Changes First

The migration must be invisible to the running SHI application. No code changes required in Phase 1. Code changes optional in Phase 2.

### Phase 1: Schema Move (Zero Code Changes)

```sql
-- Step 1: Create the brickos schema
CREATE SCHEMA IF NOT EXISTS brickos;

-- Step 2: Move platform tables (one ALTER per table)
ALTER TABLE public.users SET SCHEMA brickos;
ALTER TABLE public.refresh_tokens SET SCHEMA brickos;
ALTER TABLE public.email_verifications SET SCHEMA brickos;
ALTER TABLE public.user_mfa SET SCHEMA brickos;
ALTER TABLE public.organizations SET SCHEMA brickos;
ALTER TABLE public.org_members SET SCHEMA brickos;
ALTER TABLE public.app_roles SET SCHEMA brickos;
ALTER TABLE public.data_shares SET SCHEMA brickos;
ALTER TABLE public.audit_log SET SCHEMA brickos;
ALTER TABLE public.subscriptions SET SCHEMA brickos;
ALTER TABLE public.payment_events SET SCHEMA brickos;
-- ... (all 39 platform tables)

-- Step 3: Update SHI's search_path so it finds tables in both schemas
-- This is the key: SHI code says "SELECT * FROM users" and PostgreSQL
-- resolves it to brickos.users via search_path. ZERO code changes.
ALTER DATABASE brickos_db SET search_path = public, brickos;

-- Or per-role:
ALTER ROLE shi_api SET search_path = public, brickos;
```

**Why this is safe:**
- `ALTER TABLE SET SCHEMA` is instantaneous (metadata-only, no data copy)
- All indexes, constraints, foreign keys follow the table automatically
- `search_path` makes unqualified table references resolve correctly
- SHI queries like `SELECT * FROM users WHERE id = $1` continue working
- No SHI code changes needed
- No downtime

**When to run:**
- During a low-traffic window (Sunday night EU time)
- With SHI running (no restart needed)
- After testing on staging with a copy of production data

### Phase 2: Code Qualification (Optional, Recommended)

After Phase 1 is stable (1-2 weeks), optionally update SHI code to use schema-qualified references:

```rust
// BEFORE (works via search_path, but implicit)
sqlx::query("SELECT * FROM users WHERE id = $1")

// AFTER (explicit, self-documenting)
sqlx::query("SELECT * FROM brickos.users WHERE id = $1")

// SHI-specific tables stay unqualified or use shi schema
sqlx::query("SELECT * FROM measurements WHERE user_id = $1")
```

This is optional because `search_path` handles resolution. But explicit qualification makes it clear which tables are platform vs. app-specific.

### Phase 3: Refactor Ambiguous Tables (2-4 weeks after Phase 1)

The 10 ambiguous tables need column-level splitting before they can move.

**Priority order (highest impact first):**

| Priority | Table | Refactoring | SHI Impact |
|---|---|---|---|
| 1 | `license_tiers` | Remove 20+ SHI feature columns. Move feature limits to `tier_features` with `app_key`. | High - many SHI queries reference feature columns. Needs code changes in tier service. |
| 2 | `user_profile` | Split into `brickos.user_profile` (gender, age) + `brickos.billing_profile` (vat, address) + `shi.health_profile` (height, weight, waist) | Medium - SHI reads all three, but queries are centralized in profile handler. |
| 3 | `user_preferences` | Split into `brickos.user_preferences` (date_format, time_format, language) + `shi.health_preferences` (glucose_unit, ketones_unit, etc.) | Medium - preferences service needs updating. |
| 4 | `product_features` + `tier_features` | Add `app_key` column. Existing SHI features get `app_key = 'sovereign-health'`. | Low - additive change, no existing data breaks. |
| 5 | `app_settings` | Add `app_key` column. Existing keys namespaced to `sovereign-health`. | Low - additive change. |
| 6 | `search_index` | Add `app_key` column. Existing entities namespaced to `sovereign-health`. | Low - additive change. |
| 7 | `user_segments` | Split health columns to SHI-specific segmentation. | Low - email segmentation rarely queried. |
| 8 | `ai_usage_log` + `ai_credit_usage` | Add `app_key` column. | Low - additive. |

### Phase 4: Migration Ownership Split

After Phase 3, establish clear ownership:

```
packages/brickos-db/
  migrations/
    001_create_brickos_schema.sql        # Schema creation
    002_identity_tables.sql              # users, tokens, MFA
    003_organization_tables.sql          # orgs, members, roles
    004_billing_tables.sql               # subscriptions, payments
    005_communication_tables.sql         # email, push, newsletter
    006_audit_tables.sql                 # audit logs
    007_infrastructure_tables.sql        # short_links, app_prefixes
    008_service_accounts.sql             # service accounts
    009_reserved_codes.sql               # reserved URL codes

apps/health/sovereign-health/api/migrations/
    (existing SHI-specific migrations, renumbered)
    100_health_zones_markers.sql
    101_measurements.sql
    102_devices_labs.sql
    ...
```

New BrickOS apps add their own app-specific migrations but depend on `brickos-db` for platform tables.

---

## 8. Timing: When Is This Advisable?

### Decision Matrix

| Trigger | Do Phase 1 Now? | Notes |
|---|---|---|
| Sovereign Link standalone ships | No | Standalone uses SQLite, doesn't touch platform DB |
| Sovereign Link platform mode development starts | **Yes** | First moment another app needs `users` + `organizations` |
| Sovereign Voice needs service accounts | **Yes** | Service accounts table must be in platform schema |
| Second paying white-label org onboards | **Yes** | Org model must be platform-level before second org |
| BrickOS admin panel development starts | **Yes** | Admin panel reads from platform schema |
| Before BTC Prague (June 2026) | Recommended | Clean architecture before public demo |

### Recommended Timeline

```
April 2026:
  Week 2: Phase 1 on staging (schema move + search_path)
  Week 3: Phase 1 on production (Sunday night, zero downtime)
  Week 4: Verify SHI stable. Run consistency checks.

May 2026:
  Week 1-2: Phase 3 priority 1-3 (license_tiers, user_profile, user_preferences split)
  Week 3: Phase 3 priority 4-8 (additive app_key columns)
  Week 4: Phase 4 (migration ownership split, packages/brickos-db created)

June 2026 (before BTC Prague):
  Sovereign Link platform mode ships on clean brickos schema
  Service accounts for Sovereign Voice operational
  Admin panel prototype reads from brickos schema
```

### Risk Mitigation

| Risk | Mitigation |
|---|---|
| search_path breaks a query | Test ALL SHI API endpoints on staging before production. Automated test suite catches regressions. |
| Foreign key across schemas | PostgreSQL handles cross-schema FKs natively. `shi.measurements.user_id REFERENCES brickos.users(id)` works. |
| RLS policies reference moved tables | RLS policies follow the table. `SET search_path` in RLS policy functions resolves correctly. Verify on staging. |
| Backup/restore complexity | `pg_dump` with `--schema=brickos --schema=public` captures everything. Test restore on staging. |
| ORM/migration tool confusion | sqlx migrations use raw SQL - no ORM magic. Schema-qualified names work as-is. |

---

## 9. New Platform Tables (Created During Elevation)

These tables don't exist yet. Create them directly in the `brickos` schema.

```sql
-- Service accounts for cross-app API access
CREATE TABLE brickos.service_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200),
    org_id UUID NOT NULL REFERENCES brickos.organizations(id),
    api_key_hash VARCHAR(64) NOT NULL,
    scopes TEXT[] NOT NULL,
    rate_limit_daily INT NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_by UUID REFERENCES brickos.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rotated_at TIMESTAMPTZ
);

-- Support key rotation (overlap period)
CREATE TABLE brickos.service_account_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_account_id UUID NOT NULL REFERENCES brickos.service_accounts(id),
    api_key_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reserved URL codes and org slugs
CREATE TABLE brickos.reserved_codes (
    code VARCHAR(50) PRIMARY KEY,
    reason TEXT NOT NULL,
    reserved_by UUID REFERENCES brickos.users(id),
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Platform org (BrickOS itself)
INSERT INTO brickos.organizations (id, name, slug, org_type, is_active)
VALUES ('00000000-0000-0000-0000-000000000000', 'BrickOS', 'brickos', 'platform', true)
ON CONFLICT (slug) DO NOTHING;
```

---

## 10. Encryption Considerations

### Current State

SHI uses AES-256-GCM encryption at rest for measurements (migration 000024). The encryption key derives from the user's password.

### Platform Elevation Impact

- **Encrypted tables stay in SHI schema.** `measurements` is the primary encrypted table - it's health-specific and stays put.
- **Platform tables are NOT encrypted at row level.** `users.email`, `organizations.name` are not encrypted (needed for queries, indexes, email sending).
- **Service account API keys ARE hashed.** SHA256, not reversible. Same pattern as user passwords (Argon2id).
- **Audit logs store no PII.** Actions and resource IDs only. User lookup via `brickos.users` join.
- **If future apps need encryption at rest,** they implement it in their own schema using the same pattern SHI uses. The encryption logic lives in a shared crate (`brickos-crypto`), not in the database layer.

### Platform-Level Encryption Requirement (Updated)

**Decision: Full encryption, no PII at platform level.** The original spec stated "Platform tables are NOT encrypted at row level." This is overridden. The BrickOS platform applies the same encryption standards as SHI (at rest, in transit, row-level encryption).

- **Platform tables MUST encrypt PII columns** (`email`, `display_name`, `nostr_pubkey`, billing fields, etc.) at rest using the same AES-256-GCM pattern used for SHI measurements.
- **All BrickOS apps inherit this encryption requirement.** Elevating to the platform level forces every new app to adhere to the high security standard from day one.
- **The shared encryption implementation** lives in `brickos-crypto` (or `packages/brickos-auth/` after auth extraction). All apps use the same crate for encrypt/decrypt operations.
- **Non-PII columns** (IDs, timestamps, flags, structural fields) do not require row-level encryption.
- **Indexed lookups on encrypted columns** (e.g., login by email) require a deterministic hash index alongside the encrypted value, same pattern SHI uses.

---

## 11. Login, Registration, Password Reset Flow (Platform-Level)

After elevation, these flows become platform services, not SHI features:

```
REGISTRATION:
  1. POST /auth/register { email, password }
  2. INSERT INTO brickos.users (email, password_hash, ...)
  3. INSERT INTO brickos.organizations (name, slug, org_type: 'personal')
  4. INSERT INTO brickos.org_members (org_id, user_id, role: 'org_owner')
  5. INSERT INTO brickos.email_verifications (user_id, token, ...)
  6. Send verification email via brickos.email_sends
  7. On verify: INSERT INTO brickos.app_roles per activated app

LOGIN:
  1. POST /auth/login { email, password }
  2. SELECT FROM brickos.users WHERE email = $1
  3. Verify Argon2id hash
  4. Check brickos.user_mfa if 2FA enabled
  5. INSERT INTO brickos.refresh_tokens
  6. Return JWT with claims: { sub, org_id, roles: { 'sovereign-health': 'user', 'sovereign-link': 'platform_user' } }

PASSWORD RESET:
  1. POST /auth/reset-request { email }
  2. INSERT INTO brickos.email_verifications (user_id, token, type: 'reset')
  3. Send reset email via brickos.email_sends
  4. POST /auth/reset-confirm { token, new_password }
  5. UPDATE brickos.users SET password_hash = $1

NOSTR LOGIN:
  1. POST /auth/nostr { event: NIP-98 signed event }
  2. Verify secp256k1 signature
  3. SELECT FROM brickos.users WHERE nostr_pubkey = $1
  4. If not found: auto-create user + personal org
  5. Return JWT

All of these flows are app-agnostic. They work for SHI, Sovereign Link, and any future app.
```

### Implementation Path

The auth handlers currently live in `apps/health/sovereign-health/api/src/handlers/auth.rs`. After elevation:

**Option A:** Keep auth handlers in SHI, shared via search_path. Other apps call SHI's auth endpoints.
**Option B:** Extract to `packages/brickos-auth/` as a shared Rust crate. Each app embeds the auth handlers.
**Option C:** Deploy auth as a separate microservice (`auth.brickos.io`). Apps delegate auth via JWT validation.

**Recommendation:** Option B first (shared crate, easy extraction), Option C later if scale demands it.

---

## 12. Monitoring and Logging (Platform-Level)

### Unified Audit Trail

```
brickos.audit_log
  |-- All user actions across all apps
  |-- user_id, org_id, action, resource_type, app_key (new column)
  |-- "helmut created a link in sovereign-link"
  |-- "maria viewed measurements in sovereign-health"

brickos.db_audit_log
  |-- All DB mutations via trigger
  |-- table_name, operation, old_row, new_row
  |-- Cross-schema: fires on brickos.* AND shi.* tables

brickos.pgaudit_events
  |-- SQL-level audit (what queries were executed)
  |-- For compliance and forensics

brickos.data_access_log
  |-- GDPR Art. 15 compliance
  |-- "Who accessed whose data, when, via which app"
```

### Platform Health Monitoring

New platform endpoint (not SHI-specific):

```
GET /api/v1/platform/health
{
  "database": { "status": "ok", "schemas": ["brickos", "public"] },
  "tables": {
    "brickos.users": { "count": 892, "last_insert": "2026-04-06T12:00:00Z" },
    "brickos.organizations": { "count": 45, "types": { "personal": 40, "clinic": 3, "enterprise": 1, "platform": 1 } },
    "brickos.short_links": { "count": 2450, "active": 2380 },
    "brickos.subscriptions": { "active": 47, "mrr_eur": 850 }
  },
  "consistency": {
    "orphan_users": 0,
    "users_without_personal_org": 0,
    "links_without_org": 0
  }
}
```

---

## 13. Open Questions

- [x] **[DECIDED] Schema name:** `brickos`. Brand-consistent, confirmed.
- [x] **[DECIDED] License tier refactoring:** Split BEFORE Phase 1. This is acceptable and keeps Phase 1 clean.
- [x] **[DECIDED] Auth extraction timing:** Extract to `packages/brickos-auth/` now (Option B). Shared Rust crate, each app embeds auth handlers. Ensure no complications with the extraction - keep the interface clean and avoid circular dependencies.
- [ ] **Cross-schema RLS:** Verify that RLS policies referencing `brickos.org_members` from `public.measurements` work correctly. Needs staging test.
- [x] **[DECIDED] Backup strategy:** YES, separate platform DB from app DBs. Platform (brickos schema) backed up separately and more frequently. App schemas backed up per-app schedule. See new section "14. Backup and BCM/DR Strategy" for details.
- [ ] **Self-hosted (OSS) implications:** Self-hosters run SHI with `SHI_MODE=oss`. Does schema separation add complexity to their Docker Compose setup? (Probably no - same DB, just different schemas.)

---

## 14. Backup and BCM/DR Strategy

The platform (brickos schema) and app schemas have different criticality profiles and must be backed up independently.

### Backup Separation

| Component | Frequency | Rationale |
|---|---|---|
| **brickos schema** (platform) | More frequent (e.g., every 1-4 hours) | Identity, auth, billing, and org data is critical for all apps. Loss here affects every service. |
| **App schemas** (shi, link, etc.) | Per-app schedule (e.g., daily or per data sensitivity) | Each app defines its own RPO based on data volume and criticality. |

### Cross-Schema Restore Procedure

- Restoring the `brickos` schema alone must leave app schemas functional (foreign keys reference platform tables).
- Restoring an app schema requires the `brickos` schema to be present and consistent.
- Restore order: `brickos` schema first, then app schemas.
- Test cross-schema restore on staging before any production restore.

### BCM and DR Strategy (To Be Defined)

The following items need a dedicated BCM/DR design document:

- **RPO (Recovery Point Objective):** Maximum acceptable data loss window. To be defined per schema.
- **RTO (Recovery Time Objective):** Maximum acceptable downtime. To be defined per schema.
- **Failover strategy:** Active-passive, multi-region, or cold standby.
- **Automated restore testing:** Regular verification that backups can be restored successfully.
- **Runbook:** Step-by-step disaster recovery procedures for operators.

---

## 15. References

- `20260316000076_organizations.sql` - Current org schema (SHI migration)
- `003-platform-multi-tenant-specification.md` - Multi-tenant hierarchy
- `021-multi-tenant-platform-offering.md` - SHI multi-tenancy architecture
- `024-url-shortener-service.md` - Shortener as shared service
- `001-sovereign-stack-vision.md` - BrickOS 7 pillars
- PostgreSQL docs: [Schema search path](https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH)
- PostgreSQL docs: [ALTER TABLE SET SCHEMA](https://www.postgresql.org/docs/current/sql-altertable.html)
