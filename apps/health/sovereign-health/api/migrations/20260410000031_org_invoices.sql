-- Sprint 040 #481 -- per-org invoice records.
--
-- Manual invoice flow: a brickos staff member creates a draft locally, optionally
-- "syncs to Stripe" which calls the Stripe Invoices API to create the matching
-- invoice + line items + finalize + send. The stripe_invoice_id is then stored
-- back here. Webhook updates flip status: draft -> sent -> paid (or overdue/failed).
--
-- design 022 §3.9 -- one row per invoice, line items as JSONB so the form is
-- additive without a join table.

CREATE TABLE IF NOT EXISTS org_invoices (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    stripe_invoice_id   TEXT UNIQUE,
    currency            VARCHAR(8) NOT NULL DEFAULT 'eur',
    status              VARCHAR(20) NOT NULL DEFAULT 'draft',
        -- draft | sent | paid | overdue | void | failed
    line_items          JSONB NOT NULL DEFAULT '[]'::jsonb,
        -- [{ product_slug, name, quantity, unit_amount_cents }]
    total_amount_cents  BIGINT NOT NULL DEFAULT 0,
    due_days            INT NOT NULL DEFAULT 30,
    memo                TEXT,
    created_by          UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at             TIMESTAMPTZ,
    paid_at             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_org_invoices_org    ON org_invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_org_invoices_status ON org_invoices(status);
CREATE INDEX IF NOT EXISTS idx_org_invoices_stripe ON org_invoices(stripe_invoice_id)
    WHERE stripe_invoice_id IS NOT NULL;

COMMENT ON TABLE org_invoices IS
    'Sprint 040 #481 -- per-org manual invoices. line_items is the form payload
    persisted for both draft and synced rows. stripe_invoice_id is set when the
    Stripe API call succeeds. status follows the lifecycle draft -> sent -> paid.';
