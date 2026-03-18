# Design: Data Sovereignty & Vendor Independence

**Issue:** [#92](https://github.com/sovereignbrick/brickos/issues/92)
**Milestone:** [Data Sovereignty & Vendor Independence](https://github.com/sovereignbrick/brickos/milestone/21)
**Status:** Draft
**Date:** 2026-03-18

## Problem
BrickOS depends on Stripe for payment data and Mailgun for email delivery data. If either vendor changes terms, has an outage, or we want to switch providers, critical data is only accessible through their APIs. The platform should be the single source of truth for all data.

## Current State

### Stripe — Partially Mirrored
| Data | Local? | Gap |
|------|--------|-----|
| `stripe_customer_id` on users | Yes | — |
| Subscriptions (tier, period, status) | Yes | — |
| Payment events audit log | Yes | — |
| Refunds | Yes | — |
| Invoice number + PDF URLs | Yes | Missing: line items, tax, discounts |
| Payment methods (card brand, last4) | No | Fetched on-demand via API |
| Customer billing details (address, tax ID) | No | Only in Stripe |
| Coupon/discount objects | No | Only promo codes stored |
| Credit notes, balance transactions | No | — |

### Mailgun — Partially Mirrored
| Data | Local? | Gap |
|------|--------|-----|
| Newsletter subscribers | Yes | — |
| Consent preferences | Yes | — |
| Email sends log (campaign, status) | Yes | — |
| Bounce events | No | Only in Mailgun |
| Complaint (spam) events | No | Only in Mailgun |
| Open/click tracking | No | Only in Mailgun |
| Delivery status webhooks | No | — |
| Mailing list state diff | No | Local and Mailgun can drift |

## Approach

### Phase 1: Stripe Full Mirror
1. **Extend webhook handler** — already processes 6 event types; add full invoice object storage on `invoice.created`, `invoice.updated`
2. **New tables:** `invoices` (full object), `invoice_line_items`, `payment_methods_cache`
3. **Sync job:** periodic pull of customer details, payment methods (cron or on-login)
4. **Admin views:** invoice browser, payment method overview — no Stripe API calls needed

### Phase 2: Mailgun Event Ingestion
1. **Register Mailgun webhooks** for: delivered, bounced, complained, opened, clicked, unsubscribed
2. **New table:** `email_events` (event_type, recipient, timestamp, message_id, metadata)
3. **Reconciliation:** compare `newsletter_subscribers` + `email_sends` against Mailgun list state
4. **Admin views:** delivery history, bounce list, engagement stats

### Phase 3: Vendor Switch Readiness
1. Document what's needed to replace Stripe with BTCPay/Strike-only
2. Document what's needed to replace Mailgun with SMTP/self-hosted (already supported via SmtpProvider)
3. Data export: all vendor-mirrored data exportable as JSON

## Data Model

### Stripe Extensions

```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255),
    number VARCHAR(100),
    status VARCHAR(50),             -- draft, open, paid, void, uncollectible
    amount_due_cents INTEGER,
    amount_paid_cents INTEGER,
    currency VARCHAR(10),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    hosted_invoice_url TEXT,
    invoice_pdf_url TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    description TEXT,
    amount_cents INTEGER,
    quantity INTEGER,
    price_id VARCHAR(255),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ
);

CREATE TABLE payment_methods_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    stripe_pm_id VARCHAR(255) UNIQUE NOT NULL,
    pm_type VARCHAR(50),            -- card, sepa_debit, etc.
    card_brand VARCHAR(50),
    card_last4 VARCHAR(4),
    card_exp_month SMALLINT,
    card_exp_year SMALLINT,
    is_default BOOLEAN DEFAULT false,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Mailgun Extensions

```sql
CREATE TABLE email_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id VARCHAR(255),
    event_type VARCHAR(50) NOT NULL, -- delivered, bounced, complained, opened, clicked, unsubscribed
    recipient VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    severity VARCHAR(50),            -- for bounces: permanent, temporary
    reason TEXT,                      -- bounce/complaint reason
    url TEXT,                         -- for click events
    user_agent TEXT,
    ip_address VARCHAR(45),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_events_recipient ON email_events(recipient);
CREATE INDEX idx_email_events_type ON email_events(event_type, timestamp);
```

## Open Questions
- [ ] Stripe webhook vs periodic sync? Webhooks are real-time but can miss events; periodic sync is slower but catches gaps. Do both?
- [ ] How long to retain email events? 90 days? 1 year? Forever?
- [ ] Should payment method cache include full billing address or just card info?
- [ ] Mailgun open/click tracking: useful for us or GDPR concern? (tracking pixels)

## References
- Stripe webhook handler: `api/src/handlers/billing.rs:897-1001`
- Mailgun provider: `crates/brickos-email/src/lib.rs`
- Existing payment_events table: `migrations/20260310000038_batch22_stripe_subscriptions.sql`
