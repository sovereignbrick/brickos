# Sprint 014 — Licensing SSoT, Deploy Hardening & Security

**Started:** 2026-03-25
**Duration:** 2 days (2026-03-25 to 2026-03-26)
**Goal:** Establish a single source of truth for licensing/pricing that enforces tier restrictions in code, design the multi-product/multi-org license model for BrickOS as a platform, harden the deployment process, and establish the security compliance framework.

## Context

Sprint 013 shipped go-live stability but exposed three structural gaps:

1. **Licensing drift** — `license_tiers` columns, `product_features`/`tier_features` tables, website locale JSON, and pricing cards are four separate sources of truth. The app enforces limits from `license_tiers` columns while the website reads from locale JSON. ADR 022 decided tier features should be database-driven, but enforcement hasn't caught up.

2. **Platform vs App** — BrickOS is designed as a multi-product platform (Health, Finance, Infrastructure) but licensing is health-specific. The org/role schema exists (Design 021, Migration 76) but isn't activated. Need to verify the license model supports multi-product + multi-org before building more on top.

3. **Deployment fragility** — Sprint 013 had multiple staging failures from env var issues, compose conflicts, and stale caches.

### Key Design References
- **ADR 022:** Tier features database-driven (Sprint 013)
- **Design 016:** Licensing strategy (AGPL + dual-license)
- **Design 019:** Website & tier consistency (3-phase fix plan)
- **Design 021:** Multi-tenant platform offering (org/role schema)

## Sprint Backlog

### Day 1 — Design-First: Licensing Architecture + Deploy

#### P0 — Licensing Single Source of Truth (design + implementation)

| # | Title | Points | Area | Notes |
|---|-------|--------|------|-------|
| #241 | design: multi-product/multi-org license model — BrickOS platform vs app | 5 | Design | Does `license_tiers` need `product_key`? Per-product vs platform billing? Org roles across products? |
| #237 | feat: consolidate license tier table as SSoT + AI pool counting | 8 | Backend | THE key issue. `tier_features` becomes source for both display AND enforcement. Replace 8 quota columns with pool |
| #235 | feat: unified AI credit pool instead of per-feature limits | 5 | Backend | Folds into #237. Single `ai_credits_monthly` replaces 8 `chat_*_monthly` columns |
| | **Licensing Design Subtotal** | **18** | | |

#### P0 — Deploy Hardening

| # | Title | Points | Area | Notes |
|---|-------|--------|------|-------|
| #233 | ops: fix staging compose env vars, CORS, deploy robustness | 3 | Ops | Tactical prerequisite — fixes immediate staging pain |
| #234 | ops: deployment process overhaul — root cause analysis + clean redesign | 5 | Ops | Strategic redesign based on Sprint 013 failures (design doc + key fixes) |
| | **Deploy Subtotal** | **8** | | |

### Day 2 — Pricing Content, Demo Fix, README, Security & PWA

#### P0 — Pricing & Website Content (depends on Day 1 licensing work)

| # | Title | Points | Area | Notes |
|---|-------|--------|------|-------|
| #236 | fix: pricing page must sync with feature-details master table | 3 | Website | Now trivial: read from unified SSoT designed in #237. Update locale JSON EN+DE |
| #230 | fix: website license tiers reflect current state | 3 | Website | Audit all tiers against new SSoT. Sister issue to #236 |
| #243 | fix: markers directory must include all markers + calculated | 2 | Website | Content audit, same pattern as above |
| | **Content Subtotal** | **8** | | |

#### P0 — Demo Mode Fix (URGENT)

| # | Title | Points | Area | Notes |
|---|-------|--------|------|-------|
| #262 (GH-259) | fix: URGENT — demo mode calculated markers show no values | 3 | Backend | Calculated markers empty in demo. Likely missing `enrich_with_latest_values()` call. Critical for showcasing product |
| | **Demo Fix Subtotal** | **3** | | |

#### P1 — GitHub README Optimization

| # | Title | Points | Area | Notes |
|---|-------|--------|------|-------|
| #254 (GH-251) | docs: optimize GitHub README for BrickOS + Sovereign Health — philosophy, visuals, SVGs | 3 | Docs | Rewrite BrickOS monorepo + Sovereign Health READMEs. Explain platform philosophy, data sovereignty reasoning, add architecture SVGs |
| | **README Subtotal** | **3** | | |

#### P0 — Security Hardening

| # | Title | Points | Area | Notes |
|---|-------|--------|------|-------|
| #245 | design: security hardening + continuous compliance framework | 5 | Security | Priority-high. Design doc: 6-layer model |
| #242 | fix: GDPR account deletion must cascade all user data | 3 | Security | Follows #245, Layer 4 compliance |
| #209 | fix: access log missing PDF + GDPR export entries | 2 | Security | Follows #245, Layer 3 audit logging |
| | **Security Subtotal** | **10** | | |

#### P1 — PWA Quick Fixes (bundle)

| # | Title | Points | Area | Notes |
|---|-------|--------|------|-------|
| #221 | fix: PWA icon missing on Linux (Flatpak Chrome) | 1 | PWA | Same manifest area |
| #222 | fix: PWA app name — show full product name everywhere | 1 | PWA | Bundle with #221 |
| #240 | fix: PWA splash screen — blank black page, add logo animation | 2 | PWA | Bundle with #221/#222 |
| | **PWA Subtotal** | **4** | | |

## Dependency Graph

```
Day 1 (design-first):
  #241 (license model design) ──► #237 (SSoT implementation)
                                    │
                               #235 (AI pool) ─┘ (folds into #237)
                                    │
  #233 (staging fix) ──► #234 (deploy redesign)

Day 2 (depends on Day 1):
  #237 (SSoT) ──► #236 (pricing sync) ──► website deploy
             ──► #230 (tier audit)    ──►
             ──► #243 (markers audit) ──►

  #262 (demo calc markers) — URGENT, independent, can start immediately

  #254 (README optimization) — independent, after licensing clarity

  #245 (security design) ──► #242 (GDPR cascade)
                          ──► #209 (access log)

  #221 + #222 + #240 (PWA bundle, independent)
```

## Licensing Architecture Decisions (to resolve in #241/#237)

### Core Principle: Database Tables = Single Source of Truth

The licensing tables (`license_tiers`, `tier_features`, `product_features`) must be the **sole authoritative source** for all licensing data across three layers:

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: BrickOS Platform                           │
│  license_tiers (product_key scoped)                  │
│  tier_features → product_features                    │
│  Platform defines all tiers, features, pricing,      │
│  and rules. The sovereign authority.                 │
├─────────────────────────────────────────────────────┤
│  Layer 2: Organization                               │
│  organizations → org_members → roles                 │
│  An org subscribes to a tier per product.            │
│  Users belong to orgs. Billing happens here.         │
├─────────────────────────────────────────────────────┤
│  Layer 3: App (sovereignhealth.io, ...)              │
│  user_licenses → enforcement in tier.rs              │
│  Each app reads its product's tier config from L1,   │
│  enforces limits at runtime, displays on website.    │
└─────────────────────────────────────────────────────┘
```

**No hardcoded pricing, features, or limits anywhere outside the database.**

### Data Flow: DB → Enforcement → Display

```
license_tiers + tier_features (DB)
    │
    ├──► tier.rs: check_feature(), check_chat_quota()    [app enforcement]
    ├──► GET /api/tiers/features                          [app feature matrix]
    ├──► GET /license/tiers                               [app pricing display]
    ├──► website/data/tiers.json (generated from DB)      [website pricing page]
    └──► Excel calculator (#251)                          [business planning]
```

### Questions to Resolve

1. **Is `license_tiers` product-scoped?**
   - Current: tiers are global (Glimpse/Focus/Insight/Clarity/Horizon)
   - Needed: user could be Clarity for Health but Free for Finance
   - Proposal: add `product_key` column to `license_tiers`

2. **Where does enforcement read from?**
   - Current: `license_tiers` columns (`chat_general_monthly`, etc.)
   - Target: `tier_features` table (same source as website feature-details)
   - Migration: new `check_tier_feature(user, feature_key)` replaces hardcoded column reads

3. **AI credit pool model**
   - Replace 8 per-chat counters with single `ai_credits_monthly` per tier
   - Credit costs: chat=1, smart import=2, trend analysis=1
   - Reset: monthly cron or lazy reset

4. **Org billing model**
   - With L1→L2→L3, the subscription anchor is the **org**, not the individual user
   - Individual users are a special case: personal org with 1 member
   - Org subscribes to a tier per product at L2; L3 apps enforce per that subscription
   - Can orgs span products? (clinic: Health for patients + Finance for billing)
   - Org roles need product scope (admin of Health, viewer of Finance)

5. **Self-hosted implications**
   - Core tier = self-hosted. Does Core cover all products or per-product?
   - `SHI_MODE=oss` bypass: keep for development, remove for production

6. **Website consistency (CRITICAL)**
   - `website/data/tiers.json` must be generated from DB, not hand-maintained
   - `pricing/page.tsx` hardcoded feature rows must read from `tier_features` API or generated JSON
   - EN + DE locale content must come from `product_features.name_en` / `name_de`
   - Pricing cards, feature comparison, and CTA must all reflect the DB state

7. **Enforcement completeness**
   - Every feature in `tier_features` must have a corresponding enforcement check in `tier.rs`
   - No feature can be displayable on the website but unenforced in the app (or vice versa)
   - Audit: list all `check_feature()` calls vs all `tier_features` rows — they must match

## User Journeys — Licensing Through All Three Layers

These journeys validate that the L1→L2→L3 model works end-to-end for every customer type.

---

### Journey 1: Individual User Purchases Sovereign Health "Insight" Tier

**Actor:** Sarah, a health-conscious individual

```
L1 (Platform)                    L2 (Organization)               L3 (App)
─────────────────────────────    ────────────────────────────    ──────────────────────────────
license_tiers defines:           Auto-created on signup:          sovereignhealth.io enforces:
  product: sovereign-health        org: "Sarah's Personal"        tier.rs reads tier_features
  tier: insight                    type: personal                 check_feature("csv_export")→✓
  price: €24.99/mo                 members: [Sarah:owner]         check_marker_access()→50 max
  features via tier_features       org_license:                   check_chat_quota()→30/mo
                                     tier=insight                 Website pricing page reads
                                     billing=Stripe sub           same tier_features for display
```

**Step-by-step:**

1. Sarah visits `sovereignhealth.io/pricing`
   - Website reads `tier_features` (via generated `tiers.json`) → shows feature comparison
   - She picks **Insight** (€24.99/mo, 50 markers, 30 AI chats, lab import)

2. Sarah clicks "Start Free Trial" → redirected to signup
   - `POST /api/auth/register` → creates user
   - Auto-creates personal org: `INSERT INTO organizations (name, type) VALUES ('Sarah Personal', 'personal')`
   - Auto-creates org membership: `INSERT INTO org_members (org_id, user_id, role) VALUES (..., ..., 'org_owner')`

3. Stripe checkout → payment confirmed
   - `INSERT INTO user_licenses (user_id, tier_id, status) VALUES (..., 'insight', 'active')`
   - Future: `INSERT INTO org_licenses (org_id, product_key, tier_id) VALUES (..., 'sovereign-health', 'insight')`

4. Sarah uses the app
   - Imports PDF → `tier.rs` checks `tier_features` for `lab_import` → 3/mo allowed → ✓
   - Asks Dr. Alex → `check_chat_quota('general')` → 30/mo → ✓
   - Exports CSV → `check_feature('csv_export')` → Insight includes it → ✓
   - Tries PDF report → `check_feature('pdf_reports')` → 1/mo on Insight → ✓

5. Sarah visits `/settings/subscription`
   - App reads `GET /license` → shows current tier, usage, upgrade options
   - Feature limits match exactly what the website promised (same SSoT)

**What this validates:**
- Personal org is implicit, user doesn't see "org" language
- Tier enforcement reads from `tier_features`, same source as website display
- No hardcoded limits — all from DB

---

### Journey 2: Clinic Onboards 5 Staff + 100 Patients

**Actor:** Dr. Müller, runs a longevity clinic in Munich

```
L1 (Platform)                    L2 (Organization)               L3 (App)
─────────────────────────────    ────────────────────────────    ──────────────────────────────
license_tiers defines:           Created by Dr. Müller:           sovereignhealth.io enforces:
  product: sovereign-health        org: "Müller Longevity"        Staff: full app access
  tier: licensed-package           type: clinic                   Patients: own dashboard only
  (or Horizon for self-serve)      members: 5 staff + 100 pts    Seat limits enforced at invite
                                                                  Data sharing: practitioner↔patient
licensed_packages defines:       org_members:
  max_staff: 10                    Dr. Müller (org_owner)
  max_patients: 150                2 practitioners
  per_staff_seat: €29/mo           1 assistant
  per_patient_seat: €5/mo          1 billing_admin
  features: [ai, sharing, audit]   100 patients
```

**Step-by-step:**

1. Dr. Müller contacts sales or self-serves Horizon tier
   - **Self-serve path:** picks Horizon (€99.99/mo, 10 team members)
   - **Licensed path:** custom package negotiated (setup €2,000 + base €199/mo + seats)

2. Org creation
   - `POST /api/orgs` → creates org with `type: clinic`
   - Dr. Müller auto-assigned as `org_owner`
   - Licensed package (if applicable): `INSERT INTO licensed_packages (org_id, max_staff, max_patients, ...)`

3. Staff onboarding (5 employees)
   - Dr. Müller opens `/org/members` → clicks "Invite"
   - Invites 2 practitioners, 1 assistant, 1 billing_admin
   - Each invite: `POST /api/orgs/{org_id}/members/invite`
     - API checks: `COUNT(staff roles) < max_staff` → 4 < 10 → ✓
     - Sends invitation email with role-specific onboarding
   - Staff members sign up → auto-joined to org with assigned role

4. Patient onboarding (100 patients)
   - **Option A:** Practitioner sends invite link → patient self-registers
   - **Option B:** Bulk CSV import of patient emails
   - **Option C:** Patient signs up independently, practitioner links them to org
   - Each patient: `INSERT INTO org_members (org_id, user_id, role) VALUES (..., ..., 'patient')`
   - API checks: `COUNT(patient role) < max_patients` → within 150 limit → ✓

5. Licensing per seat type
   ```
   Monthly bill for Dr. Müller's clinic:
   ┌─────────────────────────────────────────────┐
   │ Base license (Horizon or Licensed)   €199.00 │
   │ Staff seats: 5 × €29.00             €145.00 │
   │ Patient seats: 100 × €5.00          €500.00 │
   │ ─────────────────────────────────────────── │
   │ Total                                €844.00 │
   │                                               │
   │ Affiliate discount (20%):           -€168.80 │
   │ BTC payment (5%):                    -€33.76 │
   │ ─────────────────────────────────────────── │
   │ Final                                €641.44 │
   └─────────────────────────────────────────────┘
   ```

6. What staff can do (L3 enforcement)
   - **Practitioner:** view assigned patients' dashboards, import labs on behalf, data sharing
   - **Assistant:** schedule, manage patient records, no clinical decisions
   - **Billing admin:** invoices, subscription management, no patient data
   - **org_owner (Dr. Müller):** everything + org settings, member management, audit log

7. What patients can do (L3 enforcement)
   - View own biomarker dashboard only (RLS: `WHERE user_id = current_user`)
   - Enter own measurements
   - Grant/revoke data sharing with practitioner
   - Cannot see other patients, org settings, or billing
   - AI chat access depends on package (may be staff-only or included for patients)

**What this validates:**
- Org is the billing entity (L2), not individual users
- Seat types (staff vs patient) have different costs AND different permissions
- L1 defines the tier; L2 subscribes and manages seats; L3 enforces per role
- Patient count scales without giving patients admin access
- Discount stack from Excel calculator (#251) applies at org billing level

---

### Journey 3: White-Label Clinic Self-Hosts the Health App

**Actor:** VitalCare GmbH, a health-tech company wanting to offer branded biomarker tracking

```
L1 (Platform)                    L2 (Organization)               L3 (App — self-hosted)
─────────────────────────────    ────────────────────────────    ──────────────────────────────
BrickOS issues commercial        VitalCare GmbH org:              Runs on VitalCare's servers:
license key (Ed25519 signed)       type: enterprise                Docker compose on their VPS
                                   deployment: on_premise          White-labeled UI (their brand)
licensed_packages:                 members: 25 staff               License key validated offline
  commercial_license: true         patients: unlimited             or periodic heartbeat to
  white_label: full                                                license.brickos.io
  deployment: on_premise         License key embedded in
  max_staff: 25                  their .env:
  max_patients: unlimited          LICENSE_KEY=eyJ...
```

**Step-by-step:**

1. VitalCare contacts Sovereign Brick for a commercial license
   - Requirement: self-host, white-label, 25 staff, unlimited patients
   - They want to rebrand as "VitalCare Health" — remove all BrickOS branding
   - They need proprietary modifications → AGPL requires commercial license

2. License negotiation
   ```
   Licensed Package: VitalCare Enterprise
   ┌──────────────────────────────────────────────┐
   │ Setup fee (one-time):              €10,000.00 │
   │   Includes: onboarding, data migration,       │
   │   branding setup, training                     │
   │                                                │
   │ Annual license:                                │
   │   Base platform:        €1,499.00/mo           │
   │   Staff seats: 25 × €29    €725.00/mo          │
   │   Patient seats: unlimited  €500.00/mo (flat)   │
   │   Commercial license:       €200.00/mo          │
   │   ──────────────────────────────────────────── │
   │   Monthly total:          €2,924.00/mo          │
   │   Annual (paid upfront):  €2,924 × 12 = €35,088 │
   │   Annual discount (10%):                -€3,509 │
   │   Annual total:                        €31,579  │
   └──────────────────────────────────────────────┘
   ```

3. Sovereign Brick generates license key
   ```rust
   LicenseKey {
       org_id: "vitalcare-gmbh",
       package_name: "VitalCare Enterprise",
       max_staff: 25,
       max_patients: None,  // unlimited
       features: ["ai_access", "api_access", "white_label_full",
                   "team_sharing", "data_sharing", "sso", "audit_export",
                   "commercial_license"],
       deployment_model: "on_premise",
       valid_from: "2026-04-01",
       valid_until: "2027-04-01",
       signature: "Ed25519...",
   }
   ```

4. VitalCare deploys on their infrastructure
   - Receives: Docker images + `docker-compose.yml` + license key + branding guide
   - Sets in `.env`:
     ```
     LICENSE_KEY=eyJvcmdfaWQiOiJ2aXRhbGNhcmUtZ21iaCIs...
     SHI_MODE=licensed    # not oss, not saas — licensed on-premise
     WHITE_LABEL_NAME="VitalCare Health"
     WHITE_LABEL_LOGO=/assets/vitalcare-logo.svg
     WHITE_LABEL_DOMAIN=health.vitalcare.de
     ```
   - `docker compose up` → platform starts with VitalCare branding
   - License key validated on startup:
     - Ed25519 signature check (offline-capable, works air-gapped)
     - Checks: `valid_until >= now`, features list, seat limits
     - Optional: heartbeat to `license.brickos.io` for revocation check

5. VitalCare staff onboards
   - Same as Journey 2, but on their own instance
   - Org admin creates practitioners, patients
   - Seat enforcement reads from the license key (max_staff: 25)
   - If VitalCare tries to add staff member #26 → rejected by license check

6. How licensing enforcement works on-premise (L3)
   ```
   Request comes in → middleware checks:
   1. LICENSE_KEY valid? (signature, expiry)     → 403 if expired
   2. Feature allowed? (key.features contains X) → 403 if not licensed
   3. Seat limit? (staff/patient count ≤ limit)  → 403 on invite
   4. Normal tier enforcement (tier.rs)           → per-user limits
   ```
   - **No phone-home required** for daily operation (sovereignty!)
   - Optional heartbeat: usage reporting, license renewal reminders, feature updates

7. What VitalCare CANNOT do without commercial license
   - Remove AGPL notices → violation (commercial license covers this)
   - Make proprietary modifications without sharing source → violation
   - Resell as their own product → commercial license + reseller agreement needed

**What this validates:**
- L1 (BrickOS) issues the license key — platform is the authority
- L2 (VitalCare org) is the billing entity with a `licensed_packages` row
- L3 (their self-hosted instance) enforces via license key, same `tier.rs` logic
- Commercial license solves the AGPL obligation for proprietary modifications
- Offline-first license validation aligns with sovereignty (no call-home dependency)
- White-labeling is a feature toggle, not a separate codebase

---

### Journey Summary: L1→L2→L3 Consistency Check

| Aspect | Journey 1 (Individual) | Journey 2 (Clinic) | Journey 3 (White-Label) |
|--------|----------------------|-------------------|------------------------|
| **L1 defines** | Tier: Insight | Licensed package | Commercial license key |
| **L2 subscribes** | Personal org (implicit) | Clinic org + seats | Enterprise org + seats |
| **L3 enforces** | tier.rs reads DB | tier.rs + seat limits | License key + tier.rs |
| **Billing anchor** | User (personal org) | Org (staff + patient seats) | Org (annual contract) |
| **Data isolation** | RLS by user_id | RLS by user_id + org_id | Physical (own servers) |
| **Deployment** | SaaS (shared) | SaaS (shared or dedicated) | On-premise (self-hosted) |
| **AGPL impact** | None (SaaS user) | None (we host) | Commercial license required |
| **Discount stack** | Affiliate, promo, BTC | Same, applied at org level | Custom pricing (negotiated) |

## Execution Order

```
Day 1 (2026-03-25):
  1. cargo fmt (separate commit)                               ~5 min
  2. #241 license model design doc                             ~2 hrs
     → Resolve: product_key, org billing, enforcement source
  3. #237 SSoT implementation (design + migration + tier.rs)   ~3 hrs
     → tier_features becomes enforcement source
     → #235 AI pool folds in here
  4. #233 staging compose fix                                  ~1 hr
  5. #234 deploy process redesign (design doc + key fixes)     ~2 hrs

Day 2 (2026-03-26):
  1. #262 URGENT demo calculated markers fix                   ~1 hr
  2. #236 pricing page sync (EN + DE locale JSON)              ~1.5 hrs
  3. #230 website tier audit against new SSoT                  ~1.5 hrs
  4. #243 markers directory audit                              ~1 hr
  5. #245 security hardening design doc                        ~2 hrs
  6. #242 GDPR delete cascade                                  ~1 hr
  7. #209 access log fix                                       ~30 min
  8. #254 GitHub README optimization + SVGs                    ~1.5 hrs
  9. #221 + #222 + #240 PWA fix bundle                         ~1 hr
 10. RC check + deploy                                         ~30 min
```

## Velocity Budget

| Priority | Points |
|----------|--------|
| P0 — Licensing SSoT (#241, #237, #235) | 18 pts |
| P0 — Deploy Hardening (#233, #234) | 8 pts |
| P0 — Pricing & Content (#236, #230, #243) | 8 pts |
| P0 — Demo Fix (#262) | 3 pts |
| P0 — Security (#245, #242, #209) | 10 pts |
| P1 — README Optimization (#254) | 3 pts |
| P1 — PWA Fixes (#221, #222, #240) | 4 pts |
| **Total Planned** | **54 pts** |

## Issues Deferred (Conscious Scope Cuts)

| # | Title | Why Deferred |
|---|-------|-------------|
| #019 | feat: onboarding flow (8pt) | Needs stable licensing/tier model first. Next sprint |
| #238 | feat: AI usage cost tracking | Depends on #237 pool model. Next sprint after pool ships |
| #239 | feat: AI model agnostic | Infrastructure work, not blocking licensing |
| #229 | ops: fresh clone setup test | Follow-up after #234 |
| #232 | ops: Lighthouse audit | After PWA fixes land |

## Local ↔ GitHub Issue Mapping

Local tracker numbers diverged from GitHub during bulk sync. Reference table:

| Local # | GitHub # | Title |
|---------|----------|-------|
| #241 | GH-227 | design: multi-product/multi-org license model |
| #237 | GH-231 | feat: license tier SSoT + AI pool counting |
| #235 | GH-233 | feat: unified AI credit pool |
| #233 | GH-235 | ops: staging compose fix |
| #234 | GH-234 | ops: deployment process overhaul |
| #236 | GH-232 | fix: pricing page sync |
| #230 | GH-238 | fix: website license tiers |
| #243 | GH-225 | fix: markers directory |
| #245 | GH-223 | design: security hardening |
| #242 | GH-226 | fix: GDPR delete cascade |
| #209 | GH-209 | fix: access log missing entries |
| #221 | GH-246 | fix: PWA icon missing |
| #222 | GH-245 | fix: PWA app name |
| #240 | GH-228 | fix: PWA splash screen |
| #262 | GH-259 | fix: URGENT — demo calculated markers no values |
| #254 | GH-251 | docs: GitHub README optimization + SVGs |

## Success Criteria

After this sprint:

1. **Licensing SSoT exists** — `license_tiers` + `tier_features` is THE single source of truth across all three layers (org structure, platform, app)
2. **Licensing enforced consistently** — every `tier_features` row has a matching enforcement check in `tier.rs`; no hardcoded limits remain
3. **Website reflects DB** — `tiers.json` generated from DB; pricing page reads from SSoT; EN + DE accurate
4. **AI credit pool designed + migrated** — single pool replaces 8 per-chat quotas
5. **Multi-product license model documented** — clear answer on product_key, org billing, role scoping
6. **Demo mode works** — calculated markers display correct values in demo context
7. **Deploy process redesigned** — documented root cause analysis, staging env vars fixed
8. **Security framework designed** — 6-layer model with 2 items implemented (#242, #209)
9. **GitHub READMEs rewritten** — BrickOS philosophy + Sovereign Health data sovereignty story + SVG diagrams
10. **PWA polished** — icon, name, and splash screen fixed on Linux
