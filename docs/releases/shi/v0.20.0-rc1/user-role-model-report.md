<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 User, Role & Multi-Tenancy Model
 Security Architecture & Recommendations

 Version: 0.20.0-rc1 — 2026-03-17

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# User, Role & Multi-Tenancy Model

**Version:** 0.20.0-rc1
**Date:** 2026-03-17

---

## 1. Executive Summary

Sovereign Health currently operates as a **single-tenant B2C platform** with individual user accounts. The database schema already includes **organization and data-sharing tables** for future B2B (clinic/practitioner) support, but these are not yet enforced in the application layer.

This report documents what is implemented, what is prepared but inactive, and what is recommended for the clinic/patient use case — including Row-Level Security (RLS), role hierarchies, and data isolation patterns.

---

## 2. Current Implementation

### 2.1 User Table

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `email` | text | Login identifier (unique) |
| `password_hash` | text | Argon2id hash |
| `display_name` | text | Optional display name |
| `role` | text | `user` or `admin` |
| `tier` | text | Legacy tier field (superseded by `user_licenses`) |
| `locale` | varchar | `en` or `de` |
| `mfa_enabled` | boolean | TOTP 2FA active |
| `stripe_customer_id` | text | Payment reference |
| `affiliate_code` | varchar | Referral code |
| `default_org_id` | UUID | Organization FK (prepared, not enforced) |
| `is_deleted` / `deleted_at` | boolean/timestamp | Soft delete |

### 2.2 Roles — Current State

| Role | Count | Capabilities |
|------|-------|-------------|
| `user` | All regular users | CRUD own data, tier-limited features |
| `admin` | Platform operator | All user features + admin panel, unlimited tier, IP-whitelisted routes |

**Enforcement:** Two Actix extractors in `middleware/auth.rs`:
- `AuthenticatedUser` — any logged-in user (extracts user_id, role, tier from JWT)
- `AdminUser` — requires `role == "admin"`, returns 403 otherwise

### 2.3 Data Isolation — Current State

| Mechanism | Status | Implementation |
|-----------|--------|---------------|
| Application-level filtering | **Active** | Every query includes `WHERE user_id = $1` |
| Foreign key constraints | **Active** | 42 FK references to `users.id` |
| Cascade delete | **Active** | 22 tables CASCADE, 20 tables NO ACTION |
| Row-Level Security (RLS) | **Not implemented** | No RLS policies on any table |
| Column-level encryption | **Active** | AES-256-GCM on `measurements.value_canonical` |
| Database roles | **Not implemented** | Single DB user `sovereign_health` for all operations |

### 2.4 Organization Tables — Prepared But Inactive

The following tables exist in the schema but are **not enforced** in application logic:

#### `organizations`
| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `name` | text | Clinic/practice name |
| `slug` | text | URL-friendly identifier |
| `org_type` | text | Currently: `demo` only |
| `tier_id` | UUID | Organization-level license tier |
| `billing_email` | text | Billing contact |
| `is_active` | boolean | Active flag |

#### `org_members`
| Column | Type | Purpose |
|--------|------|---------|
| `org_id` | UUID | Organization FK |
| `user_id` | UUID | User FK |
| `role` | text | Currently: `org_member` only |
| `invited_by` | UUID | Who invited this member |
| `joined_at` | timestamp | Membership start |

#### `app_roles`
| Column | Type | Purpose |
|--------|------|---------|
| `org_id` | UUID | Organization FK |
| `user_id` | UUID | User FK |
| `app_key` | text | Which app (e.g., `health`) |
| `role` | text | Role within that app |
| `granted_by` | UUID | Who assigned this role |

#### `data_shares`
| Column | Type | Purpose |
|--------|------|---------|
| `owner_user_id` | UUID | Patient who owns the data |
| `granted_to_user_id` | UUID | Practitioner who can view |
| `org_id` | UUID | Via which organization |
| `app_key` | text | Which app |
| `scope` | text | What data is shared (e.g., `measurements`, `all`) |
| `expires_at` | timestamp | Time-limited access |
| `revoked_at` | timestamp | Manually revoked |

---

## 3. Clinic/Patient Use Case — Target Model

### 3.1 Role Hierarchy

```
Platform Level
  └── admin                     ← Platform operator (Sovereign Health team)

Organization Level (Clinic)
  ├── org_owner                 ← Clinic owner / practice manager
  ├── practitioner              ← Doctor, nutritionist, health coach
  ├── assistant                 ← Receptionist, data entry
  └── billing_admin             ← Manages subscriptions

Patient Level
  └── user (patient)            ← Individual using the platform
        ├── self-managed        ← Signs up independently
        └── clinic-managed      ← Invited by practitioner, data shared
```

### 3.2 Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│  PATIENT (user)                                               │
│  - Owns all their health data                                │
│  - Grants/revokes access via data_shares                     │
│  - Can be member of 0..N organizations                       │
│                                                               │
│  data_shares: { owner: patient, granted_to: practitioner,    │
│                 org: clinic, scope: "measurements",           │
│                 expires_at: "2026-06-01" }                   │
│                        │                                      │
│                        ▼                                      │
│  PRACTITIONER (org_member, role=practitioner)                │
│  - Can VIEW shared patient data (read-only)                  │
│  - Cannot MODIFY patient data                                │
│  - Cannot access data of non-shared patients                 │
│  - Access is time-limited and revocable                      │
│                        │                                      │
│                        ▼                                      │
│  ORGANIZATION (clinic)                                        │
│  - Groups practitioners                                       │
│  - Has its own license tier (org billing)                    │
│  - Audit log of all data access                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Security Recommendations

### 4.1 Row-Level Security (RLS) — HIGH PRIORITY

**What:** PostgreSQL-native policy that enforces data isolation at the database level, regardless of application bugs.

**Why:** Currently, a bug in any API handler that forgets `WHERE user_id = $1` would expose all users' data. RLS makes this impossible.

**Implementation:**

```sql
-- Enable RLS on all user-data tables
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE influence_factors ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own data
CREATE POLICY user_isolation ON measurements
  FOR ALL
  USING (user_id = current_setting('app.current_user_id')::uuid);

-- Policy: practitioners can see shared patient data (read-only)
CREATE POLICY practitioner_read ON measurements
  FOR SELECT
  USING (
    user_id IN (
      SELECT owner_user_id FROM data_shares
      WHERE granted_to_user_id = current_setting('app.current_user_id')::uuid
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
        AND scope IN ('measurements', 'all')
    )
  );

-- Admin bypasses RLS
ALTER TABLE measurements FORCE ROW LEVEL SECURITY;
CREATE POLICY admin_bypass ON measurements
  FOR ALL
  TO sovereign_health_admin
  USING (true);
```

**Application change required:**
```rust
// Set session variable before each request
sqlx::query("SET LOCAL app.current_user_id = $1")
    .bind(auth.user_id)
    .execute(&pool)
    .await?;
```

**Effort:** Medium. Requires creating policies for ~15 tables and setting session variables in middleware.

**Benefit:** Defense-in-depth. Even if application code has a bug, the database will not return unauthorized data.

### 4.2 Database Role Separation — MEDIUM PRIORITY

**Current:** Single role `sovereign_health` with full access.

**Recommended:**

| DB Role | Permissions | Used By |
|---------|------------|---------|
| `sh_app` | SELECT, INSERT, UPDATE on user tables. No DELETE, no DDL. | Application server |
| `sh_admin` | All permissions. Bypasses RLS. | Admin operations, migrations |
| `sh_readonly` | SELECT only. Subject to RLS. | Reporting, analytics |
| `sh_migration` | DDL + data manipulation | Migration runner only |

```sql
CREATE ROLE sh_app LOGIN PASSWORD 'xxx';
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO sh_app;
REVOKE DELETE ON measurements, users, doctor_chat_messages FROM sh_app;
-- App uses soft delete (is_deleted=true), never hard DELETE
```

### 4.3 Organization-Scoped Roles — For Clinic Launch

**Extend `org_members.role`** beyond `org_member`:

```sql
ALTER TABLE org_members ADD CONSTRAINT valid_role
  CHECK (role IN ('owner', 'practitioner', 'assistant', 'billing_admin', 'patient'));
```

**Add permission matrix:**

| Action | owner | practitioner | assistant | billing | patient |
|--------|-------|-------------|-----------|---------|---------|
| View own data | Yes | Yes | Yes | Yes | Yes |
| View shared patient data | Yes | Yes | Read-only | No | No |
| Add measurements for patient | No | Yes | Yes | No | No |
| Manage org members | Yes | No | No | No | No |
| Manage org billing | Yes | No | No | Yes | No |
| Invite patients | Yes | Yes | Yes | No | No |
| View audit log | Yes | Yes | No | No | No |

### 4.4 Data Share Enhancements

**Current `data_shares` table is well-designed.** Recommended additions:

```sql
-- Granular scope options
ALTER TABLE data_shares ADD CONSTRAINT valid_scope
  CHECK (scope IN (
    'all',                    -- Full access
    'measurements',           -- Biomarker values only
    'measurements_readonly',  -- Read-only measurements
    'trends',                 -- Trend charts only (no raw values)
    'summary',                -- Zone overview only (green/orange/red)
    'doctor_chat'             -- Chat history
  ));

-- Audit trail for data access
CREATE TABLE data_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID REFERENCES data_shares(id),
  accessed_by UUID REFERENCES users(id),
  action TEXT NOT NULL,  -- 'view', 'export', 'print'
  resource TEXT NOT NULL, -- 'measurements', 'trends', 'chat'
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.5 Encryption Enhancements for Multi-Tenancy

| Enhancement | Priority | Description |
|-------------|----------|-------------|
| Per-org encryption keys | High | Each clinic gets its own AES key. Platform cannot read clinic patient data. |
| Key escrow | Medium | Org owner holds master key. Lost key = data loss (true zero-knowledge). |
| Encrypt chat messages | High | Already identified in GDPR audit (GDPR-F003). |
| Field-level encryption for PII | Medium | Encrypt `email`, `display_name` at rest (not just health data). |

### 4.6 Additional Security Measures

| Measure | Priority | Description |
|---------|----------|-------------|
| **Audit log for data_shares** | High | Log every time a practitioner views patient data |
| **Consent workflow** | High | Patient must explicitly approve each data share (in-app, not just DB) |
| **IP restrictions per org** | Medium | Clinic can restrict access to office IP range |
| **Session binding** | Medium | JWT tied to IP/device fingerprint |
| **Break-glass access** | Low | Emergency access with automatic audit + patient notification |
| **Data anonymization API** | Low | Export anonymized cohort data for research (org-level) |

---

## 5. Implementation Roadmap

### Phase 1 — Security Hardening (v0.21.0)

- [ ] RLS policies on all 15 user-data tables
- [ ] `SET LOCAL app.current_user_id` in middleware
- [ ] Encrypt doctor_chat_messages (GDPR-F003)
- [ ] Add data_access_log table
- [ ] Audit log for admin operations

### Phase 2 — Organization Support (v0.22.0)

- [ ] Activate `organizations`, `org_members` in API
- [ ] Org registration + member invitation flow
- [ ] Org-level license tier (billing per clinic)
- [ ] Extend role to: `owner`, `practitioner`, `assistant`, `billing_admin`
- [ ] Org-scoped admin panel

### Phase 3 — Patient Data Sharing (v0.23.0)

- [ ] Patient consent workflow (in-app approval)
- [ ] Practitioner dashboard (view shared patients)
- [ ] Granular data_shares scopes
- [ ] Time-limited + revocable access
- [ ] Data access audit trail (who viewed what, when)

### Phase 4 — Advanced Multi-Tenancy (v0.24.0)

- [ ] Per-org encryption keys
- [ ] Database role separation (sh_app, sh_admin, sh_readonly)
- [ ] IP restrictions per org
- [ ] Break-glass emergency access
- [ ] Anonymized cohort export for research
- [ ] HIPAA compliance assessment (for US market)

---

## 6. Comparison: Current vs Target

| Capability | Current (v0.20.0) | Target (v0.24.0) |
|------------|-------------------|-------------------|
| User isolation | App-level `WHERE user_id =` | RLS + app-level (defense-in-depth) |
| Roles | 2 (`user`, `admin`) | 6+ (user, admin, owner, practitioner, assistant, billing) |
| Organizations | Schema exists, not active | Full multi-tenant with org billing |
| Data sharing | Table exists, not active | Consent-based, time-limited, audited |
| Encryption | Health values only | Health + chat + PII + per-org keys |
| DB roles | Single user | 4 roles (app, admin, readonly, migration) |
| Audit trail | Basic `audit_log` | Full data access logging |
| Compliance | GDPR | GDPR + HIPAA-ready |

---

## 7. Technology Recommendations

| Technology | Use Case | Why |
|-----------|----------|-----|
| **PostgreSQL RLS** | Row-level data isolation | Native, no app changes for queries, defense-in-depth |
| **PostgreSQL GRANT/REVOKE** | DB role separation | Prevents accidental DELETE, limits blast radius |
| **pgaudit** | Database audit logging | Logs all SELECT/INSERT/UPDATE at DB level, tamper-proof |
| **Vault (HashiCorp)** | Key management | Per-org encryption keys, key rotation, audit |
| **PASETO tokens** | Session security | Alternative to JWT — no algorithm confusion attacks |
| **WebAuthn/FIDO2** | Passwordless auth for clinics | Stronger than TOTP, phishing-resistant |
| **Nostr (nsec)** | Decentralized identity | Already planned (coming_soon). Patient owns identity. |

---

*Report generated 2026-03-17 for BrickOS v0.20.0-rc1. This is an internal planning document on the develop branch.*
