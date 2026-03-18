-- Tax Compliance & Billing Data Sovereignty (#100)
-- Adds billing fields to user_profile and creates local mirror tables
-- for invoices, line items, payment methods, and tax IDs.

-- 4.1 Extend user_profile with billing fields
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

-- 4.2 Local mirror of Stripe invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255),
    invoice_number VARCHAR(100),
    status VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'eur',
    -- Amounts
    subtotal_cents INTEGER NOT NULL DEFAULT 0,
    tax_cents INTEGER NOT NULL DEFAULT 0,
    discount_cents INTEGER NOT NULL DEFAULT 0,
    total_cents INTEGER NOT NULL DEFAULT 0,
    amount_paid_cents INTEGER NOT NULL DEFAULT 0,
    amount_due_cents INTEGER NOT NULL DEFAULT 0,
    -- Tax details
    tax_rate_percent DECIMAL(5,2),
    tax_type VARCHAR(50),
    tax_country VARCHAR(2),
    -- Billing snapshot (immutable at time of invoice)
    customer_email VARCHAR(255),
    customer_name VARCHAR(255),
    customer_type VARCHAR(20),
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

CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- 4.3 Invoice line items
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    stripe_line_item_id VARCHAR(255),
    description TEXT,
    amount_cents INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_amount_cents INTEGER,
    price_id VARCHAR(255),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    proration BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);

-- 4.4 Payment methods cache
CREATE TABLE IF NOT EXISTS payment_methods_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_pm_id VARCHAR(255) UNIQUE NOT NULL,
    pm_type VARCHAR(50) NOT NULL,
    card_brand VARCHAR(50),
    card_last4 VARCHAR(4),
    card_exp_month SMALLINT,
    card_exp_year SMALLINT,
    is_default BOOLEAN DEFAULT false,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, stripe_pm_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods_cache(user_id);

-- 4.5 Customer tax IDs
CREATE TABLE IF NOT EXISTS customer_tax_ids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_tax_id VARCHAR(255) UNIQUE,
    tax_type VARCHAR(50) NOT NULL,
    tax_value VARCHAR(50) NOT NULL,
    verification_status VARCHAR(20),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
