# 003 - Sovereign Link: Platform Multi-Tenant Specification

**Version:** 1.1
**Date:** 2026-04-06
**Status:** Draft
**Codebase:** `apps/technology/sovereign-link/`
**Related:**
- `002-sovereign-link-specification.md` (standalone product spec)
- `apps/health/sovereign-health/docs/project-files/design/021-multi-tenant-platform-offering.md` (SHI multi-tenancy)
- `apps/health/sovereign-health/docs/project-files/design/024-url-shortener-service.md` (shortener as shared service)

---

## 1. Problem Statement

Sovereign Link was designed as two things: a standalone self-hosted URL shortener and a platform service for BrickOS affiliate links. Both specs are written. Neither addresses the organizational hierarchy needed for Sovereign Link to function as a **shared platform service** across the BrickOS ecosystem.

Today's reality:

1. **Sovereign Voice needs short links.** Every NOSTR post should use tracked `brickos.io/r/` links, not raw URLs. This is the first cross-app consumer.
2. **White-label organizations need their own link namespaces.** When DieFitmacher or Dr. Boz runs a branded SHI instance, their affiliate links need to be scoped to their organization with their own namespace.
3. **BrickOS as platform owner needs both admin AND operative access.** Admin for oversight, service accounts for API-driven link creation by other BrickOS services (Sovereign Voice, SHI).
4. **End consumers (subscribers) interact with links.** They click, they convert, they become customers. Their journey must be tracked without exposing personal data.
5. **The shared tables (users, organizations, org_members, app_roles) currently live in the SHI database schema.** As more BrickOS apps depend on them, they must be elevated to a platform-level concern.

---

## 2. Critical Architectural Decision: Platform Tables

### The Problem

The `organizations`, `org_members`, `app_roles`, `data_shares`, and `audit_log` tables were created in SHI migration `20260316000076_organizations.sql`. They live in the SHI database. But they are not SHI-specific - they serve the entire BrickOS platform.

Every new BrickOS app (Sovereign Link, Sovereign Voice, future apps) needs these tables. Running them from inside SHI creates:

- **Coupling:** Every app depends on SHI's database being available
- **Migration conflicts:** Sovereign Link cannot ALTER these tables without coordinating with SHI
- **Conceptual confusion:** "Organizations" is a platform concept, not a health concept

### Recommendation: Elevate to BrickOS Platform Schema

```
BEFORE (current):
  SHI Database
    |-- users
    |-- organizations
    |-- org_members
    |-- app_roles
    |-- data_shares
    |-- audit_log
    |-- measurements (SHI-specific)
    |-- markers (SHI-specific)
    |-- short_links (Sovereign Link)
    |-- ... all SHI tables

AFTER (proposed):
  BrickOS Platform Database (shared)
    |-- users
    |-- organizations
    |-- org_members
    |-- app_roles
    |-- data_shares
    |-- audit_log
    |-- service_accounts
    |-- short_links
    |-- short_link_clicks
    |-- app_prefixes

  SHI Application Schema (within same DB or separate)
    |-- measurements
    |-- markers
    |-- health_zones
    |-- influence_factors
    |-- ... SHI-specific tables
```

### Implementation Options

| Option | Description | Effort | Risk |
|---|---|---|---|
| **A: PostgreSQL schemas** | Same DB, different schemas: `brickos.*` for platform, `shi.*` for health | Low | Schema-qualified queries throughout SHI |
| **B: Shared DB, convention** | Same DB, prefix tables: `brickos_users`, `brickos_organizations` vs `shi_measurements` | Low | Naming discipline only |
| **C: Separate databases** | Platform DB + SHI DB. Cross-DB joins via foreign data wrappers or API calls | High | Complexity, latency |
| **D: Leave as-is, document** | Keep in SHI DB, document that these are platform tables. Other apps connect to SHI DB for platform tables. | Zero | Growing coupling, conceptual debt |

**Recommendation: Option A (PostgreSQL schemas)** - cleanest separation with zero data movement. SHI already uses the `public` schema. Move platform tables to a `brickos` schema. SHI reads from both. New apps only need access to `brickos` schema.

```sql
CREATE SCHEMA IF NOT EXISTS brickos;

-- Move platform tables
ALTER TABLE public.users SET SCHEMA brickos;
ALTER TABLE public.organizations SET SCHEMA brickos;
ALTER TABLE public.org_members SET SCHEMA brickos;
ALTER TABLE public.app_roles SET SCHEMA brickos;
ALTER TABLE public.data_shares SET SCHEMA brickos;
ALTER TABLE public.audit_log SET SCHEMA brickos;

-- SHI tables stay in public (or move to shi schema)
-- SHI search_path includes both: SET search_path = public, brickos;
```

### Impact on SHI

- All SHI queries referencing `users`, `organizations`, `org_members` continue working via `search_path`
- No code changes if `search_path` includes `brickos` schema
- Migrations for platform tables move to a shared location: `packages/brickos-db/migrations/`
- SHI-specific migrations stay in `apps/health/sovereign-health/api/migrations/`

**This is a prerequisite for multi-app platform. Must be addressed before Sovereign Link platform mode ships.**

---

## 3. Organizational Hierarchy

### The "Every User Has an Org" Pattern

The current SHI migration auto-creates a `personal` organization for every user:

```sql
-- From migration 076:
INSERT INTO organizations (name, slug, org_type, ...)
SELECT display_name, 'personal-' || user_id, 'personal', ...
FROM users;
```

This means: **every user is always inside an organization.** Even solo users. This is correct and must be preserved. It simplifies all queries (always filter by org_id) and makes white-labeling seamless (a "personal" org can be upgraded to "clinic" or "enterprise" without data migration).

### BrickOS as Organization: The Platform Org

**Decision: BrickOS itself IS an organization** - the root organization that owns the platform.

```
organizations table:
  id: "00000000-0000-0000-0000-000000000000"  (well-known UUID)
  name: "BrickOS"
  slug: "brickos"
  org_type: "platform"
  tier_id: (unlimited)
```

Why BrickOS should be an org, not "above" orgs:

1. **Uniform data model.** Every link, every action, every audit entry has an org_id. No special cases for "platform-level" entities.
2. **Service accounts belong to an org.** The Sovereign Voice service account is a member of the BrickOS org.
3. **Platform campaigns are BrickOS org campaigns.** `brickos.io/r/btc-prague` is owned by the BrickOS org.
4. **Reporting is just org-scoped queries.** Platform dashboard = BrickOS org dashboard + cross-org aggregation.

### Complete Hierarchy

```
+===========================================================================+
|                        BrickOS Platform                                    |
|                                                                            |
|  +---------------------------------------------------------------------+  |
|  |  ORG: "BrickOS" (org_type: platform)                                |  |
|  |  slug: brickos                                                      |  |
|  |  namespace: brickos.io/r/                                           |  |
|  |                                                                     |  |
|  |  Members:                                                           |  |
|  |    helmut        -> platform_admin                                  |  |
|  |    svc-voice     -> platform_service (Sovereign Voice)              |  |
|  |    svc-shi       -> platform_service (SHI backend)                  |  |
|  |                                                                     |  |
|  |  Links:                                                             |  |
|  |    brickos.io/r/shi          -> sovereignhealth.io                  |  |
|  |    brickos.io/r/btc-prague   -> sovereignhealth.io/pricing?promo=.. |  |
|  |    brickos.io/r/book         -> amazon.de/...                       |  |
|  +---------------------------------------------------------------------+  |
|                                                                            |
|  +---------------------------------------------------------------------+  |
|  |  ORG: "DieFitmacher" (org_type: clinic)                             |  |
|  |  slug: diefitmacher                                                 |  |
|  |  namespace: brickos.io/r/dfm/ (or links.diefitmacher.at/)           |  |
|  |                                                                     |  |
|  |  Members:                                                           |  |
|  |    maria         -> org_owner                                       |  |
|  |    thomas        -> org_admin                                       |  |
|  |    affiliate-01  -> org_affiliate                                   |  |
|  |                                                                     |  |
|  |  Links:                                                             |  |
|  |    brickos.io/r/dfm/spring    -> diefitmacher.at/angebot            |  |
|  |    brickos.io/r/dfm/sh01      -> app.sovereignhealth.io/?ref=...    |  |
|  +---------------------------------------------------------------------+  |
|                                                                            |
|  +---------------------------------------------------------------------+  |
|  |  ORG: "Dr. Boz Clinic" (org_type: clinic)                          |  |
|  |  slug: drboz                                                        |  |
|  |  namespace: brickos.io/r/drboz/ (or links.bfrm.co/)                |  |
|  |                                                                     |  |
|  |  Members:                                                           |  |
|  |    support-team  -> org_admin                                       |  |
|  |    affiliate-42  -> org_affiliate                                   |  |
|  |                                                                     |  |
|  |  Links:                                                             |  |
|  |    brickos.io/r/drboz/keto    -> drboz.com/keto-course              |  |
|  |    brickos.io/r/drboz/shi     -> app.sovereignhealth.io/?ref=...    |  |
|  +---------------------------------------------------------------------+  |
|                                                                            |
|  +---------------------------------------------------------------------+  |
|  |  ORG: "helmut" (org_type: personal)                                 |  |
|  |  slug: personal-<user-uuid>                                         |  |
|  |                                                                     |  |
|  |  Members:                                                           |  |
|  |    helmut        -> org_owner (auto-created on signup)              |  |
|  |                                                                     |  |
|  |  Links:                                                             |  |
|  |    brickos.io/r/sha3f2c1b9    -> app.sovereignhealth.io/?ref=...   |  |
|  +---------------------------------------------------------------------+  |
|                                                                            |
+===========================================================================+
```

---

## 4. Per-Org Namespaces

### The Problem with Global Namespace

Current design (design-024) uses global unique codes: `brickos.io/r/btc-prague`. If DieFitmacher also wants `btc-prague`, they can't have it. This limits the platform as it scales.

### Solution: Org-Prefixed Namespaces

Each organization gets a namespace prefix derived from its slug:

```
brickos.io/r/{code}              -> BrickOS org namespace (root, no prefix)
brickos.io/r/{org-slug}/{code}   -> Organization namespace
```

Examples:
```
brickos.io/r/shi                 -> BrickOS platform link
brickos.io/r/dfm/shi             -> DieFitmacher's SHI affiliate link
brickos.io/r/drboz/shi           -> Dr. Boz's SHI affiliate link
brickos.io/r/dfm/spring          -> DieFitmacher campaign
brickos.io/r/drboz/keto          -> Dr. Boz campaign
```

**Both DieFitmacher and Dr. Boz can have a `shi` code** because they live in different namespaces.

### Redirect Handler Logic (Updated)

```
GET /r/{path}

1. Split path by '/':
   - Single segment (e.g., "shi"):
     a. Check reserved codes -> serve reserved page
     b. Check BrickOS org links (org_slug = 'brickos') -> redirect
     c. Check legacy 10-char prefix codes (sha3f2c1b9) -> fast path
     d. 404
   
   - Two segments (e.g., "dfm/spring"):
     a. First segment = org_slug -> resolve org_id
     b. Second segment = code -> lookup in short_links WHERE org_id AND code
     c. Redirect or 404

2. Record click with org_id context
```

### Custom Domains as Namespace Alias

```
links.diefitmacher.at/spring  ==  brickos.io/r/dfm/spring
```

Custom domain resolves to org_id via `domain_mappings`, then code lookup is org-scoped.

### Data Model Change

```sql
-- short_links: code is unique WITHIN an org, not globally
ALTER TABLE short_links DROP CONSTRAINT IF EXISTS short_links_code_key;
ALTER TABLE short_links ADD CONSTRAINT short_links_org_code_unique 
  UNIQUE(owner_org_id, code);

-- Index for the redirect hot path
CREATE INDEX IF NOT EXISTS idx_short_links_org_code 
  ON short_links(owner_org_id, code);
```

---

## 5. Reserved Short URL Codes

Certain codes must be reserved at the platform level to prevent collisions with BrickOS products, apps, and infrastructure.

### Reserved Codes (Global, No Org Can Claim)

| Code | Reason |
|---|---|
| `shi`, `health` | Sovereign Health Intelligence |
| `voice`, `signal` | Sovereign Voice, Sovereign Signal |
| `link`, `links` | Sovereign Link itself |
| `exchange`, `finance` | Sovereign Exchange |
| `vote`, `govern` | Sovereign Vote / Governance |
| `almanac`, `energy` | Sovereign Almanac |
| `identity`, `id` | Sovereign Identity |
| `relay` | BrickOS Relay |
| `api`, `admin`, `app` | Infrastructure routes |
| `docs`, `help`, `status` | Support pages |
| `new`, `login`, `register` | Auth/UI routes |
| `bitcoin`, `btc`, `nostr` | Protocol names |
| `brickos`, `brick` | Brand |
| `book`, `podcast` | Content |
| `prague`, `btcprague` | Events (can be released after event) |

### Reserved Org Slugs

Same list applies to org slugs. Nobody can create an org with slug `health` or `bitcoin`.

### Implementation

```sql
CREATE TABLE IF NOT EXISTS reserved_codes (
    code VARCHAR(50) PRIMARY KEY,
    reason TEXT NOT NULL,
    reserved_by UUID REFERENCES users(id),
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Validate on link creation and org creation
-- Check reserved_codes table before allowing
```

---

## 6. Roles and Permissions (Updated)

### Platform-Level Roles

| Role | Scope | Description |
|---|---|---|
| `platform_admin` | BrickOS org | Full access. CRUD all orgs, users, links. Global reporting. Manage reserved codes and app_prefixes. |
| `platform_service` | BrickOS org | **Service account.** API-only access for other BrickOS apps (Sovereign Voice, SHI). Can create links, read stats. Cannot manage orgs or users. Encrypted API key stored in systemd credentials. |
| `platform_user` | BrickOS org | Regular platform user. Can create personal links in their personal org. Can view their own stats. Default role for any authenticated user. |
| `platform_viewer` | BrickOS org | Read-only. View all orgs, links, analytics. No create/edit. For reporting/monitoring. |

### Service Account Security

Service accounts (Sovereign Voice, SHI backend) need API access without human credentials:

```
+-------------------------------------------------------+
|  Service Account: svc-voice                            |
|                                                        |
|  Stored:  systemd encrypted credential on VPS          |
|  Auth:    API key (SHA256 hashed in DB)                |
|  Scopes:  links:create, links:read, links:stats       |
|  Org:     BrickOS (platform org)                       |
|  Rate:    100 links/day, 1000 stats queries/day        |
|                                                        |
|  The API key is:                                       |
|  1. Generated once by platform_admin                   |
|  2. Displayed once (never stored in plaintext)         |
|  3. Stored as SHA256 hash in service_accounts table    |
|  4. Deployed to VPS via systemd-creds encrypt          |
|  5. Injected as env var at service start               |
|  6. Never written to disk on the consumer side         |
|                                                        |
|  Rotation:                                             |
|  - Admin generates new key (old stays active 24h)      |
|  - Deploy new key to VPS                               |
|  - Confirm working                                     |
|  - Revoke old key                                      |
+-------------------------------------------------------+
```

### Service Accounts Table

```sql
CREATE TABLE IF NOT EXISTS brickos.service_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,      -- 'svc-voice', 'svc-shi'
    display_name VARCHAR(200),              -- 'Sovereign Voice Service'
    org_id UUID NOT NULL REFERENCES brickos.organizations(id),
    api_key_hash VARCHAR(64) NOT NULL,      -- SHA256 of the API key
    scopes TEXT[] NOT NULL,                 -- ['links:create', 'links:read']
    rate_limit_daily INT NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_by UUID REFERENCES brickos.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rotated_at TIMESTAMPTZ                  -- when key was last rotated
);

-- Support key rotation (two active keys during transition)
CREATE TABLE IF NOT EXISTS brickos.service_account_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_account_id UUID NOT NULL REFERENCES brickos.service_accounts(id),
    api_key_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ,                 -- null = no expiry, set during rotation
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Organization-Level Roles

| Role | Scope | Sovereign Link Permissions |
|---|---|---|
| `org_owner` | Organization | Full access within org. CRUD links, view all org analytics, manage org members, create vanity codes, manage namespace. |
| `org_admin` | Organization | Manage links and users within org. View org analytics. Cannot delete org or change owner. |
| `org_member` | Organization | Create and manage own links within org namespace. View own analytics only. |
| `org_affiliate` | Organization | Create affiliate links (auto-generated codes). View own click/conversion stats. Cannot create vanity or campaign links. |
| `org_viewer` | Organization | View org analytics. Cannot create or modify links. |

### App-Specific Role Override

```sql
-- User is org_admin in SHI but only org_member in Sovereign Link
INSERT INTO brickos.app_roles (org_id, user_id, app_key, role)
VALUES ('org-uuid', 'user-uuid', 'sovereign-link', 'org_member');
```

Resolution order:
1. Check `app_roles` for `app_key = 'sovereign-link'`
2. If not found, fall back to `org_members.role`
3. If not found, deny access

---

## 7. ASCII: Filled Table Structure

### organizations

```
+--------------------------------------+-------------------+-----------+-----------+
| id                                   | name              | slug      | org_type  |
+--------------------------------------+-------------------+-----------+-----------+
| 00000000-0000-0000-0000-000000000000 | BrickOS           | brickos   | platform  |
| a1b2c3d4-....                        | DieFitmacher      | dfm       | clinic    |
| e5f6a7b8-....                        | Dr. Boz Clinic    | drboz     | clinic    |
| f9a0b1c2-....                        | ForaCare          | fora      | enterprise|
| d3e4f5a6-....                        | Helmut (personal) | personal-d3e4.. | personal |
| b7c8d9e0-....                        | Maria (personal)  | personal-b7c8.. | personal |
+--------------------------------------+-------------------+-----------+-----------+
```

### org_members

```
+--------------------------------------+--------------------------------------+--------------+
| org_id                               | user_id                              | role         |
+--------------------------------------+--------------------------------------+--------------+
| 00..00 (BrickOS)                     | helmut-uuid                          | org_owner    |
| 00..00 (BrickOS)                     | svc-voice-uuid                       | org_member   |
| 00..00 (BrickOS)                     | svc-shi-uuid                         | org_member   |
| a1b2.. (DieFitmacher)                | maria-uuid                           | org_owner    |
| a1b2.. (DieFitmacher)                | thomas-uuid                          | org_admin    |
| a1b2.. (DieFitmacher)                | affiliate01-uuid                     | org_member   |
| e5f6.. (Dr. Boz)                     | support-uuid                         | org_admin    |
| e5f6.. (Dr. Boz)                     | affiliate42-uuid                     | org_member   |
| d3e4.. (Helmut personal)             | helmut-uuid                          | org_owner    |
| b7c8.. (Maria personal)              | maria-uuid                           | org_owner    |
+--------------------------------------+--------------------------------------+--------------+

Note: Helmut is in 3 orgs: BrickOS (platform_admin), DieFitmacher (none - not a member),
      and his personal org. Maria is in 2: DieFitmacher (org_owner) and her personal org.
```

### app_roles

```
+--------------------------------------+--------------------------------------+----------------+-----------------+
| org_id                               | user_id                              | app_key        | role            |
+--------------------------------------+--------------------------------------+----------------+-----------------+
| 00..00 (BrickOS)                     | helmut-uuid                          | sovereign-link | platform_admin  |
| 00..00 (BrickOS)                     | helmut-uuid                          | sovereign-voice| platform_admin  |
| 00..00 (BrickOS)                     | svc-voice-uuid                       | sovereign-link | platform_service|
| 00..00 (BrickOS)                     | svc-shi-uuid                         | sovereign-link | platform_service|
| a1b2.. (DieFitmacher)                | maria-uuid                           | sovereign-link | org_owner       |
| a1b2.. (DieFitmacher)                | maria-uuid                           | sovereign-health| org_owner      |
| a1b2.. (DieFitmacher)                | thomas-uuid                          | sovereign-link | org_admin       |
| a1b2.. (DieFitmacher)                | thomas-uuid                          | sovereign-health| org_viewer     |
| a1b2.. (DieFitmacher)                | affiliate01-uuid                     | sovereign-link | org_affiliate   |
| e5f6.. (Dr. Boz)                     | support-uuid                         | sovereign-link | org_admin       |
| e5f6.. (Dr. Boz)                     | affiliate42-uuid                     | sovereign-link | org_affiliate   |
| d3e4.. (Helmut personal)             | helmut-uuid                          | sovereign-link | platform_user   |
| d3e4.. (Helmut personal)             | helmut-uuid                          | sovereign-health| user           |
+--------------------------------------+--------------------------------------+----------------+-----------------+

Note: Thomas is org_admin in Sovereign Link but only org_viewer in SHI.
      This is the app-specific role override in action.
```

### short_links (with org namespaces)

```
+--------------------------------------+--------------------------------------+--------+--------+-----------+------+
| id                                   | owner_org_id                         | code   | ns     | link_type | target_url                              |
+--------------------------------------+--------------------------------------+--------+--------+-----------+-----------------------------------------+
| link-01                              | 00..00 (BrickOS)                     | shi    | (root) | internal  | https://sovereignhealth.io              |
| link-02                              | 00..00 (BrickOS)                     | btc-prague | (root) | campaign | https://sovereignhealth.io/pricing?..   |
| link-03                              | 00..00 (BrickOS)                     | book   | (root) | internal  | https://amzn.to/4mW2pK4                |
| link-04                              | a1b2.. (DieFitmacher)                | shi    | dfm    | affiliate | https://app.sovereignhealth.io/?ref=..  |
| link-05                              | a1b2.. (DieFitmacher)                | spring | dfm    | campaign  | https://diefitmacher.at/angebot         |
| link-06                              | e5f6.. (Dr. Boz)                     | shi    | drboz  | affiliate | https://app.sovereignhealth.io/?ref=..  |
| link-07                              | e5f6.. (Dr. Boz)                     | keto   | drboz  | campaign  | https://drboz.com/keto-course           |
| link-08                              | d3e4.. (Helmut personal)             | sha3f2c1b9 | (auto) | affiliate | https://app.sovereignhealth.io/?ref=.. |
+--------------------------------------+--------------------------------------+--------+--------+-----------+-----------------------------------------+

Resulting URLs:
  brickos.io/r/shi            -> sovereignhealth.io          (BrickOS org, root namespace)
  brickos.io/r/dfm/shi        -> app.sovereignhealth.io/?ref=..  (DieFitmacher namespace)
  brickos.io/r/drboz/shi      -> app.sovereignhealth.io/?ref=..  (Dr. Boz namespace)
  brickos.io/r/dfm/spring     -> diefitmacher.at/angebot
  brickos.io/r/drboz/keto     -> drboz.com/keto-course
  brickos.io/r/sha3f2c1b9     -> app.sovereignhealth.io/?ref=..  (legacy auto-code, no namespace)
```

### service_accounts

```
+--------------------------------------+------------+-------------------+--------------------------------------+----------------------------+
| id                                   | name       | display_name      | org_id                               | scopes                     |
+--------------------------------------+------------+-------------------+--------------------------------------+----------------------------+
| svc-voice-uuid                       | svc-voice  | Sovereign Voice   | 00..00 (BrickOS)                     | links:create,links:read,   |
|                                      |            | Service           |                                      | links:stats                |
| svc-shi-uuid                         | svc-shi    | Sovereign Health  | 00..00 (BrickOS)                     | links:create,links:read,   |
|                                      |            | Service           |                                      | links:stats,affiliates:read|
+--------------------------------------+------------+-------------------+--------------------------------------+----------------------------+
```

---

## 8. Reporting Hierarchy (Updated)

### Level 0: Platform Dashboard (BrickOS Org - Admin View)

The platform admin sees all organizations, all links, all metrics:

```
BrickOS Platform Overview
                            Orgs    Links    Clicks    Conversions    Revenue
All                           4     2,450    145,000   3,420          EUR 85,500
|
+-- BrickOS (platform)        -       290      4,600     110          EUR  2,750
|   +-- Campaigns              15      2,100      52          EUR  1,300
|   +-- Sovereign Voice        25      1,200      20          EUR    500
|   +-- Internal               10      1,300      38          EUR    950
|
+-- DieFitmacher (clinic)     45       120      8,400     210          EUR  5,250
|   +-- Affiliates             85      6,200     165          EUR  4,125
|   +-- Campaigns              25      1,800      35          EUR    875
|   +-- Vanity                 10        400      10          EUR    250
|
+-- Dr. Boz Clinic (clinic)  320       340     42,000   1,200          EUR 30,000
|
+-- Personal orgs (sum)       527     1,700     90,000   1,900          EUR 47,500
```

### Level 0: Platform Dashboard (BrickOS Org - Operative View)

Service accounts and platform_users see the operative interface:

```
BrickOS Service Dashboard (svc-voice)

Your Links:               25 active
Clicks (7d):              340
Links created (today):    2 / 100 (daily limit)

Recent Activity:
  2026-04-06 10:00  Published pob-day01  ->  brickos.io/r/pob1  (47 clicks)
  2026-04-05 10:00  Published pob-intro  ->  brickos.io/r/pob0  (120 clicks)

[Create Link]  [View Stats]  [Export]
```

### Level 1: Organization Dashboard (Org Admin)

```
DieFitmacher - Link Analytics
                        Links    Clicks    Conversions    Revenue
Total                     120      8,400     210          EUR 5,250

Top Affiliates:
  maria (dfm/maria-shi)    1      2,400      67          EUR 1,675
  thomas (dfm/thomas-shi)  1      1,100      28          EUR   700

Campaigns:
  dfm/spring               1        800      15          EUR   375
```

### Level 2: User Dashboard (Individual)

```
Your Links (within DieFitmacher)
Link                         Clicks    Conversions    Commission
brickos.io/r/dfm/maria-shi    2,400    67            EUR 335
Total                          2,400    67            EUR 335
```

---

## 9. DB Consistency: Personal Orgs and White-Label Transition

### The Invariant

**Every user always belongs to exactly one personal org (as org_owner) plus zero or more other orgs.**

```
On user signup:
  1. CREATE user in brickos.users
  2. CREATE organization (org_type: 'personal', slug: 'personal-{user_id}')
  3. CREATE org_member (user_id, personal_org_id, role: 'org_owner')
  4. SET users.default_org_id = personal_org_id
```

### White-Label Transition

When a personal user becomes part of a white-label org:

```
BEFORE:
  User: maria
  Orgs: personal-maria (org_owner)

AFTER (added to DieFitmacher):
  User: maria
  Orgs: personal-maria (org_owner), DieFitmacher (org_owner)
  Active context: DieFitmacher (set via JWT or X-Org-Id header)
```

Maria's personal org still exists. Her personal links stay in her personal namespace. Her DieFitmacher links live in the `dfm/` namespace.

### Consistency Checks

```sql
-- Every user must have exactly one personal org
SELECT u.id, COUNT(o.id) as personal_orgs
FROM brickos.users u
LEFT JOIN brickos.org_members om ON om.user_id = u.id
LEFT JOIN brickos.organizations o ON o.id = om.org_id AND o.org_type = 'personal'
GROUP BY u.id
HAVING COUNT(o.id) != 1;
-- Should return 0 rows

-- Every personal org must have exactly one member (the owner)
SELECT o.id, COUNT(om.id) as members
FROM brickos.organizations o
JOIN brickos.org_members om ON om.org_id = o.id
WHERE o.org_type = 'personal'
GROUP BY o.id
HAVING COUNT(om.id) != 1;
-- Should return 0 rows

-- No orphan links (every link must have a valid org)
SELECT sl.id FROM short_links sl
LEFT JOIN brickos.organizations o ON o.id = sl.owner_org_id
WHERE o.id IS NULL;
-- Should return 0 rows
```

Run these as part of a nightly health check or migration validator.

---

## 10. Sovereign Voice Integration (Updated)

### Service Account Flow

```
1. Sovereign Voice starts on VPS
2. Reads API key from systemd encrypted credential
3. Before publishing a NOSTR note:
   POST brickos.io/api/v1/service/links
   Authorization: Bearer <svc-voice-api-key>
   {
     "target_url": "https://sovereignhealth.io",
     "org_id": "00..00",           // BrickOS platform org
     "code": "shi",                // optional, within org namespace
     "source_app": "sovereign-voice",
     "tags": ["nostr", "pob-day01"]
   }
4. Response: { "short_url": "https://brickos.io/r/shi" }
5. Sovereign Voice replaces URL in note content
6. Publishes to NOSTR relays
7. Post-publish, queries stats:
   GET brickos.io/api/v1/service/links/shi/stats
```

---

## 11. Blind Spots and Opportunities (Updated)

### Blind Spots

| Blind Spot | Risk | Mitigation |
|---|---|---|
| **Org slug collision** | Two orgs want slug "health" | Reserved codes table prevents this. First-come for non-reserved slugs. |
| **Personal org cleanup** | User deletes account but personal org has active links | Soft-delete user and org. Links redirect to "user no longer active" page. QR codes on printed materials still resolve. |
| **Namespace squatting** | Someone creates org with slug "apple" to squat the namespace | Org creation requires platform_admin approval for non-personal orgs. Personal orgs auto-created with `personal-{uuid}` slug (not squattable). |
| **Schema migration coordination** | Moving tables to brickos schema while SHI is running | Zero-downtime via `ALTER TABLE SET SCHEMA` + search_path update. Test in staging first. |
| **Service account key compromise** | Leaked API key allows unauthorized link creation | Keys are scoped (links only, no user/org management). Rate-limited. Rotation supported with overlap period. Audit log captures all service account actions. |
| **Cross-org analytics leakage** | Org admin somehow sees another org's data | All queries include `WHERE org_id = current_org_id`. RLS enforced at DB level, not just application level. |
| **Namespace depth** | What if an org wants sub-namespaces? (e.g., dfm/team-a/link) | Not supported in v1. Max depth = 2 (org/code). Sub-namespaces are a v2 consideration. |

### Opportunities

| Opportunity | Value | Complexity |
|---|---|---|
| **Org dashboard as first BrickOS admin panel** | Sovereign Link org dashboard becomes the template for all BrickOS app admin panels. Build once, reuse. | Medium |
| **Platform health check endpoint** | `/api/v1/admin/health` returns DB consistency check results. Automated monitoring. | Low |
| **Org onboarding wizard** | Guided setup: create org, set branding, create first campaign, invite first affiliate. | Medium |
| **Cross-org benchmarking** | Anonymous: "Your org is in the top 20% for click-through rate." Opt-in only. | Medium |
| **Sovereign Link as identity provider** | Since users authenticate via NOSTR (NIP-98), Sovereign Link could become the BrickOS identity gateway. Log in once, access all apps. | High |
| **Link-based micro-payments** | Integrate Cashu or Lightning: each click costs/earns sats. Pay-per-click affiliate model without credit cards. | High |

---

## 12. Implementation Priority (Updated)

| Phase | What | Dependency |
|---|---|---|
| **Phase 1** | Standalone Sovereign Link (002-sovereign-link-specification.md). SQLite, no orgs. | None |
| **Phase 2** | Elevate platform tables to `brickos` schema. Service accounts table. | SHI migration coordination |
| **Phase 3** | Platform mode: org-scoped links, per-org namespaces, reserved codes | Phase 2 |
| **Phase 4** | Service-to-service API. Sovereign Voice integration. | Phase 3 |
| **Phase 5** | White-label: custom domains, org branding, org admin panel | Phase 3 |
| **Phase 6** | Cross-app analytics: full-funnel click -> signup -> revenue | Phase 4 + SHI billing |

---

## 13. Open Questions (Updated)

- [ ] **Schema migration timing:** When to move platform tables to `brickos` schema? Before or after Sovereign Link platform mode?
- [ ] **Org slug format:** Allow orgs to choose custom slugs (e.g., "dfm") or auto-generate from name? Custom = squatting risk. Auto = ugly URLs.
- [ ] **Service account per-app or per-instance?** Should Sovereign Voice on VPS-1 and VPS-2 share one service account or have separate ones?
- [ ] **Personal org namespace:** Should personal orgs get a namespace prefix? Currently personal affiliate links are auto-codes (sha3f2c1b9) with no namespace. Keep this?
- [ ] **Org creation approval:** Auto-approve personal orgs (yes). Auto-approve clinic/enterprise orgs (probably not). What's the approval flow?
- [ ] **Rate limits:** Per org, per user, or both? Should orgs be able to set their own member rate limits?
- [ ] **Billing scope:** Per-org billing for Sovereign Link separately, or bundled with SHI subscription tier?

---

## 14. References

- `002-sovereign-link-specification.md` - Standalone product spec
- `024-url-shortener-service.md` - Platform shortener, prefix system, affiliate integration
- `021-multi-tenant-platform-offering.md` - SHI multi-tenancy, org/role schema, RLS
- `013-affiliate-hierarchy.md` - Commission model, org-based affiliate tiers
- `001-sovereign-stack-vision.md` - BrickOS 7 pillars
- `apps/attention/sovereign-voice/docs/project-files/design/001-sovereign-voice-specification.md` - Sovereign Voice, cross-app integration
- `api/migrations/20260316000076_organizations.sql` - Current org schema (SHI)
