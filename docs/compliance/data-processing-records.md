# Data Processing Records -- GDPR Art. 30

**Controller:** Sovereign Brick (brickos.io)
**Product:** Sovereign Health (app.sovereignhealth.io)
**Last updated:** 2026-04-05
**Data Protection Architecture:** See ADR-016

---

## 1. User Registration

| Field | Value |
|---|---|
| **Purpose** | Create and manage user accounts for platform access |
| **Legal basis** | Contract performance -- Art. 6(1)(b) GDPR |
| **Data categories** | Email address, password hash (Argon2), display name, country code |
| **Data subjects** | Registered users, demo accounts, admin accounts |
| **Technical measures** | Password hashed with Argon2; Row-Level Security (RLS) enforces user isolation; TLS in transit |
| **Retention** | Until account deletion + 30-day grace period (soft delete), then hard-deleted |
| **Deletion mechanism** | User-initiated via Settings > Privacy > Delete Account; soft delete sets `is_deleted = true` + `deleted_at`; cron hard-deletes after 30 days; protected users (demo, admin) excluded |
| **Third-party recipients** | None |
| **Cross-border transfer** | None |

## 2. Health Measurements

| Field | Value |
|---|---|
| **Purpose** | Store and display biomarker values for personal health tracking |
| **Legal basis** | Explicit consent -- Art. 9(2)(a) GDPR (special category: health data) |
| **Data categories** | Biomarker values, measurement timestamps, device info, reference ranges |
| **Data subjects** | Registered users, demo accounts |
| **Technical measures** | AES-256-GCM field-level encryption at rest (ADR-004); RLS database isolation; TLS in transit; IP addresses stored as SHA-256 hashes |
| **Retention** | Until account deletion (user controls their data lifetime) |
| **Deletion mechanism** | Cascade-deleted with account; individual measurements deletable by user |
| **Third-party recipients** | None -- encrypted at rest, never shared |
| **Cross-border transfer** | None |

## 3. AI Health Analysis (Dr. Alex)

| Field | Value |
|---|---|
| **Purpose** | Provide AI-powered health insights based on user biomarker data |
| **Legal basis** | Explicit consent -- Art. 9(2)(a) GDPR |
| **Data categories** | User question text, health context (biomarker values + reference ranges), AI response |
| **Data subjects** | Registered users who initiate AI chat |
| **Technical measures** | Conversations encrypted at rest; API calls over TLS; no health data persisted by Anthropic (zero-retention API) |
| **Retention** | 360 days (configurable via `app_settings`), then auto-purged |
| **Deletion mechanism** | Time-based automatic deletion; cascade-deleted with account |
| **Third-party recipients** | **Anthropic, Inc. (US)** -- Claude API for inference; data processed under Anthropic's zero-retention commercial API terms (no training on user data) |
| **Cross-border transfer** | EU to US -- Anthropic API; covered by Anthropic's DPA and Standard Contractual Clauses (SCCs) |
| **DPA status** | Anthropic commercial API terms include data processing commitments |

## 4. Lab Import (OCR)

| Field | Value |
|---|---|
| **Purpose** | Extract biomarker values from uploaded lab report images/PDFs |
| **Legal basis** | Explicit consent -- Art. 9(2)(a) GDPR |
| **Data categories** | Lab report images/PDFs (may contain name, date of birth, test results) |
| **Data subjects** | Registered users who upload lab reports |
| **Technical measures** | Images processed in memory; not persisted after extraction; extracted values stored as encrypted measurements (see #2); TLS in transit to Vision API |
| **Retention** | Source images/PDFs: not stored after extraction. Extracted values: see Health Measurements (#2) |
| **Deletion mechanism** | No deletion needed -- source data not persisted |
| **Third-party recipients** | **Anthropic, Inc. (US)** -- Claude Vision API for OCR extraction; zero-retention commercial API |
| **Cross-border transfer** | EU to US -- Anthropic Vision API; same DPA as #3 |
| **DPA status** | Anthropic commercial API terms |

## 5. Medication Tracking

| Field | Value |
|---|---|
| **Purpose** | Track user medications, dosages, and prescriber information |
| **Legal basis** | Explicit consent -- Art. 9(2)(a) GDPR (health data) |
| **Data categories** | Drug names, dosages, prescriber name |
| **Data subjects** | Registered users |
| **Technical measures** | AES-256-GCM field-level encryption at rest; RLS isolation; TLS in transit |
| **Retention** | Until account deletion |
| **Deletion mechanism** | Cascade-deleted with account; individual entries deletable by user |
| **Third-party recipients** | None |
| **Cross-border transfer** | None |

## 6. Billing

| Field | Value |
|---|---|
| **Purpose** | Process subscription payments and manage billing tiers |
| **Legal basis** | Contract performance -- Art. 6(1)(b) GDPR |
| **Data categories** | Email, subscription tier, payment method token (no raw card data stored) |
| **Data subjects** | Paying users |
| **Technical measures** | No raw payment credentials stored; Stripe/Strike handle PCI-DSS; only tokens and tier metadata stored locally |
| **Retention** | Until account deletion |
| **Deletion mechanism** | Subscription cancelled and token references removed on account deletion |
| **Third-party recipients** | **Stripe, Inc. (US)** -- card payments; **Strike (US)** -- Bitcoin/Lightning payments |
| **Cross-border transfer** | EU to US -- Stripe and Strike APIs |
| **DPA status** | Stripe DPA available at stripe.com/legal/dpa; Strike terms per their commercial agreement |

## 7. Affiliate Tracking

| Field | Value |
|---|---|
| **Purpose** | Track referral sources for affiliate program attribution |
| **Legal basis** | Legitimate interest -- Art. 6(1)(f) GDPR (business analytics for referral program) |
| **Data categories** | Referral codes, click timestamps |
| **Data subjects** | Website visitors (via referral links), registered users with referral codes |
| **Technical measures** | No PII collected beyond referral code; first-touch cookie (30-day expiry); click data is aggregate |
| **Retention** | Until account deletion |
| **Deletion mechanism** | Cascade-deleted with account |
| **Third-party recipients** | None |
| **Cross-border transfer** | None |
| **Balancing test** | Minimal data (referral code + timestamp); no profiling; necessary for affiliate compensation; user can delete account to remove |

## 8. Analytics / Audit

| Field | Value |
|---|---|
| **Purpose** | Security audit trail, access logging, and operational monitoring |
| **Legal basis** | Legitimate interest -- Art. 6(1)(f) GDPR (security and fraud prevention) |
| **Data categories** | Access logs (IP hashes, user agent, endpoint, timestamp), audit events (action type, resource, user ID), data access logs (who viewed which health data) |
| **Data subjects** | All authenticated users, admin accounts |
| **Technical measures** | IP addresses stored as SHA-256 hashes (not raw); pgaudit for SQL-level logging; application-level `audit_log` and `data_access_log` tables; RLS prevents cross-user access |
| **Retention** | Contact form submissions: 90 days; Audit logs: 360 days (configurable via `app_settings`) |
| **Deletion mechanism** | Time-based automatic purge per retention policy |
| **Third-party recipients** | None |
| **Cross-border transfer** | None |
| **Balancing test** | Hashed IPs minimize PII; required for security incident investigation; retention periods proportionate to purpose |

## 9. Newsletter

| Field | Value |
|---|---|
| **Purpose** | Send product updates and health-related content to opted-in users |
| **Legal basis** | Consent -- Art. 6(1)(a) GDPR |
| **Data categories** | Email address, consent timestamp, subscription status, confirmation status |
| **Data subjects** | Users who opt in via signup checkbox or Settings > Privacy consent toggle |
| **Technical measures** | Double opt-in (confirmation required); consent changes audited in `audit_log` (DSGVO Art. 7); one-click unsubscribe in every email (CAN-SPAM + GDPR); `newsletter_subscribers` table with `subscribed` and `confirmed` flags |
| **Retention** | Until unsubscribe or account deletion |
| **Deletion mechanism** | User toggles off consent in Settings > Privacy; one-click unsubscribe link; cascade-deleted with account |
| **Third-party recipients** | None -- self-hosted email infrastructure |
| **Cross-border transfer** | None |

---

## Summary of Third-Party Sub-Processors

| Sub-Processor | Country | Purpose | DPA |
|---|---|---|---|
| Anthropic, Inc. | US | AI inference (Claude API + Vision) | Commercial API terms (zero-retention) |
| Stripe, Inc. | US | Card payment processing | stripe.com/legal/dpa |
| Strike | US | Bitcoin/Lightning payment processing | Commercial agreement |

## Technical Measures (Platform-Wide)

- **Encryption at rest:** AES-256-GCM field-level encryption for all health data (ADR-004)
- **Encryption in transit:** TLS 1.2+ on all endpoints (nginx termination)
- **Access control:** Row-Level Security (RLS) in PostgreSQL (ADR-003); JWT-based authentication
- **Audit logging:** pgaudit (SQL-level) + application audit_log table
- **IP anonymization:** All IP addresses stored as SHA-256 hashes
- **Data minimization:** Lab report images processed in memory only, not stored
- **Backup encryption:** Database backups encrypted; backup gateway (ADR in platform/)

## Review Schedule

This document must be reviewed and updated:
- When a new processing activity is added
- When a sub-processor is added or changed
- At minimum every 12 months
- Next review due: 2027-04-05
