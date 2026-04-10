# 021 -- SHI White-Label Architecture: Multi-Tenant Branding for First Customer

**Status:** Draft v1
**Author:** Helmut / Claude
**Date:** 2026-04-09
**Related:** 010-multi-tenant-platform-offering, 014-brickos-platform-gui, 018-platform-service-elevation

---

## 1. Purpose

Specify how Sovereign Health Intelligence can be white-labeled for clinics, coaches, and enterprises. A customer (e.g., a functional medicine clinic) should be able to offer SHI under their own brand -- their logo, colors, domain, and email templates -- while Sovereign Brick operates the shared infrastructure.

**Target:** First white-label customer onboarded within the minimal set of changes.

---

## 2. Current State Audit

### What's Already Built

| Component | Status | Location |
|-----------|--------|----------|
| `organizations.branding` JSONB column | **DB ready** | Migration 007 |
| `domain_mappings` table (domain, ssl_status) | **DB ready** | Migration 007 |
| Branding REST API (GET/PUT branding, CRUD domains) | **API ready** | sovereign-link/handlers/branding.rs |
| Hostname-based brand detection (SHI vs BrickOS) | **Working** | frontend/src/lib/brand.ts |
| Brand context cookie (SSR-safe) | **Working** | frontend/src/middleware.ts |
| Branding page UI (color pickers, presets) | **UI only** | frontend/src/app/platform/branding/ |
| Custom domain resolution (X-Org-Domain header) | **Working** | sovereign-link/handlers/namespace.rs |
| Org admin role + permissions | **Working** | brickos-db ORG_ROLES |
| Design tokens (admin UI colors) | **Static** | frontend/components/admin/design-tokens.ts |
| Tier feature: "Custom branding" (Horizon tier) | **Defined** | tier_features migration |

### What's Missing (Gap Analysis)

| Gap | Effort | Priority |
|-----|--------|----------|
| **Frontend -> API wiring** (branding page calls no API) | 3h | P0 |
| **Logo upload endpoint** (no file storage) | 5h | P0 |
| **Dynamic CSS injection** (colors hardcoded) | 5h | P0 |
| **Email template branding** (per-org templates) | 8h | P1 |
| **SSL cert automation** (Let's Encrypt for custom domains) | 8h | P1 |
| **DNS verification flow** (CNAME validation) | 3h | P1 |
| **Favicon injection** (per-org favicon in HTML head) | 2h | P2 |
| **Tier gating** (restrict branding to Horizon tier) | 2h | P2 |
| **Branding endpoint in SHI API** (currently only in SLI) | 3h | P1 |

---

## 3. Deployment Model

### Recommended: Shared Multi-Tenant (Current Architecture)

All customers share one VPS, one PostgreSQL, one set of containers. Data isolated by `org_id` on every query.

```
┌──────────────────────────────────────────────┐
│  VPS (72.61.154.115)                         │
│                                               │
│  nginx                                        │
│  ├── sovereignhealth.io    -> SHI :8080       │
│  ├── app.sovereignhealth.io -> SHI :3000      │
│  ├── clinic.example.com    -> SHI :3000       │  <-- custom domain
│  └── health.coach-name.com -> SHI :3000       │  <-- custom domain
│                                               │
│  SHI Backend (:8080)                          │
│  ├── Resolves org from hostname               │
│  ├── Loads org branding from DB               │
│  └── Scopes all data by org_id               │
│                                               │
│  PostgreSQL                                   │
│  ├── brickos DB (users, orgs, billing)       │
│  └── shi DB (measurements, markers)          │
│       └── All queries: WHERE org_id = $1     │
└──────────────────────────────────────────────┘
```

**Why shared, not dedicated:**
- One deploy serves all customers (no per-customer VPS)
- Data isolation via org_id (proven pattern, already enforced)
- Billing via existing Stripe integration
- Updates roll out to all customers simultaneously
- Cost: ~0 EUR marginal cost per customer (shared infrastructure)

**When to consider dedicated:** Customer requires physical data isolation (EU data residency regulation, >1000 users, custom SLA). Cross that bridge when needed.

---

## 4. Branding System

### 4.1 What Gets Branded

| Element | Where Configured | Injection Point |
|---------|-----------------|-----------------|
| **Logo** | `organizations.branding.logo_url` | Navbar, login page, email header |
| **Favicon** | `organizations.branding.favicon_url` | HTML `<head>` via middleware |
| **App name** | `organizations.branding.app_name` | Navbar title, page `<title>`, emails |
| **Primary color** | `organizations.branding.primary_color` | CSS custom property `--brand-primary` |
| **Accent color** | `organizations.branding.accent_color` | CSS custom property `--brand-accent` |
| **Background color** | `organizations.branding.bg_color` | CSS custom property `--brand-bg` |
| **Footer text** | `organizations.branding.footer_text` | Login page, email footer |
| **Support email** | `organizations.branding.support_email` | Contact links, email from address |
| **Custom domain** | `domain_mappings.domain` | nginx, SSL cert, cookie domain |

### 4.2 Branding JSONB Schema

```json
{
  "logo_url": "https://storage.brickos.io/orgs/{org_id}/logo.png",
  "favicon_url": "https://storage.brickos.io/orgs/{org_id}/favicon.ico",
  "app_name": "HealthTrack Pro",
  "primary_color": "#2563eb",
  "accent_color": "#22d3ee",
  "bg_color": "#09090b",
  "footer_text": "Powered by Sovereign Health",
  "support_email": "support@clinic.example.com",
  "show_powered_by": true,
  "show_demo": false,
  "show_register": true,
  "registration_mode": "invite_only"
}
```

### 4.3 CSS Injection

When the frontend loads, it fetches the org's branding and injects CSS custom properties:

```typescript
// In layout.tsx or a BrandProvider
const branding = await fetchOrgBranding(orgId)
document.documentElement.style.setProperty('--brand-primary', branding.primary_color)
document.documentElement.style.setProperty('--brand-accent', branding.accent_color)
```

All components use `var(--brand-primary)` instead of hardcoded `bg-blue-600`.

### 4.4 Logo Storage

**Simple approach (Phase 1):** Store logos as base64 in the branding JSONB. Max 100KB per logo.

**Scalable approach (Phase 2):** File upload to local disk (`/opt/sovereign-health/uploads/orgs/{org_id}/logo.png`) served by nginx. No S3 needed for <100 customers.

---

## 5. Domain Mapping

### 5.1 How Custom Domains Work

```
Customer DNS:  clinic.example.com CNAME app.sovereignhealth.io
                                        |
Cloudflare:    proxies to VPS ──────────┘
                                        |
nginx:         matches server_name ─────┘
               (wildcard or per-customer server block)
                                        |
SHI Frontend:  reads hostname ──────────┘
               resolves org from domain_mappings table
               loads org branding
               renders with custom theme
```

### 5.2 DNS Setup Per Customer

Customer adds: `CNAME health -> app.sovereignhealth.io`

We add to nginx:
```nginx
server {
    listen 443 ssl;
    server_name health.clinic-example.com;
    ssl_certificate /etc/ssl/cloudflare/brickos.io.pem;  # or customer cert
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header X-Org-Domain $host;
    }
}
```

### 5.3 SSL Options

**Phase 1 (first customer):** Manual cert setup. Customer provides their SSL cert, or we use Cloudflare proxy on our end.

**Phase 2 (scale):** Let's Encrypt wildcard for `*.sovereignhealth.io` subdomains. For custom domains: `certbot` with DNS-01 or HTTP-01 challenge.

---

## 6. Feature Toggles Per Customer

Customers can disable features they don't want:

```json
// In organizations.branding or a separate org_features JSONB
{
  "features": {
    "dr_alex": true,
    "affiliate": false,
    "newsletter": false,
    "pdf_export": true,
    "csv_export": true,
    "calculated_markers": true,
    "max_users": 50,
    "max_markers_per_import": 100
  }
}
```

Implementation: Check `org.branding.features.{feature}` before rendering UI elements or processing API requests.

---

## 7. Pricing Model

### Recommended: Per-Organization Monthly Fee

| Plan | Monthly | Includes | Extra Users |
|------|---------|----------|-------------|
| **Starter** | 99 EUR | 10 users, SHI branding | +5 EUR/user |
| **Professional** | 249 EUR | 50 users, custom branding, custom domain | +3 EUR/user |
| **Enterprise** | 499 EUR | unlimited users, full white-label, priority support | included |

**Revenue model:** B2B SaaS. Customer pays monthly, manages their own users.

**Implementation:** Use existing Stripe integration. Customer org gets a subscription. Tier features control what's available.

---

## 8. Customer Onboarding Flow

### Minimum Viable Onboarding (First Customer)

1. **Sovereign Brick creates organization** in admin panel
2. **Set org branding** (logo, colors, app name) via API or admin
3. **Create admin user** for customer (signup with org assignment)
4. **Configure custom domain** (if needed) -- DNS + nginx
5. **Customer logs in**, invites their users
6. **Users access** SHI with customer branding

**Manual steps today:** 1-4 require Sovereign Brick admin action.

**Automated (future):** Customer signs up on website, selects plan, creates org, uploads logo, connects domain -- all self-service.

### Onboarding Checklist

```
[ ] Organization created in brickos.organizations
[ ] Admin user created and assigned to org (org_members, role=owner)
[ ] Branding configured (logo, colors, app_name)
[ ] Tier assigned (user_licenses)
[ ] Custom domain configured (if needed)
[ ] Email templates customized (if needed)
[ ] Customer admin logged in and verified
[ ] First users invited by customer admin
[ ] Test: login shows custom branding
[ ] Test: data isolated from other orgs
```

---

## 9. What Must Be Built Before First Customer

### Minimum (P0 -- days to implement)

| Item | Effort | Description |
|------|--------|-------------|
| Wire branding page to API | 3h | Frontend fetches/saves branding via existing REST endpoints |
| Dynamic CSS injection | 5h | BrandProvider loads org colors, sets CSS custom properties |
| Logo upload (base64 in JSONB) | 3h | Simple: store logo as base64 string in branding column |
| Hostname -> org resolution in SHI | 3h | Middleware resolves hostname via domain_mappings table |
| Branding API in SHI backend | 3h | Port branding endpoints from Sovereign Link to SHI |
| Org admin user management | 3h | Invite users, assign roles (already partially built) |

**Total P0: ~20 hours (2-3 days)**

### Nice to Have (P1 -- weeks)

| Item | Effort |
|------|--------|
| Email template branding | 8h |
| SSL automation (Let's Encrypt) | 8h |
| Self-service onboarding wizard | 13h |
| Billing integration (customer pays via Stripe) | 8h |
| Feature toggles per org | 5h |
| Admin dashboard for white-label customers | 8h |

---

## 10. Implementation Plan

### Sprint 039 (this sprint -- if time permits)

- [ ] Wire branding page UI to `PUT /api/v1/orgs/{org_id}/branding`
- [ ] Add BrandProvider that loads org branding and injects CSS custom properties
- [ ] Logo upload as base64 in branding JSONB

### Sprint 040

- [ ] Hostname -> org resolution in SHI middleware
- [ ] Branding REST endpoints in SHI API
- [ ] Org admin user invitation
- [ ] First customer onboarding test

### Sprint 041+

- [ ] Email template branding
- [ ] SSL automation
- [ ] Self-service onboarding
- [ ] Feature toggles

---

## 10b. Admin Setup Interface: Platform vs App

**Decision: Platform-level (BrickOS admin), not SHI app.**

The white-label setup happens at the BrickOS platform level because:
1. Organizations span apps (an org might use SHI + CRM + Sovereign Link)
2. Domain mapping, branding, and billing are platform concerns
3. The org admin manages their app usage, not the platform setup

**Interface location:** `/platform/organizations` in the BrickOS admin GUI.

The SHI app admin view shows org-specific settings (feature toggles, member management) but not platform setup (domains, billing, branding).

---

## 10c. User Journey: BrickOS Admin Onboards White-Label Customer

### Step 1: Customer Inquiry

Customer provides:
- Organization name + type (clinic, coach, enterprise)
- Contact person (name, email)
- Desired plan (Starter/Professional/Enterprise)
- Logo (PNG/SVG, max 100KB)
- Brand colors (primary, accent) -- or "use defaults"
- Custom domain (optional): e.g., `health.clinic-name.com`

### Step 2: BrickOS Admin Creates Organization

**In platform admin (`/platform/organizations/new`):**

```
1. Create organization
   - Name: "Praxis Dr. Mueller"
   - Slug: "praxis-mueller"
   - Type: "clinic"
   - Billing email: admin@praxis-mueller.de

2. Set branding
   - Upload logo
   - Set primary color: #2563eb
   - Set app name: "Praxis Dr. Mueller Health"
   - Footer: "Powered by Sovereign Health"

3. Configure domain (optional)
   - Add: health.praxis-mueller.de
   - Status: pending (customer must add CNAME)
   - Instructions sent to customer email

4. Assign plan
   - Tier: Professional (or create org-level license JWT)
   - Max users: 50
   - Features: all SHI features enabled

5. Create org admin user
   - Email: dr.mueller@praxis-mueller.de
   - Role: org_owner
   - Send invitation email with temp password or magic link
```

### Step 3: Customer DNS Setup (if custom domain)

BrickOS admin sends instructions:
```
Add this DNS record:
  Type: CNAME
  Name: health
  Value: app.sovereignhealth.io

We'll verify and activate SSL within 24 hours.
```

### Step 4: BrickOS Admin Verifies

- [ ] Login at customer domain shows custom branding
- [ ] Org admin can log in
- [ ] Data isolation verified (no other org's data visible)
- [ ] Plan limits enforced

### Step 5: Handover

Customer admin receives:
- Login URL (custom domain or `app.sovereignhealth.io`)
- Admin credentials
- User invitation instructions
- Support contact

---

## 10d. Billing Model Challenge: User-Centric vs Org-Centric

### Current State (Problem)

Billing is entirely **user-centric**:
- `stripe_customer_id` on `users` table (not organizations)
- `subscriptions` keyed by `user_id` (not org_id)
- Each user pays individually
- No org-level invoice or payment method

### The White-Label Billing Problem

When clinic "Praxis Dr. Mueller" onboards with 20 users:
- **Who pays?** The clinic (1 invoice), not 20 individual users
- **What's on the invoice?** "Sovereign Brick GmbH" or "Praxis Dr. Mueller"?
- **How does Stripe know?** It doesn't -- Stripe customer is per-user

### Proposed Solution: Org-Level Billing (Phase 2)

**Option A: Org-Level Stripe Customer (Recommended)**

```sql
ALTER TABLE brickos.organizations 
  ADD COLUMN stripe_customer_id TEXT UNIQUE,
  ADD COLUMN billing_model TEXT DEFAULT 'individual'; -- 'individual' or 'organization'
```

When `billing_model = 'organization'`:
- One Stripe customer per org (using org's billing_email)
- One subscription per org (tier + seat count)
- Org admin manages payment method via billing portal
- Individual users don't need Stripe customers
- Invoice shows: "Sovereign Brick GmbH" (our company)

**Option B: Reseller Model (Future)**

Customer buys a license from us, resells to their users under their own brand. They handle their own billing. We provide:
- API for license activation/deactivation
- Usage metering
- Wholesale pricing

### Invoice Branding

Stripe invoices always show **our legal entity** (Sovereign Brick). This is correct and required by tax law -- we are the service provider. The customer's branding appears in the app, not on the invoice.

If the customer wants invoices under their brand (reseller), they need their own Stripe account and we provide a wholesale API. This is Phase 3+.

### Strike (BTC) Payments

Same challenge -- `btc_payments` is user-keyed. For org billing:
- Add `org_id` to `btc_payments` table
- Allow org admin to prepay BTC for all members
- BTC discount applies to org-level payment

---

## 10e. Licensing Across Organizations

### Current Model (Per-User)

```
User A (org: Praxis Mueller) -> tier: focus -> user_licenses row
User B (org: Praxis Mueller) -> tier: focus -> user_licenses row  
User C (org: Personal)       -> tier: glimpse -> user_licenses row
```

Each user has their own tier. No org-level enforcement.

### White-Label Model (Per-Org)

```
Org: Praxis Mueller -> plan: Professional -> 50 seats
  User A -> inherits org plan (no individual subscription)
  User B -> inherits org plan
  ...
  User 50 -> inherits org plan
  User 51 -> REJECTED (seat limit reached)
```

### Implementation

```sql
-- Check user's effective tier:
-- 1. If user's org has billing_model='organization', use org.tier_id
-- 2. Else use user_licenses.tier_id
-- 3. Fallback to 'glimpse' (free)

SELECT COALESCE(
  (SELECT lt.slug FROM organizations o 
   JOIN org_members om ON om.org_id = o.id
   JOIN license_tiers lt ON lt.id = o.tier_id
   WHERE om.user_id = $1 AND o.billing_model = 'organization'),
  (SELECT lt.slug FROM user_licenses ul
   JOIN license_tiers lt ON lt.id = ul.tier_id
   WHERE ul.user_id = $1),
  'glimpse'
) AS effective_tier;
```

### Seat Count Enforcement

```rust
// In org member invitation handler:
let current_count = sqlx::query_scalar(
    "SELECT COUNT(*) FROM org_members WHERE org_id = $1"
).fetch_one(pool).await?;

let max_seats = get_org_plan_seats(org_id).await?;
if current_count >= max_seats {
    return Err(AppError::Validation("Seat limit reached".into()));
}
```

---

## 11. Risk Assessment (Updated)

| Risk | Impact | Mitigation |
|------|--------|------------|
| CSS injection breaks existing theme | High | Use CSS custom properties with fallback values |
| Custom domain SSL issues | Medium | Start with subdomain (clinic.sovereignhealth.io) first |
| Data leak between orgs | Critical | All queries enforce org_id. Add E2E isolation test. |
| Performance with many orgs | Low | Architecture handles 100+ orgs. Index org_id. |
| Customer expects dedicated instance | Medium | Document shared model upfront. Enterprise = dedicated. |
| **Billing model mismatch** | **High** | **User-centric billing vs org-centric need. Must add org billing.** |
| **Invoice shows our company, not customer's** | **Medium** | **Correct by law. Customer branding is in-app, not on invoice.** |
| **License tier inheritance broken** | **High** | **Need effective_tier query that checks org plan first.** |
| **Seat limit not enforced** | **Medium** | **Add count check before org member invitation.** |
| **No email invitation flow** | **Medium** | **Members must already exist. Need invite-by-email.** |
| **Two parallel license systems** | **High** | **JWT license tokens + Stripe subscriptions can conflict. Unify.** |

---

## 12. Open Issues

| # | Issue | Priority | Description |
|---|-------|----------|-------------|
| NEW | Org-level Stripe customer | P0 | Add `stripe_customer_id` to organizations table |
| NEW | Org billing model flag | P0 | `billing_model: 'individual' \| 'organization'` on orgs |
| NEW | Effective tier query | P0 | Check org plan first, then user plan, fallback to glimpse |
| NEW | Seat count enforcement | P1 | Block invitation when seat limit reached |
| NEW | Org admin billing portal | P1 | Org owner manages payment method, sees invoices |
| NEW | Email invitation flow | P1 | Invite user by email (creates account if needed) |
| NEW | Unify license systems | P2 | JWT tokens + Stripe subs should not conflict |
| NEW | BTC org-level prepayment | P2 | Add org_id to btc_payments for org billing |
| NEW | Branding page API wiring | P0 | Connect UI to existing REST endpoints |
| NEW | Dynamic CSS injection | P0 | BrandProvider with CSS custom properties |

---

## 13. Revised Implementation Phases

### Phase 1: Visual White-Label (first customer, 3-5 days)

Branding only -- no billing changes. Customer pays via manual invoice or admin-assigned license.

- [ ] Wire branding page to API
- [ ] Dynamic CSS injection (BrandProvider)
- [ ] Logo upload (base64 in JSONB)
- [ ] Hostname -> org resolution in SHI
- [ ] Branding API in SHI backend
- [ ] Admin creates org + admin user manually
- [ ] Admin assigns license via JWT token (existing endpoint)

**Billing:** Manual. Admin creates org, assigns tier via admin panel. No Stripe for org.

### Phase 2: Org-Level Billing (2-3 weeks)

- [ ] Add `stripe_customer_id` + `billing_model` to organizations
- [ ] Effective tier query (org plan -> user plan -> default)
- [ ] Seat count enforcement on member invitation
- [ ] Org billing portal (Stripe customer portal for org)
- [ ] Email invitation flow (invite by email, auto-create user)
- [ ] Org admin dashboard (member count, usage, plan)

### Phase 3: Self-Service + Scale (1-2 months)

- [ ] Self-service onboarding wizard
- [ ] SSL automation (Let's Encrypt)
- [ ] Feature toggles per org
- [ ] Reseller API (wholesale pricing)
- [ ] BTC org-level prepayment
- [ ] Unify JWT + Stripe license systems

---

## 14. Conclusion

**The visual white-label (Phase 1) is 3-5 days of work** -- branding, CSS injection, hostname resolution. The customer pays via manual license assignment. This is enough for the first customer.

**The billing model (Phase 2) is the real challenge.** The entire billing system is user-centric. Moving to org-level billing requires: org Stripe customer, effective tier query, seat enforcement, and billing portal. This is 2-3 weeks of work.

**Recommendation:** Ship Phase 1 for the first customer with manual billing. Build Phase 2 when you have 2-3 customers and the manual process becomes painful.

---

## 15. Horizon White-Label Package -- Sellable Spec

This section defines a **ready-made, sellable Horizon package** that can be sold to a white-label customer **today** using the infrastructure that already exists. No billing rebuild required.

### 15.1 Why "Horizon as a bundle" fits the current architecture

The user-centric Stripe model (`users.stripe_customer_id`, `user_licenses.tier_id`) is the source of truth for billing. Horizon was already designed as a **custom-priced enterprise tier** (`license_tiers.price_monthly_eur = NULL`, no fixed Stripe price). That means Horizon was never expected to flow through self-service Stripe checkout in the first place -- it has always been an "off-Stripe" tier.

In parallel, the codebase has a **second, independent licensing channel** that has been there since Sprint 026:

- `POST /admin/organizations/{id}/license` (`apps/health/sovereign-health/api/src/handlers/admin_orgs.rs:274`)
- Generates a self-contained **JWT license** (HS256) with: `org_id`, `org_name`, `tier`, `features[]`, `max_admins`, `max_editors`, `max_consumers`, `iat`, `exp`.
- Validated by `services/licensing.rs::validate_license` and `check_seat_limit(claims, role, count)`.
- **No DB row written.** The token is the license.

This is the lever. Horizon-as-a-package = **JWT license token + manual monthly invoice**, with the standard SaaS Stripe path completely bypassed for that org.

### 15.2 The package: "SHI Horizon Practice"

| Field | Value |
|---|---|
| **Package name** | SHI Horizon Practice |
| **Sold to** | A single legal entity (clinic, coach business, employer, NGO) |
| **Tier slug** | `horizon` |
| **Billing channel** | Manual invoice from Sovereign Brick (PDF, monthly, EUR or BTC) |
| **License delivery** | Signed JWT token, generated by `/admin/organizations/{id}/license`, expiry = contract end |
| **Renewal** | Re-issue JWT each contract period (1, 6, or 12 months) |

**Seat composition (default bundle):**

| Role | JWT field | Default seats | Maps to |
|---|---|---|---|
| Org owner | `max_admins` | **1** | Primary customer signatory, billing contact |
| Tech admin | `max_admins` | **1** | (shares the admin pool) |
| Commercial admin | `max_admins` | **1** | (shares the admin pool) |
| **Total admins** | | **3** | `max_admins: 3` |
| Editor (practitioner / coach / nurse) | `max_editors` | **5** | `max_editors: 5` |
| Consumer (patient / client / employee) | `max_consumers` | **50** | `max_consumers: "50"` |

The 3/5/50 split matches what `check_seat_limit` enforces against `org_members.role` today -- no new code needed.

**Feature bundle (`features[]` in JWT):**

```json
[
  "shi",                       // Sovereign Health Intelligence app
  "shi.csv_export",
  "shi.json_export",
  "shi.pdf_reports",
  "shi.custom_thresholds",     // Reference Ranges
  "shi.lifestyle_presets",
  "shi.protocol_comparison",
  "shi.body_composition",
  "shi.supplement_marker_impact",
  "shi.ai_dashboard_insights",
  "shi.cohort_comparison",     // Benchmark
  "shi.team_sharing",
  "shi.api_access",
  "branding.custom_logo",
  "branding.custom_colors",
  "branding.custom_domain",
  "support.priority"
]
```

This is a superset of every Clarity feature plus `team_sharing`, `api_access`, branding, and priority support.

### 15.3 Price card

Pricing is intentionally simple so it can be sold by email/PDF without a quoting engine.

| Line item | Monthly (EUR, ex VAT) | Notes |
|---|---|---|
| **Base platform fee** | **499** | 3 admins + 5 editors + 50 consumers, all Horizon features |
| Additional editor seat | **39 / seat** | Above the included 5 |
| Additional consumer seat (block of 25) | **149 / block** | Above the included 50 |
| Custom domain (`*.customer.tld`) | **49** | One subdomain, SSL via Let's Encrypt |
| Maintenance & Evolution (M&E) | **15% of monthly fees** | Updates, security patches, dependency upgrades |
| Onboarding (one-time) | **1 500** | Branding setup, domain, kickoff call, training |
| Optional: priority support SLA (8h response, business hours) | **+199** | |
| Optional: 24/7 on-call | **+599** | Pager rotation, 1h response |

**Annual prepay discount:** -10% (12 months prepaid -> 10.8 months billed).
**BTC prepay discount:** -5% (Strike or on-chain, 6 or 12 months upfront).

**Default first-customer offer (the "anchor SKU"):**

> 499 base + 75 M&E (15%) + 49 domain = **623 EUR / month** + 1 500 EUR onboarding.
> 12 months prepaid = **6 729 EUR/year** (after -10% discount) + 1 500 onboarding = **8 229 EUR year-1**.

This is the number to put on the first invoice.

### 15.4 What the customer gets, in concrete terms

1. A subdomain on `brickos.io` (e.g. `acme.brickos.io`) **or** a custom domain pointed at our nginx (e.g. `health.acme.com`).
2. Their logo, primary color, and accent color rendered across the SHI app via `BrandProvider` (Phase 1 wiring from Section 13).
3. An org record in `brickos.organizations` with `org_type='clinic'` (or similar), `branding` JSONB filled in, `domain_mappings` row.
4. Three named admin accounts (owner / tech_admin / commercial_admin) created by us.
5. A signed JWT license token, valid for the contract period, that unlocks every Horizon feature.
6. Their org admin can invite up to 5 editors and 50 consumers via the existing `org_members` flow. `check_seat_limit` enforces the cap.
7. Monthly invoice PDF from Sovereign Brick, paid by SEPA / wire / BTC.

### 15.5 What does NOT need to be built

The whole point of selling Horizon this way is that **none of these tickets need to ship before invoicing customer #1**:

- ❌ `organizations.stripe_customer_id` -- not needed, billing is manual
- ❌ `billing_model` enum on organizations -- not needed
- ❌ Effective tier query (org plan -> user plan -> default) -- not needed; JWT carries the tier
- ❌ Org-level Stripe customer portal -- not needed
- ❌ Email invitation auto-account-creation -- existing flow is fine
- ❌ Self-service onboarding wizard -- we onboard manually for the first 3-5 customers
- ❌ Reseller API, wholesale pricing -- not needed
- ❌ Unifying JWT licenses with Stripe subs -- they stay separate by design

The only **real engineering** required to sell this package is **Phase 1 of Section 13** (visual branding wiring, ~3-5 days).

### 15.6 What DOES need to be built (small, scoped)

| # | Item | Effort | Why |
|---|---|---|---|
| 1 | Wire branding page to API + dynamic CSS injection | 2-3d | From Section 13 Phase 1 |
| 2 | Make sure `services/tier.rs::get_user_tier` honors a JWT license claim if present, instead of (or in addition to) reading `user_licenses` for users in a Horizon org | 1d | Today the JWT licensing path is generated but **not consumed** by the feature gates. This is the missing wire. |
| 3 | Add a `org_licenses` cache table (just `org_id`, `jwt_token TEXT`, `issued_at`, `expires_at`) so we can re-display / revoke without re-reading the email we sent the customer | 0.5d | Optional but recommended |
| 4 | Admin UI: "Generate Horizon License" button on org detail page (calls existing endpoint, prefills the 3/5/50 + feature list) | 0.5d | So we don't have to curl it |
| 5 | Invoice PDF template (1-page, EUR + VAT line, IBAN footer) | 0.5d | Reuse Typst or just a Google Doc |

**Total: ~5 days of work** to be able to sell, deliver, and operate the Horizon package end-to-end. This is the same order of magnitude as Section 13 Phase 1.

The critical one is **#2**: today the JWT license generator writes a token but no code reads it back when checking features. Closing that loop is the difference between "we can issue licenses" and "the licenses actually do something."

### 15.7 First-customer sales workflow

1. **Discovery call** -- understand seat needs, branding assets, domain preference.
2. **Quote** -- pick the anchor SKU (623 EUR/mo + 1 500 onboarding) or adjust seats.
3. **Contract** -- 1-page MSA + order form, 12-month term, 30-day notice after that.
4. **Invoice #1** -- onboarding fee + first month, due net-7.
5. **Provisioning** (after payment lands):
   - Create org via admin UI
   - Upload logo, set colors, set domain
   - Create owner / tech_admin / commercial_admin users, share temp passwords via password manager
   - Click "Generate Horizon License" -> JWT token issued with contract expiry
   - DNS / SSL handshake for custom domain (if applicable)
   - Kickoff training call
6. **Recurring** -- invoice on the 1st of each month, M&E line included automatically.
7. **Renewal** -- 30 days before JWT expiry, send renewal quote and re-issue token.

### 15.8 Why this is "more native" than rebuilding billing

The user-centric Stripe model continues to do exactly what it does well: serve self-service B2C customers on Glimpse / Focus / Insight / Clarity. **Horizon is not in that funnel and was never meant to be.** It is an enterprise SKU sold by humans, fulfilled by JWT, and billed off-platform. This avoids:

- Building org-level Stripe customers and reconciling them with user customers
- Migrating `user_licenses` to `org_licenses` and writing an effective-tier query
- Stripe webhook plumbing for org events that we'll only see 3-10 times a year
- Customer service: when an admin in a Horizon org has a personal Insight subscription too, the JWT path means **no conflict** -- their personal Stripe sub is for their personal account, the JWT license is for their employer's org context. They are in different scopes.

When we hit ~10 Horizon customers, **then** Phase 2 of Section 13 (org-level Stripe) becomes worth it -- because by then the manual invoicing pain is real and we have enough data to model the schema correctly.

### 15.9 Open questions for the first deal

1. **VAT** -- do we charge German VAT or reverse-charge for EU B2B? (Probably reverse-charge with VAT ID, German VAT for non-VAT-registered.)
2. **Data residency** -- if a customer asks for EU-only hosting, our Hostinger VPS is already in EU. If they ask for self-hosted, that becomes a separate Start9-style SKU.
3. **DPA / GDPR** -- we need a 1-page DPA template before we sign the first deal. Defer to legal review.
4. **Logo / asset rights** -- contract clause: customer warrants they own the assets they upload.
5. **Termination** -- on non-payment, JWT token is allowed to expire; org members get a "license expired, contact admin" screen. No data deletion until 90 days post-termination.

These are sales/legal items, not engineering blockers.

---

## 16. Recommendation -- what to do this week

1. **Approve the anchor SKU** (623 EUR/mo + 1 500 onboarding, 12-month term).
2. **Cut a 1-week sub-sprint** out of Sprint 040: items 1-4 from Section 15.6 (~5 days).
3. **Draft the 1-page MSA + order form** in parallel (legal task).
4. **Identify the first target customer** and do a discovery call.
5. **Defer Section 13 Phase 2** (org-level Stripe) until at least 3 paying Horizon customers exist.

The shortest path from "design doc" to "first invoice paid" is roughly **2 weeks of part-time work + 1 sales cycle**, with no billing-system rewrite required.
