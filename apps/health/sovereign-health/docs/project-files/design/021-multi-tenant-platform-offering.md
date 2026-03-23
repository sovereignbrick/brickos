# Design: Multi-Tenant Platform Offering -- BrickOS as a Product for Third Parties

**Status:** Draft
**Date:** 2026-03-23

## Problem

BrickOS currently operates as a single-tenant SaaS (one organization = one user/family) with a self-hosted option. The existing organization, role, and tier infrastructure was designed with multi-tenancy in mind but is not yet activated.

There is a clear market opportunity to offer BrickOS as a **platform product** to third parties:

- **Clinics & medical practices** -- manage patients, share lab results, track protocols
- **Hardware vendors** (wearables, lab devices) -- white-label health dashboard for their customers
- **Longevity practitioners / health coaches** -- manage client panels, run group protocols
- **Corporate wellness programs** -- employee health tracking with aggregate reporting

The question: How do we evolve from "app for individuals" to "platform for organizations" while preserving the sovereignty ethos, AGPL compliance, and sustainable business model?

---

## Part 1: Current Architecture Inventory

### What We Already Have

| Component | Status | Location |
|-----------|--------|----------|
| `organizations` table (personal, clinic, family, enterprise, demo) | DB schema exists | Migration 76 |
| `org_members` table (org_owner, org_admin, org_member) | DB schema exists | Migration 76 |
| `app_roles` table (practitioner, patient, viewer per app) | DB schema exists | Migration 76 |
| `data_shares` table (owner->grantee with scopes) | DB schema exists | Migration 76 |
| `audit_log` table (per-user, per-org) | DB schema exists | Migration 76 |
| Row-Level Security (user_id isolation) | Implemented | Migration 84 |
| `license_tiers` with team_sharing feature gate | Implemented | Migration 35/70 |
| Org role constants (owner, practitioner, assistant, billing_admin, patient) | Rust model exists | `brickos-db/src/models/organization.rs` |
| Data share scopes (all, measurements, measurements_readonly, trends, summary, doctor_chat) | Rust model exists | `brickos-db/src/models/organization.rs` |
| `SHI_MODE=oss` for self-hosted bypasses | Implemented | `services/tier.rs` |
| JWT Claims (sub, role, tier) | Implemented | `brickos-auth/src/jwt.rs` |

### What Is Missing

| Component | Gap |
|-----------|-----|
| API endpoints for org CRUD, member management, role assignment | Not implemented |
| API endpoints for data sharing management | Not implemented |
| org_id in JWT claims or request context | Not implemented |
| RLS policies scoped by org_id (currently user_id only) | Not implemented |
| Frontend UI for org/team management | Not implemented |
| Per-org billing (currently per-user only) | Not implemented |
| Tenant isolation at infrastructure level | Not designed |
| License key / activation system for on-premise | Not designed |
| White-label / theming per org | Not designed |
| Org-level admin panel | Not designed |

---

## Part 2: Target Customer Segments

### Segment A: Managed Multi-Tenant (SaaS)

**Who:** Clinics, longevity coaches, small practices
**Model:** They sign up on brickos.io, create an organization, invite patients/team
**Isolation:** Logical (shared DB, org_id scoping, RLS)
**Revenue:** Monthly subscription per org (team tier)

### Segment B: Dedicated Managed Instance

**Who:** Larger clinics, corporate wellness, privacy-conscious organizations
**Model:** We provision a dedicated instance (separate DB, possibly separate VPS) managed by us
**Isolation:** Physical (separate database or container stack per tenant)
**Revenue:** Higher monthly fee, includes managed ops

### Segment C: Self-Hosted / On-Premise

**Who:** Hardware vendors white-labeling, hospitals, enterprises with compliance requirements
**Model:** They run BrickOS on their own infrastructure
**Isolation:** Complete (their servers, their data)
**Revenue:** Commercial license fee (annual) + optional support contract

---

## Part 3: Multi-Tenancy Architecture

### 3.1 Logical Multi-Tenancy (Segment A -- SaaS)

This is the natural extension of what we have. Shared infrastructure, tenant isolation via org_id.

```
                    +---------------------------+
                    |     BrickOS SaaS          |
                    |     (brickos.io)          |
                    +---------------------------+
                    |  Reverse Proxy (Caddy)    |
                    +---------------------------+
                    |  API (Actix-web)          |
                    |  +---------------------+  |
                    |  | Auth Middleware      |  |
                    |  | -> extract user_id   |  |
                    |  | -> resolve org_id    |  |
                    |  | -> set RLS vars      |  |
                    |  +---------------------+  |
                    |  | Handlers             |  |
                    |  | -> org-scoped queries |  |
                    |  +---------------------+  |
                    +---------------------------+
                    |  PostgreSQL (shared)      |
                    |  +---------------------+  |
                    |  | RLS policies:        |  |
                    |  |  user_id + org_id    |  |
                    |  +---------------------+  |
                    +---------------------------+
```

**Implementation approach:**

1. **Extend JWT claims** to include `org_id` (active organization context)
2. **Add org context middleware** -- resolve org from JWT or `X-Org-Id` header
3. **Extend RLS policies** to filter by `org_id` in addition to `user_id`
4. **Add org_id FK** to all data tables (measurements, markers, templates, etc.)
5. **Implement org API endpoints** (CRUD, member management, invitation flow)
6. **Per-org billing** via Stripe with org-level subscription

**Data isolation model:**

```sql
-- Example RLS policy for measurements
CREATE POLICY measurements_org_isolation ON measurements
  USING (
    user_id = current_setting('app.current_user_id')::uuid
    OR org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = current_setting('app.current_user_id')::uuid
    )
  );

-- Scoped by data_shares for cross-user access within org
CREATE POLICY measurements_shared_access ON measurements
  USING (
    user_id IN (
      SELECT owner_user_id FROM data_shares
      WHERE granted_to_user_id = current_setting('app.current_user_id')::uuid
        AND org_id = current_setting('app.current_org_id')::uuid
        AND scope IN ('all', 'measurements', 'measurements_readonly')
        AND (expires_at IS NULL OR expires_at > NOW())
        AND revoked_at IS NULL
    )
  );
```

### 3.2 Dedicated Instance (Segment B)

For customers requiring stronger isolation. Same codebase, separate deployment.

```
+-------------------+    +-------------------+    +-------------------+
| Clinic Alpha      |    | Clinic Beta       |    | Corp Wellness     |
| (alpha.brickos.io)|    | (beta.brickos.io) |    | (acme.brickos.io) |
+-------------------+    +-------------------+    +-------------------+
| API + Frontend    |    | API + Frontend    |    | API + Frontend    |
| PostgreSQL        |    | PostgreSQL        |    | PostgreSQL        |
| (isolated stack)  |    | (isolated stack)  |    | (isolated stack)  |
+-------------------+    +-------------------+    +-------------------+
        |                         |                        |
        +-------------------------+------------------------+
                                  |
                    +---------------------------+
                    |   Management Plane        |
                    |   (provision, monitor,    |
                    |    update, backup)        |
                    +---------------------------+
```

**Implementation approach:**

1. **Parameterized Docker Compose** -- template with env vars for domain, DB creds, secrets
2. **Provisioning script** -- spin up new tenant stack from template
3. **Management plane** (future) -- API to provision, monitor, update tenant stacks
4. **Shared container registry** -- all tenants pull same images, different configs
5. **Automated backups** per tenant (already have backup gateway pattern)

### 3.3 Self-Hosted / On-Premise (Segment C)

Customer runs everything on their own infrastructure. We provide:

```
+--------------------------------------------------+
|  Customer Infrastructure                          |
|                                                   |
|  +--------------------------------------------+  |
|  | BrickOS (Docker Compose)                    |  |
|  | - API container                             |  |
|  | - Frontend container                        |  |
|  | - PostgreSQL container                      |  |
|  | - (optional) AI proxy container             |  |
|  +--------------------------------------------+  |
|  | License Key -> activates features           |  |
|  | SHI_MODE=oss (community) or                 |  |
|  | SHI_MODE=enterprise (licensed)              |  |
|  +--------------------------------------------+  |
|                                                   |
+--------------------------------------------------+
          |
          | (optional) license validation call
          v
+---------------------------+
|   BrickOS License Server  |
|   (license.brickos.io)    |
+---------------------------+
```

**License key system:**

```rust
// New: SHI_MODE values
// oss        -> community edition, no tier enforcement, no license check
// saas       -> our hosted SaaS, Stripe billing, full tier enforcement
// enterprise -> on-premise licensed, license key required, features by license
```

---

## Part 4: Licensing Architecture

### 4.1 Tier Structure -- Keep It Simple

The existing 6 SaaS tiers (Core through Horizon) remain unchanged. **Everything beyond Horizon is bespoke.**

There are no new "Clinic" or "Enterprise" tiers in the product. Instead, any third-party customer (clinic, hardware vendor, longevity coach, corporate wellness) goes through a **custom sales process** that results in a **Licensed Package** assigned to their organization.

| Tier | Target | Pricing | How It Works |
|------|--------|---------|-------------|
| **Core** (AGPL) | Self-hosters, developers | Free | AGPL, no support, no AI |
| **Glimpse** | Individuals exploring | Free | Limited markers/history |
| **Focus** | Serious individual users | EUR 9.99/mo | Full markers, 1-year history |
| **Insight** | Power users | EUR 24.99/mo | AI features, smart import |
| **Clarity** | Small teams (2 members) | EUR 49.99/mo | Team sharing |
| **Horizon** | Practices / coaches (up to 10) | EUR 99.99/mo | 10 members, API, self-hosted hybrid |
| **Licensed Package** (bespoke) | Clinics, vendors, enterprises | Custom proposal | See below |

### 4.2 Seat Types -- Staff vs. Patients

A Licensed Package org has two fundamentally different seat categories:

#### Staff Seats (higher cost)

Staff are the people who **run** the organization. They get org-level management access.

| Role | What They Can Do |
|------|-----------------|
| **owner** | Full control: settings, billing, members, audit, data |
| **practitioner** | View patient data (via data_shares), enter notes, manage protocols |
| **assistant** | Manage appointments, enter data on behalf of patients, limited patient view |
| **billing_admin** | Invoices, subscription management, no clinical data access |

Staff seats map to `org_members.role` in {owner, practitioner, assistant, billing_admin}.

#### Patient Seats (lower cost)

Patients are the people who **use** the platform to track their health. They do NOT get org management access.

| What They Can Do | What They Cannot Do |
|-----------------|-------------------|
| View own dashboard, measurements, trends | Access org settings, billing, audit |
| Enter own measurements | View other patients' data |
| Chat with Dr. Alex (if AI enabled in package) | Invite or manage other members |
| Grant/revoke data sharing to practitioners | Change org roles |
| Export own data | Access API (unless explicitly granted) |

Patient seats map to `org_members.role = 'patient'` + `app_roles.role = 'patient'`.

#### Why This Separation Matters

1. **Cost:** A clinic with 3 doctors and 200 patients should not pay the same per-seat for both. Staff seats carry admin overhead (audit, management UI, support). Patient seats are lightweight.
2. **Security:** Patients must never see org admin, billing, or other patients' data. Separate role = separate permission boundary.
3. **Scaling:** Patient count can grow 10-100x relative to staff. Pricing must reflect this.
4. **Compliance:** Audit trails must distinguish "Dr. Mueller viewed Patient X's results" from "Patient X viewed their own results."

### 4.3 Licensed Package -- Bespoke Service Model

When a third-party customer approaches us (or we approach them), we:

1. **Gather requirements** -- how many staff, how many patients, which features, deployment model, white-label needs, compliance requirements
2. **Create a custom proposal** including:
   - One-time setup fee (onboarding, data migration, branding, training)
   - Per-org base license fee (monthly or annual -- covers platform access)
   - Per-staff-seat fee (monthly -- per practitioner/assistant/billing_admin)
   - Per-patient-seat fee (monthly -- lower rate, or in blocks of 50/100/unlimited)
   - Feature selection (AI access, API access, SSO, white-label depth, etc.)
   - Support level (email, priority, dedicated, SLA terms)
   - Deployment model (shared SaaS, dedicated instance, or on-premise)
3. **Onboard the agreed conditions into code** as a Licensed Package assigned to the org

**Example proposals:**

| Customer Type | Setup Fee | Base License | Staff Seat | Patient Seat | Features |
|--------------|-----------|-------------|------------|--------------|----------|
| Small longevity clinic (3 staff, ~50 patients) | EUR 2,000 | EUR 199/mo | EUR 29/mo | EUR 5/mo | Data sharing, audit log, priority support |
| Hardware vendor white-label (5 staff, ~2000 end-users) | EUR 10,000 | EUR 499/mo | EUR 29/mo | EUR 1.50/mo | White-label full, API, custom domain, commercial license |
| Corporate wellness (10 staff, 500 employees) | EUR 5,000 | EUR 499/mo | EUR 29/mo | included (up to 500) | Dedicated instance, SSO, aggregate reporting, SLA |
| Hospital on-premise (25 staff, unlimited patients) | EUR 15,000 | EUR 1,499/mo | EUR 29/mo | unlimited | On-premise, commercial license, dedicated support, SLA, audit exports |

### 4.4 Deployment Model x Licensing Matrix

How seat limits, licensing, and billing interact across the three deployment models:

```
                    +-----------------+-------------------+-------------------+
                    | Shared SaaS     | Dedicated Instance| On-Premise        |
                    | (Segment A)     | (Segment B)       | (Segment C)       |
+-------------------+-----------------+-------------------+-------------------+
| Who hosts         | We do (shared)  | We do (isolated)  | Customer          |
| Who manages       | We do           | We do             | Customer          |
| DB isolation      | Logical (RLS)   | Physical (own DB) | Physical (own DB) |
+-------------------+-----------------+-------------------+-------------------+
| STAFF SEATS       |                 |                   |                   |
|   Limit source    | licensed_packages.max_staff         | License key       |
|   Enforced by     | API (org_members count WHERE role   | API (same logic)  |
|                   |   IN staff_roles)                   |                   |
|   Billing         | Stripe per-seat | Invoice per-seat  | Invoice per-seat  |
+-------------------+-----------------+-------------------+-------------------+
| PATIENT SEATS     |                 |                   |                   |
|   Limit source    | licensed_packages.max_patients      | License key       |
|   Enforced by     | API (org_members count WHERE role   | API (same logic)  |
|                   |   = 'patient')                      |                   |
|   Billing         | Stripe per-seat | Invoice per-seat  | Invoice per-seat  |
|                   | or block pricing| or block pricing  | or flat unlimited |
+-------------------+-----------------+-------------------+-------------------+
| ORG-LEVEL LIMITS  |                 |                   |                   |
|   Features        | licensed_packages flags             | License key flags |
|   AI quota        | licensed_packages.ai_monthly_quota  | License key       |
|   Measurements    | licensed_packages.max_measurements  | License key       |
|   White-label     | light only      | light or full     | light or full     |
|   Custom domain   | No              | Yes               | N/A (their domain)|
|   SSO             | Possible        | Yes               | Yes               |
+-------------------+-----------------+-------------------+-------------------+
| AGPL / LICENSE    |                 |                   |                   |
|   AGPL obligation | None (SaaS)     | None (we host)    | Yes (unless       |
|                   |                 |                   |  commercial_license|
|                   |                 |                   |  = true)          |
|   Commercial lic. | Not needed      | Not needed        | Required for      |
|                   |                 |                   |  proprietary mods |
|                   |                 |                   |  or white-label   |
+-------------------+-----------------+-------------------+-------------------+
| BILLING           |                 |                   |                   |
|   Setup fee       | Lower           | Medium            | Higher            |
|   Base license    | Lower           | Higher            | Highest           |
|   Payment method  | Stripe auto     | Invoice or Stripe | Invoice           |
|   Contract        | Monthly rolling | Annual minimum    | Annual minimum    |
+-------------------+-----------------+-------------------+-------------------+
```

#### How Invitation & Seat Enforcement Works

```
1. Org owner/admin clicks "Invite Member"
2. Selects role: practitioner | assistant | billing_admin | patient
3. API checks licensed_packages for this org:
   - If role is staff (practitioner/assistant/billing_admin):
       COUNT org_members WHERE role IN ('owner','practitioner','assistant','billing_admin')
       Must be < licensed_packages.max_staff (NULL = unlimited)
   - If role is patient:
       COUNT org_members WHERE role = 'patient'
       Must be < licensed_packages.max_patients (NULL = unlimited)
4. If within limits: send invitation email with token
5. If over limit: return 403 with "Staff seat limit reached" or "Patient seat limit reached"
6. On acceptance: user joins org with assigned role
   - Staff: sees org admin panel (/org/*)
   - Patient: sees only personal dashboard + data sharing controls
```

#### User-Level vs. Org-Level Licensing

| Concern | User-Level (existing tiers) | Org-Level (Licensed Package) |
|---------|---------------------------|------------------------------|
| **Who pays** | Individual user | Org owner / billing_admin |
| **What it controls** | Personal feature access (markers, AI, history) | Org-wide features + seat limits |
| **Tier source** | `user_licenses.tier_id` | `licensed_packages` on org |
| **Which takes precedence** | Org package overrides personal tier when user is acting in org context | Personal tier applies in personal org context |
| **Can a user be in both** | Yes -- a practitioner may have a personal Horizon account AND be staff in a clinic org | Switch context via org switcher |
| **AI quota** | Per-user from personal tier | Per-user but drawn from org pool if in org context |
| **Measurements** | Per-user cap from personal tier | Per-user cap from package, or unlimited |

**Context switching example:**

```
Dr. Mueller has:
  - Personal org (Horizon tier, EUR 99.99/mo she pays herself)
  - Staff member in "Longevity Clinic Munich" (Licensed Package, clinic pays)

When Dr. Mueller switches to her personal org:
  -> Horizon limits apply (10 members, API, etc.)
  -> She pays

When Dr. Mueller switches to "Longevity Clinic Munich":
  -> Licensed Package limits apply (clinic's staff/patient caps, features)
  -> Clinic pays
  -> She sees org admin panel, patient list, shared data
```

### 4.5 Licensed Package Data Model

The Licensed Package is stored in the database and enforced by the tier service, just like regular tiers -- but with per-org overrides.

```sql
-- Licensed packages are custom tier configurations per org
CREATE TABLE IF NOT EXISTS licensed_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL UNIQUE REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,              -- "Longevity Clinic Alpha Package"

    -- Seat limits (NULL = unlimited)
    max_staff INTEGER,                        -- owner + practitioner + assistant + billing_admin
    max_patients INTEGER,                     -- patient role members
    max_measurements_per_user INTEGER,        -- per-user measurement cap

    -- Feature flags
    team_sharing BOOLEAN NOT NULL DEFAULT true,
    data_sharing BOOLEAN NOT NULL DEFAULT true,
    api_access BOOLEAN NOT NULL DEFAULT true,
    ai_access BOOLEAN NOT NULL DEFAULT false,
    ai_monthly_quota_per_staff INTEGER,       -- NULL = unlimited if ai_access
    ai_monthly_quota_per_patient INTEGER,     -- NULL = unlimited if ai_access (typically lower)
    white_label_level VARCHAR(20) NOT NULL DEFAULT 'none',  -- none | light | full
    sso_enabled BOOLEAN NOT NULL DEFAULT false,
    audit_export BOOLEAN NOT NULL DEFAULT false,
    custom_domain VARCHAR(255),

    -- Commercial license (AGPL exemption)
    commercial_license BOOLEAN NOT NULL DEFAULT false,

    -- Deployment model (informational, affects support & billing)
    deployment_model VARCHAR(20) NOT NULL DEFAULT 'shared_saas',
        -- shared_saas | dedicated_instance | on_premise

    -- Billing terms (informational -- actual billing via Stripe or manual invoice)
    setup_fee_eur NUMERIC(10,2),
    base_monthly_eur NUMERIC(10,2),
    per_staff_seat_monthly_eur NUMERIC(10,2),
    per_patient_seat_monthly_eur NUMERIC(10,2),  -- NULL if patients included in base
    billing_interval VARCHAR(20) DEFAULT 'monthly',  -- monthly | annual
    contract_start DATE,
    contract_end DATE,                        -- NULL = rolling

    -- Metadata
    notes TEXT,                               -- internal notes about this deal
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);
```

**Staff roles** (counted against `max_staff`):
- owner, practitioner, assistant, billing_admin

**Patient role** (counted against `max_patients`):
- patient

**How enforcement works:**

```rust
// In services/tier.rs -- extend get_effective_limits()

// 1. Check if org has a licensed_package
// 2. If yes: use licensed_package limits/features (overrides tier)
// 3. If no: fall back to user's personal tier (existing behavior)

pub async fn get_effective_limits(
    pool: &PgPool,
    user_id: Uuid,
    org_id: Option<Uuid>,
) -> Result<EffectiveLimits, AppError> {
    if let Some(org_id) = org_id {
        if let Some(pkg) = get_licensed_package(pool, org_id).await? {
            // Determine user's role in this org for seat-specific limits
            let member = get_org_member(pool, org_id, user_id).await?;
            let is_staff = matches!(
                member.role.as_str(),
                "owner" | "practitioner" | "assistant" | "billing_admin"
            );
            return Ok(EffectiveLimits::from_package(pkg, is_staff));
        }
    }
    // Fall back to personal tier
    let tier = get_user_tier(pool, user_id).await?;
    Ok(EffectiveLimits::from_tier(tier))
}

// Seat limit check on invitation
pub async fn check_seat_available(
    pool: &PgPool,
    org_id: Uuid,
    target_role: &str,
) -> Result<bool, AppError> {
    let pkg = get_licensed_package(pool, org_id).await?
        .ok_or(AppError::Forbidden("No licensed package"))?;

    let is_staff_role = matches!(
        target_role, "owner" | "practitioner" | "assistant" | "billing_admin"
    );

    if is_staff_role {
        if let Some(max) = pkg.max_staff {
            let current = count_staff_members(pool, org_id).await?;
            return Ok(current < max);
        }
    } else {
        if let Some(max) = pkg.max_patients {
            let current = count_patient_members(pool, org_id).await?;
            return Ok(current < max);
        }
    }
    Ok(true) // NULL = unlimited
}
```

### 4.6 AGPL Impact by Customer Type

| Customer Type | AGPL Obligation | What We Do |
|--------------|----------------|------------|
| **SaaS users** (Glimpse-Horizon) | None -- they use our service | Standard SaaS |
| **Self-hosted Core** | Must keep AGPL, share modifications | Community edition |
| **Licensed (managed by us)** | None -- we host it, they use it | Licensed Package, no AGPL issue |
| **Licensed (on-premise, no modifications)** | Must comply with AGPL | Licensed Package + optional commercial license |
| **Licensed (on-premise, proprietary mods)** | AGPL violation without commercial license | Licensed Package + **commercial license required** |
| **Hardware vendor white-label** | Embedding = must share all source under AGPL | Licensed Package + **commercial license required** |

The commercial license flag in `licensed_packages.commercial_license` tracks whether this customer has paid for AGPL exemption. This is the dual-licensing revenue lever.

### 4.7 License Key for On-Premise Licensed Packages

On-premise customers receive a signed license key that encodes their Licensed Package terms.

```rust
// crates/brickos-license/src/lib.rs (new crate)

pub struct LicenseKey {
    pub key_id: Uuid,
    pub org_id: Uuid,
    pub package_name: String,
    pub max_staff: Option<u32>,          // NULL = unlimited
    pub max_patients: Option<u32>,       // NULL = unlimited
    pub features: Vec<String>,           // ["team_sharing", "api_access", "ai_access", ...]
    pub commercial_license: bool,        // AGPL exemption
    pub valid_from: DateTime<Utc>,
    pub valid_until: DateTime<Utc>,
    pub signature: String,               // Ed25519 signature by our private key
}

pub enum ValidationMode {
    Offline,     // verify signature only (air-gapped environments)
    Online,      // call license.brickos.io for validation + feature updates
}
```

**Offline validation:** License key is a signed JWT. API verifies signature on startup using embedded public key. No phone-home required. Features encoded in the key.

**Online validation (optional):** Periodic heartbeat to license.brickos.io for:
- License revocation checks
- Feature flag updates
- Usage reporting (anonymized, opt-in)
- Update notifications

---

## Part 5: Architecture for Org-Level Features

### 5.1 Org Admin Panel

A new section in the frontend for org owners/admins:

```
/org                        -> Org dashboard (member count, usage stats)
/org/members                -> Member list, invite, remove, change roles
/org/roles                  -> Role management (map to app_roles)
/org/billing                -> Org subscription, payment method, invoices
/org/settings               -> Org name, slug, branding, defaults
/org/audit                  -> Audit log viewer (who did what)
/org/data-sharing           -> Manage data sharing policies
```

### 5.2 New API Endpoints Required

```
# Organization Management
POST   /api/orgs                    -> Create organization
GET    /api/orgs                    -> List user's organizations
GET    /api/orgs/{org_id}           -> Get org details
PUT    /api/orgs/{org_id}           -> Update org
DELETE /api/orgs/{org_id}           -> Soft-delete org

# Member Management
GET    /api/orgs/{org_id}/members           -> List members
POST   /api/orgs/{org_id}/members/invite    -> Invite member (email)
PUT    /api/orgs/{org_id}/members/{user_id} -> Update member role
DELETE /api/orgs/{org_id}/members/{user_id} -> Remove member
POST   /api/orgs/{org_id}/members/accept    -> Accept invitation

# Data Sharing
GET    /api/orgs/{org_id}/shares            -> List active shares
POST   /api/orgs/{org_id}/shares            -> Create share
PUT    /api/orgs/{org_id}/shares/{share_id} -> Update scope/expiry
DELETE /api/orgs/{org_id}/shares/{share_id} -> Revoke share

# Org Billing (Segment A only)
GET    /api/orgs/{org_id}/billing           -> Subscription info
POST   /api/orgs/{org_id}/billing/subscribe -> Start org subscription
PUT    /api/orgs/{org_id}/billing/plan      -> Change plan
```

### 5.3 Permission Model

Three-layer permission check:

```
1. Global Role    (users.role: user | admin)
   -> Admin bypasses all checks

2. Org Role       (org_members.role: org_owner | org_admin | org_member)
   -> Determines what you can do within the org context

3. App Role       (app_roles.role: practitioner | patient | viewer)
   -> Determines what data you can see in a specific app

4. Data Share     (data_shares: owner -> grantee with scope)
   -> Determines which specific user's data you can access
```

**Permission matrix:**

| Action | org_owner | org_admin | org_member | practitioner | patient | viewer |
|--------|-----------|-----------|------------|--------------|---------|--------|
| Manage org settings | Yes | Yes | No | No | No | No |
| Invite members | Yes | Yes | No | No | No | No |
| Remove members | Yes | Yes (not owner) | No | No | No | No |
| View all member data | Yes | Yes | No | Yes (if shared) | No | No |
| Enter own measurements | Yes | Yes | Yes | Yes | Yes | No |
| View own data | Yes | Yes | Yes | Yes | Yes | Yes |
| View shared data | Yes | Yes | If shared | If shared | No | If shared |
| Manage billing | Yes | No | No | No | No | No |
| View audit log | Yes | Yes | No | No | No | No |
| Export org data | Yes | Yes | No | No | No | No |

### 5.4 Data Model Changes

```sql
-- Add org_id to all primary data tables
ALTER TABLE measurements ADD COLUMN org_id UUID REFERENCES organizations(id);
ALTER TABLE marker_values ADD COLUMN org_id UUID REFERENCES organizations(id);
ALTER TABLE templates ADD COLUMN org_id UUID REFERENCES organizations(id);
ALTER TABLE medications ADD COLUMN org_id UUID REFERENCES organizations(id);

-- Backfill: set org_id from user's default_org_id
UPDATE measurements m SET org_id = u.default_org_id FROM users u WHERE m.user_id = u.id;
-- (repeat for all tables)

-- Organization invitations
CREATE TABLE org_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'org_member',
    app_role VARCHAR(50),
    invited_by UUID NOT NULL REFERENCES users(id),
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organization-level settings (overrides for app_settings per org)
CREATE TABLE org_settings (
    org_id UUID NOT NULL REFERENCES organizations(id),
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    PRIMARY KEY (org_id, key)
);
```

---

## Part 6: White-Label / Theming

White-label depth is part of the Licensed Package negotiation (`white_label_level` field).

### Light White-Label (`white_label_level = 'light'`)

- Custom org logo (displayed in header)
- Custom org name in UI
- Custom color accent (primary color override)
- Custom welcome message
- Stored in `org_settings` table
- Available on shared SaaS infrastructure

### Full White-Label (`white_label_level = 'full'`)

- Complete brand replacement (logo, colors, fonts)
- Custom domain (e.g., `health.clinicname.com`) via `licensed_packages.custom_domain`
- Custom email templates (from address, branding)
- Remove "Powered by BrickOS" (or make subtle)
- Custom landing page
- Requires dedicated instance (Segment B or C)

---

## Part 7: Business Model Impact

### Revenue Streams

| Stream | Model | When |
|--------|-------|------|
| **Individual SaaS** (Glimpse-Horizon) | Self-serve subscriptions | Now (active) |
| **Licensed Package setup fees** | One-time per customer onboarding | When first licensed customer signs |
| **Licensed Package recurring** | Per-org base + per-seat where agreed | Monthly/annual after onboarding |
| **Commercial license premium** | Included in Licensed Package price for on-premise/white-label | When customer needs AGPL exemption |

### Revenue Projections (Conservative)

| Revenue Stream | Year 1 | Year 2 | Year 3 |
|---------------|--------|--------|--------|
| Individual SaaS (Glimpse-Horizon) | EUR 12,000-36,000 | EUR 36,000-100,000 | EUR 100,000-300,000 |
| Licensed Packages (setup fees) | EUR 0 | EUR 10,000-30,000 | EUR 30,000-75,000 |
| Licensed Packages (recurring) | EUR 0 | EUR 24,000-72,000 | EUR 96,000-360,000 |
| **Total** | **EUR 12,000-36,000** | **EUR 70,000-202,000** | **EUR 226,000-735,000** |

*Licensed Package projections assume 2-4 customers in Year 2, 8-15 in Year 3.*

### Pricing Strategy

1. **Individual tiers** -- unchanged, self-serve (Glimpse through Horizon)
2. **Licensed Packages** -- bespoke proposals, no public pricing page
3. **Pricing components** negotiated per customer:
   - Setup fee (one-time): covers onboarding, migration, branding, training
   - Base license (recurring): per-org platform access
   - Per-seat (recurring, optional): per practitioner, per patient block, or per member
   - Feature add-ons: AI access, SSO, white-label, commercial license
   - Support level: included in package or as separate line item

### AGPL as a Business Lever

AGPL is not a weakness -- it is the **sales engine** for commercial licenses:

```
Prospect: "We want to use BrickOS in our clinic software"
Us:       "Great! Under AGPL, you must share all modifications with your users."
Prospect: "We can't do that -- our customizations are proprietary."
Us:       "Then you need a commercial license. Let's talk pricing."
```

This is the proven model used by MySQL/Oracle, Qt/Digia, MongoDB (pre-SSPL), and GitLab.

---

## Part 8: Implementation Effort & Timeline

### Phase 1: Foundation (4-6 weeks)

**Goal:** Activate the existing org infrastructure, make team sharing work.

| Task | Effort | Dependency |
|------|--------|------------|
| Extend JWT with org_id claim | 2d | None |
| Org context middleware (resolve active org) | 2d | JWT change |
| Org CRUD API endpoints | 3d | Middleware |
| Member management API (invite, accept, remove, role change) | 5d | Org CRUD |
| Email invitation flow (invite token, accept page) | 3d | Member API |
| Add org_id to data tables + backfill migration | 2d | None |
| Extend RLS policies for org_id | 3d | org_id columns |
| Frontend: Org switcher in header | 2d | Org API |
| Frontend: Org settings page | 3d | Org API |
| Frontend: Member management page | 4d | Member API |
| Testing & hardening | 3d | All above |
| **Total Phase 1** | **~32 days (6-7 weeks at 5d/wk)** | |

### Phase 2: Data Sharing & Roles (3-4 weeks)

**Goal:** Practitioners can view patient data within org context.

| Task | Effort | Dependency |
|------|--------|------------|
| Data sharing API endpoints | 3d | Phase 1 |
| App role assignment API | 2d | Phase 1 |
| Permission checks in all handlers (org role + app role + data share) | 5d | Sharing API |
| Frontend: Data sharing management | 3d | Sharing API |
| Frontend: Patient list view (practitioner perspective) | 4d | Permission checks |
| Audit log API for org admins | 2d | Phase 1 |
| Frontend: Audit log viewer | 2d | Audit API |
| Testing | 3d | All above |
| **Total Phase 2** | **~24 days (5 weeks)** | |

### Phase 3: Licensed Packages & Org Billing (2-3 weeks)

**Goal:** Organizations can be assigned a Licensed Package; billing works at org level.

| Task | Effort | Dependency |
|------|--------|------------|
| `licensed_packages` table migration | 1d | None |
| Licensed Package CRUD (admin-only API) | 2d | Migration |
| `get_effective_limits()` -- package overrides personal tier | 3d | Package model |
| Org-level Stripe subscription (for managed customers) | 3d | Phase 1 |
| Billing admin role enforcement | 1d | Phase 2 |
| Admin UI: Licensed Package management (assign to org) | 3d | Package API |
| Testing | 2d | All above |
| **Total Phase 3** | **~15 days (3 weeks)** | |

### Phase 4: License Key System (2-3 weeks)

**Goal:** On-premise customers can activate features with a license key.

| Task | Effort | Dependency |
|------|--------|------------|
| New crate: `brickos-license` (key generation, verification) | 3d | None |
| License key generation admin tool | 2d | License crate |
| SHI_MODE=enterprise startup flow (read key, verify, set features) | 2d | License crate |
| License server API (optional online validation) | 3d | License crate |
| Extend deploy scripts for enterprise mode | 2d | Enterprise mode |
| Customer-facing install documentation | 2d | Deploy scripts |
| Testing | 2d | All above |
| **Total Phase 4** | **~16 days (3-4 weeks)** | |

### Phase 5: White-Label & Polish (2-3 weeks)

**Goal:** Clinic and Enterprise customers can customize branding.

| Task | Effort | Dependency |
|------|--------|------------|
| org_settings table + API | 2d | Phase 1 |
| Theme override system (CSS custom properties from org_settings) | 3d | org_settings |
| Logo upload + storage | 2d | org_settings |
| Custom domain support (Caddy dynamic config) | 3d | Dedicated instances |
| Frontend: Branding settings page | 2d | Theme system |
| Testing | 2d | All above |
| **Total Phase 5** | **~14 days (3 weeks)** | |

### Phase 6: Management Plane (4-6 weeks, optional)

**Goal:** Automate provisioning of dedicated instances.

| Task | Effort | Dependency |
|------|--------|------------|
| Provisioning API (create tenant stack from template) | 5d | Phase 4 |
| Monitoring integration (per-tenant health checks) | 3d | Provisioning |
| Automated backup per tenant | 2d | Provisioning |
| Update orchestration (roll out new version to all tenants) | 4d | Provisioning |
| Deprovisioning + data export | 3d | Provisioning |
| Admin dashboard for tenant management | 5d | All above |
| Testing | 3d | All above |
| **Total Phase 6** | **~25 days (5-6 weeks)** | |

### Total Timeline Summary

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Foundation | 6-7 weeks | 6-7 weeks |
| Phase 2: Data Sharing & Roles | 5 weeks | 11-12 weeks |
| Phase 3: Licensed Packages & Billing | 3 weeks | 14-15 weeks |
| Phase 4: License Keys | 3-4 weeks | 17-19 weeks |
| Phase 5: White-Label | 3 weeks | 20-22 weeks |
| Phase 6: Management Plane | 5-6 weeks (optional) | 25-28 weeks |

**Realistic timeline for a solo developer:**
- **MVP (Phase 1+2):** ~3 months -- team sharing works, practitioners can view patient data
- **First licensed customer ready (Phase 1-3):** ~4 months -- Licensed Packages assignable, org billing works
- **Full platform (Phase 1-5):** ~5-6 months -- license keys for on-premise, white-label
- **Automated ops (Phase 1-6):** ~7 months -- management plane for dedicated instances

**With a second developer, compress by ~40%.**

---

## Part 9: Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| RLS policies too complex, performance degrades | Medium | High | Benchmark early with 10+ orgs, index org_id columns |
| AGPL scares on-premise prospects | Medium | Medium | Commercial license included in Licensed Package; make it a line item, not a blocker |
| Data leakage between orgs | Low | Critical | RLS + integration tests with multi-org fixtures; security audit before first licensed customer |
| Bespoke deals consume too much engineering time | High | Medium | Standardize Licensed Package fields; limit customization to what the `licensed_packages` table supports |
| License key system circumvented | Medium | Low | Offline keys are always circumventable; focus on value (support, updates, liability) not DRM |
| First licensed customers need features we haven't built yet | High | Medium | Phase 1+2+3 must be complete before signing; be honest about timeline in proposals |
| Self-hosted customers expect free support | High | Medium | Support level is an explicit Licensed Package field; no ambiguity |
| Scope creep per customer ("can you also add X") | High | Medium | Licensed Package defines exact feature set; anything beyond is a new proposal |

---

## Part 10: Decision Points

### Decisions to Make Now

- [ ] **Phase 1 start:** Which sprint? Does this block or parallel other planned work?
- [ ] **Minimum Licensed Package floor:** What is the lowest monthly base we would accept for a bespoke customer?
- [ ] **Commercial license minimum:** What is the minimum annual fee for AGPL exemption (on-premise / white-label)?

### Decisions to Defer (until first licensed customer)

- [ ] Management plane architecture (Phase 6) -- only needed when we have 5+ dedicated instances
- [ ] SSO integration (SAML/OIDC) -- per-customer feature, design exists in [012-enterprise-sso.md](./012-enterprise-sso.md)
- [ ] White-label depth -- start with logo + colors, expand based on demand
- [ ] Community vs Enterprise build split -- feature flags are sufficient until codebase divergence becomes a problem
- [ ] Billing automation for Licensed Packages -- first customers can be invoiced manually

### Decided

- [x] **No new product tiers.** Everything beyond Horizon is a bespoke Licensed Package. No "Clinic" or "Enterprise" tier in the product.
- [x] **Pricing is per-proposal.** We gather requirements, make a custom proposal (setup fee + base + per-seat + features), customer agrees, we onboard conditions into code.
- [x] **Licensed Package assigned to org.** The `licensed_packages` table holds the agreed terms; tier service reads it as an override.

---

## Open Questions

- [ ] How to handle data portability when a member leaves an org? (Their personal data vs. org-owned data)
- [ ] Should self-hosted Core users get org features (multi-user) or only licensed tiers?
- [ ] What is the right granularity for data sharing scopes? Current 6 scopes vs. per-marker-category?
- [ ] Do we need a reseller/partner program for longevity coaches who refer clinics?
- [ ] Should Licensed Package terms be editable via admin panel or only via migration/manual DB update?

## References

- [ADR-007: Dual-Mode -- SaaS + Self-Hosted](../adr/007-dual-mode-saas-selfhosted.md)
- [Design 012: Enterprise SSO](./012-enterprise-sso.md)
- [Design 016: Licensing Strategy](./016-licensing-strategy.md)
- [Migration 76: Organizations Schema](../../api/migrations/20260316000076_organizations.sql)
- [Migration 35: License Tiers](../../api/migrations/20260310000035_batch17_licensing.sql)
- [brickos-db Organization Models](../../../../../crates/brickos-db/src/models/organization.rs)
