# Tax Compliance & Billing Data Sovereignty

**Issue:** [#100](https://github.com/sovereignbrick/brickos/issues/100)
**Related:** [#92 Data Sovereignty](https://github.com/sovereignbrick/brickos/issues/92)
**Status:** Accepted
**Date:** 2026-03-18

---

## 1. Problem

BrickOS cannot issue tax-compliant invoices. We don't know:
- Whether a customer is a **private individual** or **organization**
- What **country** the customer is in
- Whether **VAT** should be charged, at what rate, or if **reverse charge** applies

Additionally, billing data (addresses, invoices, payment methods, tax IDs) is stored **only in Stripe**, violating our data sovereignty principle. If Stripe changes terms or we switch providers, we lose this data.

---

## 2. Current State

### What We Collect & Store Locally

| Data | Collected At | Stored In | Column |
|------|-------------|-----------|--------|
| Email | Signup | `users.email` | Yes |
| Display name | Signup | `users.display_name` | Yes |
| Stripe customer ID | First checkout | `users.stripe_customer_id` | Yes |
| Country code | Settings (optional) | `user_profile.country_code` | Yes, but optional and not linked to billing |
| Subscription state | Webhook | `subscriptions.*` | Yes |
| Payment events | Webhook | `payment_events.*` | Audit log only |
| Invoice number + PDF URL | Webhook | `payment_events.invoice_number, invoice_pdf_url` | Partial |
| Refunds | Admin action | `refunds.*` | Yes |

### What Stripe Collects & Stores (NOT Local)

| Data | Collected At | Stored In | Local? |
|------|-------------|-----------|--------|
| Billing address (street, city, postal, country) | Stripe checkout (`billing_address_collection: auto`) | Stripe customer | **NO** |
| Tax ID / VAT number | Stripe checkout (`tax_id_collection: true`) | Stripe customer | **NO** |
| Payment method (card brand, last4, expiry) | Stripe checkout | Stripe payment method | **NO** |
| Full invoice (line items, tax, discounts) | Stripe generates | Stripe invoice | **NO** |
| Tax rate applied | Stripe calculates | Stripe invoice | **NO** |
| Customer type (individual/company) | Not collected | Nowhere | **NO** |

### Key Gaps

1. **Customer type** — not collected anywhere. All users assumed private.
2. **Country** — optional in profile, not required before purchase, not sent to Stripe customer.
3. **Billing address** — collected by Stripe but not mirrored locally.
4. **Invoices** — only invoice_number and PDF URL stored, not line items, tax, or amounts.
5. **Payment methods** — fetched on-demand from Stripe API, never cached.
6. **Tax IDs** — collected by Stripe but not stored locally.

---

## 3. Solution

### 3.1 Collect Country at Registration

**Why registration:** Country determines locale defaults (units, date format) and is needed for tax before first purchase. Collecting early avoids blocking the checkout flow.

**Implementation:**
- Add **required** country selector to signup form (auto-detected from browser `navigator.language` or IP geolocation as default)
- Store in `user_profile.country_code` (column already exists, just make it required)
- Pass to Stripe when creating customer: `address[country]`
- User can change in Settings → Profile (triggers Stripe customer update)

### 3.2 Collect Customer Type at Checkout

**Why checkout (not registration):** Most users are private. Asking at signup adds friction. At checkout, the user expects to provide billing details — natural place to ask.

**Implementation:**
- Add customer type toggle on checkout page: **Private** (default) / **Organization**
- If organization: show company name + VAT ID fields
- Store locally in `user_profile` + pass to Stripe
- VAT ID validated via EU VIES API for reverse charge eligibility

### 3.3 Mirror All Billing Data Locally

Every piece of data that goes to Stripe must also be stored in BrickOS.

---

## 4. Data Model Changes

### 4.1 Extend user_profile

```sql
-- Migration: add billing fields to user_profile
ALTER TABLE user_profile
    ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20) NOT NULL DEFAULT 'private',
    ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS vat_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vat_id_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS vat_id_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS billing_address_line1 VARCHAR(255),
    ADD COLUMN IF NOT EXISTS billing_address_line2 VARCHAR(255),
    ADD COLUMN IF NOT EXISTS billing_address_city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS billing_address_postal_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS billing_address_state VARCHAR(100),
    ADD COLUMN IF NOT EXISTS billing_address_country VARCHAR(2);

-- Make country_code required for new users (existing NULL values are OK)
-- Enforced at application level, not DB constraint (to not break existing users)
```

### 4.2 New: invoices table (local mirror)

```sql
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255),
    invoice_number VARCHAR(100),           -- SHI-2026-0001
    status VARCHAR(50) NOT NULL,           -- draft, open, paid, void, uncollectible
    currency VARCHAR(10) NOT NULL DEFAULT 'eur',
    -- Amounts
    subtotal_cents INTEGER NOT NULL DEFAULT 0,
    tax_cents INTEGER NOT NULL DEFAULT 0,
    discount_cents INTEGER NOT NULL DEFAULT 0,
    total_cents INTEGER NOT NULL DEFAULT 0,
    amount_paid_cents INTEGER NOT NULL DEFAULT 0,
    amount_due_cents INTEGER NOT NULL DEFAULT 0,
    -- Tax details
    tax_rate_percent DECIMAL(5,2),         -- e.g., 19.00, 21.00, 0.00
    tax_type VARCHAR(50),                  -- vat, reverse_charge, exempt, none
    tax_country VARCHAR(2),                -- country tax was calculated for
    -- Billing snapshot (at time of invoice, not mutable)
    customer_email VARCHAR(255),
    customer_name VARCHAR(255),
    customer_type VARCHAR(20),             -- private, organization
    customer_company VARCHAR(255),
    customer_vat_id VARCHAR(50),
    customer_country VARCHAR(2),
    customer_address_line1 VARCHAR(255),
    customer_address_city VARCHAR(100),
    customer_address_postal_code VARCHAR(20),
    -- Period
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    -- URLs
    hosted_invoice_url TEXT,
    invoice_pdf_url TEXT,
    -- Metadata
    tier_slug VARCHAR(100),
    billing_interval VARCHAR(20),
    promo_code VARCHAR(100),
    metadata JSONB,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_at TIMESTAMPTZ,
    voided_at TIMESTAMPTZ
);

CREATE INDEX idx_invoices_user ON invoices(user_id, created_at DESC);
CREATE INDEX idx_invoices_status ON invoices(status);
```

### 4.3 New: invoice_line_items table

```sql
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    stripe_line_item_id VARCHAR(255),
    description TEXT,
    amount_cents INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_amount_cents INTEGER,
    price_id VARCHAR(255),                 -- Stripe price ID
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    proration BOOLEAN DEFAULT false
);

CREATE INDEX idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);
```

### 4.4 New: payment_methods_cache table

```sql
CREATE TABLE IF NOT EXISTS payment_methods_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_pm_id VARCHAR(255) UNIQUE NOT NULL,
    pm_type VARCHAR(50) NOT NULL,          -- card, sepa_debit, link
    card_brand VARCHAR(50),                -- visa, mastercard, amex
    card_last4 VARCHAR(4),
    card_exp_month SMALLINT,
    card_exp_year SMALLINT,
    is_default BOOLEAN DEFAULT false,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, stripe_pm_id)
);

CREATE INDEX idx_payment_methods_user ON payment_methods_cache(user_id);
```

### 4.5 New: customer_tax_ids table

```sql
CREATE TABLE IF NOT EXISTS customer_tax_ids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_tax_id VARCHAR(255) UNIQUE,
    tax_type VARCHAR(50) NOT NULL,         -- eu_vat, gb_vat, etc.
    tax_value VARCHAR(50) NOT NULL,        -- e.g., DE123456789
    verification_status VARCHAR(20),       -- pending, verified, unverified
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 5. VAT / Tax Rules

### EU VAT Decision Tree

```
Is customer in EU?
├── NO → No VAT (0%)
└── YES
    ├── Same country as Sovereign Brick (DE)?
    │   └── Charge 19% DE VAT (both private + org)
    └── Different EU country?
        ├── Private individual → Charge destination country VAT rate (OSS)
        └── Organization
            ├── Valid VAT ID? → Reverse charge (0% VAT, buyer accounts for VAT)
            └── No valid VAT ID? → Charge destination country VAT rate
```

### EU VAT Rates (reference)

| Country | Standard Rate |
|---------|--------------|
| DE | 19% |
| AT | 20% |
| FR | 20% |
| IT | 22% |
| ES | 21% |
| NL | 21% |
| BE | 21% |
| PL | 23% |
| SE | 25% |
| DK | 25% |
| IE | 23% |
| ... | ... |

**Recommendation:** Use Stripe Tax for automatic rate calculation rather than maintaining rates ourselves. Mirror the result locally.

### VIES VAT Validation

EU VAT IDs validated via the VIES (VAT Information Exchange System) API:
- Endpoint: `https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number`
- Input: country code + VAT number
- Output: valid/invalid + company name + address
- Cache result locally in `customer_tax_ids.verification_status`

---

## 6. Implementation Plan

### Phase 1: Country at Registration (Blocker for launch)

**Frontend — signup/page.tsx:**
1. Add country selector (dropdown with ISO 3166-1 codes, auto-detect default from `navigator.language`)
2. Make country required in validation schema
3. Send `country` in signup request

**Backend — auth.rs:**
1. Accept `country` in `SignupRequest`
2. Store in `user_profile.country_code` on signup
3. Pass `address[country]` when creating Stripe customer

**Settings — settings/page.tsx:**
1. Country already editable — make it required (can't be cleared)
2. On country change, update Stripe customer: `stripe.update_customer(address[country])`

### Phase 2: Customer Type at Checkout (Blocker for launch)

**Frontend — checkout/page.tsx:**
1. Add customer type toggle: Private (default) / Organization
2. If organization: show company_name + vat_id fields
3. Send all fields to backend with checkout request

**Backend — billing.rs:**
1. Accept `customer_type`, `company_name`, `vat_id` in checkout request
2. Store in `user_profile`
3. If EU org with VAT ID: validate via VIES API
4. Pass to Stripe: `customer.address`, `customer.tax_ids`, `customer_update`
5. For reverse charge: apply 0% tax and note on invoice

**Migration:**
1. Add columns to `user_profile` (customer_type, company_name, vat_id, billing_address_*)

### Phase 3: Local Invoice Mirror (Shortly after launch, ties to #92)

**Webhook handler — billing.rs:**
1. On `invoice.payment_succeeded` and `invoice.created`:
   - Fetch full invoice from Stripe API: `stripe.get_invoice(invoice_id)`
   - Store in `invoices` table with all line items, tax, billing snapshot
2. On `invoice.updated` / `invoice.voided`:
   - Update local invoice record

**Sync job (cron or on-demand):**
1. Periodic reconciliation: list all Stripe invoices, compare with local
2. Fill any gaps (missed webhooks)
3. Admin endpoint: `POST /admin/billing/sync-invoices`

### Phase 4: Payment Method & Tax ID Cache

**On checkout success / payment method update:**
1. Fetch payment methods from Stripe, cache locally
2. Fetch tax IDs from Stripe, store in `customer_tax_ids`

**On customer update (settings):**
1. Sync address + tax ID changes to Stripe
2. Update local cache

---

## 7. API Changes

### Modified Endpoints

| Endpoint | Change |
|----------|--------|
| `POST /auth/signup` | Accept `country` (required) |
| `POST /billing/checkout` | Accept `customer_type`, `company_name`, `vat_id` |
| `PUT /settings/profile` | Accept `customer_type`, `company_name`, `vat_id`, `billing_address_*` |

### New Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/billing/validate-vat` | Validate EU VAT ID via VIES |
| GET | `/billing/invoices` | List user's invoices (from local mirror) |
| GET | `/billing/invoices/:id` | Invoice detail with line items |
| GET | `/billing/invoices/:id/pdf` | Redirect to invoice PDF |
| GET | `/billing/payment-methods` | List cached payment methods |
| POST | `/admin/billing/sync-invoices` | Admin: reconcile local vs Stripe |
| GET | `/admin/invoices` | Admin: browse all invoices |

---

## 8. UI Changes

### Signup Form (add country)
```
Email:        [________________________]
Password:     [________________________]
Confirm:      [________________________]
Display Name: [________________________] (optional)
Country:      [Germany ▼]                 ← NEW (auto-detected, required)
[✓] I agree to Terms of Service
[✓] I am at least 18 years old
[✓] Send me product updates
[ ] Send me the monthly newsletter
[Create Account]
```

### Checkout Page (add customer type)
```
Plan: Focus — €9.99/month

Customer Type: (●) Private  ( ) Organization   ← NEW

── If Organization: ──────────────────────────
Company Name:  [________________________]     ← NEW
VAT ID:        [DE123456789_____________]     ← NEW (optional)
               ✓ Valid (verified via VIES)
───────────────────────────────────────────────

Country:       [Germany ▼]   (pre-filled from profile)
[Proceed to Payment →]
```

### Settings → Profile (add billing fields)
```
── Billing Information ───────────────────────
Customer Type: (●) Private  ( ) Organization
Company Name:  [________________________]     (if org)
VAT ID:        [________________________]     (if org)
Country:       [Germany ▼]
──────────────────────────────────────────────
```

### Settings → License (add invoice list)
```
── Invoice History ───────────────────────────
| Date       | Invoice    | Amount  | Tax    | Status | PDF |
| 2026-03-18 | SHI-2026-1 | €9.99   | €1.60  | Paid   | ↓   |
| 2026-02-18 | SHI-2026-0 | €9.99   | €1.60  | Paid   | ↓   |
──────────────────────────────────────────────
```

---

## 9. Data Sovereignty Checklist

After full implementation, every piece of billing data exists locally:

| Data | Local Table | Synced From |
|------|------------|-------------|
| Customer type (private/org) | `user_profile.customer_type` | User input |
| Country | `user_profile.country_code` | User input |
| Company name | `user_profile.company_name` | User input |
| VAT ID + verification | `customer_tax_ids` | VIES + Stripe |
| Billing address | `user_profile.billing_address_*` | Stripe checkout |
| Subscription state | `subscriptions` | Stripe webhook |
| Full invoices | `invoices` + `invoice_line_items` | Stripe webhook + API |
| Tax amounts + rates | `invoices.tax_*` | Stripe |
| Payment methods (masked) | `payment_methods_cache` | Stripe API |
| Payment events | `payment_events` | Stripe webhook |
| Refunds | `refunds` | Admin action |

**Vendor switch readiness:** With all data local, switching from Stripe to another provider (BTCPay, Paddle, self-hosted) requires only a new payment adapter — all customer, invoice, and subscription data is in BrickOS.

---

## 10. Stripe Tax (Active)

Stripe Tax is the chosen approach:
- Stripe calculates VAT automatically based on customer location
- Handles OSS (One-Stop-Shop) for EU cross-border sales
- Adds ~0.5% per transaction
- We mirror all tax results locally for data sovereignty
- Requires `automatic_tax[enabled]: true` on checkout session

All tax data (rates, amounts, country) is mirrored into local `invoices` table. If we ever move away from Stripe Tax, the local data + VAT rate table makes a manual approach possible.

## 11. Admin Access

All new tables must be accessible from the admin panel:

| Admin View | Table(s) | Operations |
|------------|----------|------------|
| User detail → Billing | `user_profile` billing fields | View/edit customer_type, country, company, VAT ID |
| Invoices browser | `invoices` + `invoice_line_items` | List, search, filter by date/user/status, view detail, PDF link |
| Payment methods | `payment_methods_cache` | View per user (read-only) |
| Tax IDs | `customer_tax_ids` | View, trigger re-verification |
| Sync tools | — | Manual Stripe sync, reconciliation report |

## 12. BrickOS Core Alignment

These billing tables belong to the **platform layer**, not the health app:
- `invoices`, `invoice_line_items` → future `platform/core-api` (milestone #12)
- `payment_methods_cache` → future `platform/core-api`
- `customer_tax_ids` → future `platform/core-api`
- `user_profile` billing columns → shared across all BrickOS apps

For now, migrations live in `apps/health/sovereign-health/api/migrations/` but are designed to be extractable into `platform/` when the core API is built.

---

## 11. References

- Stripe Tax docs: https://stripe.com/docs/tax
- VIES API: https://ec.europa.eu/taxation_customs/vies/
- EU VAT OSS: https://vat-one-stop-shop.ec.europa.eu/
- Stripe billing_address_collection: already enabled in `crates/brickos-billing/src/stripe.rs:103`
- Existing Stripe setup: [STRIPE_SETUP.md](STRIPE_SETUP.md)
- Data sovereignty issue: [#92](https://github.com/sovereignbrick/brickos/issues/92)
- Current billing handler: `api/src/handlers/billing.rs`
- Current Stripe service: `crates/brickos-billing/src/stripe.rs`
