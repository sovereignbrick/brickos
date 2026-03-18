# Mailgun Setup Guide

Configure Mailgun for transactional and marketing email in the SaaS deployment.

## 1. Create Mailgun Account

Sign up at mailgun.com. The Flex plan includes 1,000 free emails/month.

## 2. Add and Verify Domain

Add your sending domain (e.g., `mg.sovereignhealth.io`).

### Required DNS Records

| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT | mg.sovereignhealth.io | v=spf1 include:mailgun.org ~all | 3600 |
| TXT | smtp._domainkey.mg.sovereignhealth.io | (provided by Mailgun) | 3600 |
| CNAME | email.mg.sovereignhealth.io | mailgun.org | 3600 |
| MX | mg.sovereignhealth.io | mxa.mailgun.org (priority 10) | 3600 |
| MX | mg.sovereignhealth.io | mxb.mailgun.org (priority 10) | 3600 |

### DMARC (recommended)

| Type | Name | Value |
|------|------|-------|
| TXT | _dmarc.sovereignhealth.io | v=DMARC1; p=quarantine; rua=mailto:dmarc@sovereignhealth.io |

Wait for Mailgun to verify DNS (usually 24-48 hours).

## 3. Create API Key

In Mailgun dashboard > API Keys > Create API Key.
Copy the key -- it starts with `key-`.

## 4. Create Mailing List

In Mailgun dashboard > Sending > Mailing Lists > Create.

- Address: `users@mg.sovereignhealth.io`
- Description: Sovereign Health user list

## 5. Configure Environment

Add to your `.env` or production environment:

```bash
MAILGUN_API_KEY=key-your-api-key-here
MAILGUN_DOMAIN=mg.sovereignhealth.io
MAILGUN_FROM=Sovereign Health <noreply@mg.sovereignhealth.io>
MAILGUN_LIST=users@mg.sovereignhealth.io
```

## 6. Verify

Restart the backend and check logs for:

```
Email provider: Mailgun (domain=mg.sovereignhealth.io)
```

## Safe Tag Policy

Only the following tag prefixes are synced to Mailgun:

| Prefix | Examples | Purpose |
|--------|----------|---------|
| `source:` | source:signup, source:early-access | How the user joined |
| `tier:` | tier:glimpse, tier:insight | Current license tier |
| `consent:` | consent:product_updates, consent:newsletter | Email preferences |
| `status:` | status:active, status:churned | Account status |
| `lang:` | lang:en, lang:de | Preferred language |

**Never send to Mailgun:** diet protocols, health goals, age, gender, marker data, or any health-related information.

All segmentation and targeting is done internally via the `user_segments` table. Mailgun is a dumb delivery pipe.

## Migrate Early Access Emails

To import early-access signups to Mailgun:

```bash
cargo run --bin migrate-early-access
```

This reads the early-access log file and adds each email to the mailing list with the `source:early-access` tag.
