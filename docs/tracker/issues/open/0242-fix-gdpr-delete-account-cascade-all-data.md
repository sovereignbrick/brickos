---
number: 242
title: "fix: GDPR account deletion must cascade all user data or export before delete"
labels: [bug, security, gdpr, compliance]
milestone: privacy-and-security
---

## Description

GDPR Article 17 (Right to Erasure) requires that when a user requests account deletion, ALL their personal data must be permanently removed. Need to verify that our delete cascade covers every table and that the user can export before deletion.

## Audit Checklist

Verify CASCADE DELETE or explicit cleanup for all user-associated tables:

### Core Data
- [ ] `users` — account record itself
- [ ] `measurements` — all biomarker measurements (encrypted values)
- [ ] `measurement_templates` — saved measurement routines
- [ ] `user_medications` — medication/supplement records
- [ ] `devices` — registered measurement devices
- [ ] `influence_factors` — tracked factors

### AI & Chat
- [ ] `doctor_chat_conversations` — all Dr. Alex conversations
- [ ] `doctor_chat_messages` — all messages within conversations
- [ ] `ai_usage_log` — AI token usage records

### Import History
- [ ] `import_sessions` — lab/med/measurement import sessions
- [ ] `import_session_markers` — extracted marker data from imports

### Billing & Affiliate
- [ ] `subscriptions` — Stripe subscription records
- [ ] `affiliate_clicks` — referral click tracking
- [ ] `affiliate_conversions` — conversion records
- [ ] `short_links` — vanity/affiliate short links (owner_user_id)
- [ ] `short_link_clicks` — associated click data
- [ ] `push_subscriptions` — Web Push subscriptions

### Settings & Privacy
- [ ] `custom_reference_ranges` — personal reference ranges
- [ ] `data_access_log` — GDPR audit trail (ironic — need to delete access logs about the user)
- [ ] `consent_records` — GDPR consent records
- [ ] `email_preferences` — newsletter/marketing preferences

### Organization
- [ ] `org_members` — remove from all organizations
- [ ] `data_shares` — revoke all data sharing grants

## Required Flow

### Before Deletion
1. User requests deletion in Settings > Data & Privacy
2. System offers "Export all data first?" → triggers GDPR export (JSON)
3. User confirms deletion with password re-entry
4. 7-day grace period (cancel within 7 days)
5. After grace period: permanent deletion

### Deletion Process
1. Cancel any active Stripe subscription
2. Remove from all organizations
3. Revoke all data shares
4. Delete all measurements, chats, imports, medications
5. Delete all encrypted values (AES keys can be destroyed)
6. Remove from affiliate system (anonymize, don't delete conversions)
7. Delete push subscriptions
8. Delete access logs for this user
9. Hard-delete user record (not soft-delete — GDPR requires actual erasure)
10. Send confirmation email to a temporary address, then delete email too

### What to Anonymize (not delete)
- Affiliate conversions: replace user reference with "deleted_user" (financial records)
- Aggregate analytics: keep anonymized counts but remove PII

## Files to Check
- `api/src/handlers/settings.rs` — current delete account handler (if exists)
- `api/migrations/` — check FK constraints for ON DELETE CASCADE
- `crates/brickos-db/` — any user cleanup functions
- Frontend: Settings > Data & Privacy delete flow
