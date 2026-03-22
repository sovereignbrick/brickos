---
title: "feat: Wire one-click email unsubscribe into outgoing emails (GDPR/CAN-SPAM)"
milestone: "UI: Privacy & Security Features"
milestone_number: 13
status: created
issue_number: 178
---

## Context

ADR-016 requires:
> One-click email unsubscribe (CAN-SPAM + GDPR compliant)

The backend has:
- `email_unsubscribed` flag on `user_preferences`
- HMAC-based unsubscribe token generation in `auth.rs`

However, **outgoing emails do not include the unsubscribe link**. The token generation and flag exist but are not wired into the email sending pipeline.

## Requirements

- Include `List-Unsubscribe` header in all outgoing emails (RFC 8058 one-click)
- Add unsubscribe link in email footer using the HMAC token
- Create `GET /unsubscribe?token=...` endpoint that sets `email_unsubscribed = true`
- Respect `email_unsubscribed` flag when sending emails
- i18n for EN + DE

## References

- ADR: `apps/health/sovereign-health/docs/project-files/adr/016-gdpr-privacy-architecture.md`
- Migration: `20260310000043_batch31_email_unsubscribe.sql`
- Token generation: `apps/health/sovereign-health/api/src/services/auth.rs`
