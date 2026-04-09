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

## 11. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| CSS injection breaks existing theme | High | Use CSS custom properties with fallback values |
| Custom domain SSL issues | Medium | Start with subdomain (clinic.sovereignhealth.io), custom domain later |
| Data leak between orgs | Critical | All queries already enforce org_id. Add E2E test for isolation. |
| Performance with many orgs | Low | Current architecture handles 100+ orgs easily. Index org_id. |
| Customer expects dedicated instance | Medium | Document shared model upfront. Offer dedicated for Enterprise tier. |

---

## 12. Conclusion

**The foundation is surprisingly complete.** Database schema, REST API, hostname detection, domain mapping, and org-scoped data isolation are all implemented. The main gap is **frontend wiring** -- connecting the existing branding page UI to the existing API endpoints, and injecting org colors into CSS.

**Estimated time to first white-label customer: 2-3 days of implementation + 1 day of testing.**

The biggest risk is not technical -- it's ensuring the customer onboarding process is smooth and the branding looks polished across all pages (login, dashboard, settings, emails).
