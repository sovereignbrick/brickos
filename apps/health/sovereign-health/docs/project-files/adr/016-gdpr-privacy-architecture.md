# ADR-016: GDPR & Privacy Architecture

**Status:** Accepted
**Date:** 2026-03-09

## Context
Health data is a "special category" under GDPR (Article 9) requiring explicit consent and enhanced protections. The platform must implement privacy by design, not as an afterthought.

## Decision
Multi-layered privacy architecture:

### Data Protection
- **Field-level encryption** (ADR-004): Sensitive measurements encrypted with AES-256-GCM
- **Row-Level Security** (ADR-003): Database enforces user isolation independent of application logic
- **IP hashing:** IP addresses stored as SHA-256 hashes, not raw values

### Right of Access (Art. 15)
- `data_access_log` table tracks who accessed what health data and when
- Users can view their own access log via the Privacy tab

### Right to Erasure (Art. 17)
- **Soft delete with grace period:** `is_deleted = true` + `deleted_at` timestamp
- 30-day grace period for account recovery before hard delete
- Protected users (demo, admin) cannot be deleted
- All refresh tokens revoked immediately on deletion

### Right to Portability (Art. 20)
- Full data export as JSON (measurements, profile, devices, medications, supplements, custom reference ranges)
- Export via Settings → Privacy → Export Data

### Consent Management
- Granular consent toggles: newsletter, anonymous data sharing
- Consent changes audited in `audit_log`
- One-click email unsubscribe (CAN-SPAM + GDPR compliant)

### Audit Trail
- **pgaudit:** SQL-level logging of all write and DDL operations
- **Application audit log:** `audit_log` table with event type, user, IP hash, resource, timestamp
- **Retention policies:** Configurable via `app_settings` (default: 90 days for audit logs)

## Alternatives Considered
- **Minimal compliance (just cookie banner):** Insufficient for health data. Would not survive a GDPR audit.
- **External DPO service:** Premature for current scale. Architecture handles technical requirements; legal review is separate.

## Consequences
- **Easier:** Strong regulatory position, user trust, prepared for enterprise customers who require GDPR compliance documentation.
- **Harder:** Encryption overhead on every read/write, audit log volume, grace period complexity for account deletion.
- **Trade-off:** Engineering cost for compliance confidence. Non-negotiable for health data.
