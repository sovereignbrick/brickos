# ADR 033: Data reset preserves account, subscription, and settings

**Status:** Accepted
**Date:** 2026-04-05
**Context:** Sprint 023 -- Reset All Data feature (#299)

## Context
Users need a way to start fresh with their health data without losing their account, subscription, payment history, and profile settings. Use cases: testing phase complete, lifestyle change, or simply wanting a clean slate.

## Decision
`POST /settings/reset-data` deletes health data while preserving identity and billing:

**Deleted** (13 tables in FK order within a transaction):
- calculated_marker_values, measurement_templates, influence_factors
- import_sessions (CASCADE handles import_measurements)
- measurements, devices, labs, user_medications
- doctor_chat_conversations (CASCADE handles messages + ratings)
- reference_ranges, ai_credit_usage, chat_agent_quota, user_search_index

**Preserved:**
- users, user_profile, user_preferences (identity + settings)
- user_licenses, subscriptions (billing)
- org_members, app_roles, data_shares (organization)
- audit_log, email_sends (compliance)

**Two-phase confirmation:**
1. First call without `confirm` returns record counts (user sees what will be deleted)
2. Second call with `confirm: "RESET"` executes the deletion

**Audit + notification:** Audit log entry + ntfy alert with counts.

## Alternatives Considered
- **Per-table selective reset**: Rejected -- too complex for users ("delete just measurements but keep devices?"). Full reset is simpler to understand.
- **Soft-delete (mark as reset)**: Rejected -- wastes storage, complicates queries. Hard delete within a transaction is clean.
- **30-day grace period (like account deletion)**: Rejected -- reset is an intentional action, not accidental. The confirmation dialog (type "RESET") is sufficient safeguard.

## Consequences
- Users can restart without re-subscribing or re-configuring their profile
- Transaction ensures all-or-nothing -- no partial resets
- ntfy notification alerts admin to resets (could indicate issues if frequent)
- Demo account guard needed (#306): `@sovereignhealth.io` accounts should be protected from reset
