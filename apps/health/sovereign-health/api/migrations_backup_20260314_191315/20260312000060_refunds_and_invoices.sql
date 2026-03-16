-- E06-P4: Refunds table
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    subscription_id UUID,
    stripe_refund_id VARCHAR(100),
    amount_cents INTEGER NOT NULL,
    reason VARCHAR(500),
    forced BOOLEAN NOT NULL DEFAULT false,
    admin_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_admin_id ON refunds(admin_id);

-- E06-P5: Invoice columns on payment_events
ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS stripe_invoice_id VARCHAR(100);
ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS invoice_pdf_url VARCHAR(500);
ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS invoice_hosted_url VARCHAR(500);
ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(20);
ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS tier_slug VARCHAR(50);

-- Sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;
