# Right to Erasure -- Evidence Package

**Control:** Soft delete with 30-day grace period, hard purge cascade
**Regimes:** GDPR Art. 17 (right to erasure), GDPR Art. 5(1)(e) (storage limitation)
**Last verified:** 2026-04-06
**Verification method:** Code audit

## Implementation

BrickOS implements a two-phase deletion process:

1. **Soft Delete** -- User requests account deletion via settings. The account is marked `is_deleted=true` with `deleted_at=now()`. All refresh tokens are revoked. The user can no longer log in, but data is retained for 30 days to allow recovery.
2. **Hard Purge** -- A daily cron job (`cron_hard_purge`) finds users past the 30-day grace period and permanently deletes all their data in a single transaction. Tables with CASCADE FKs are handled automatically; tables with NO ACTION FKs are explicitly deleted first.
3. **Contact Purge** -- Separate 90-day retention for contact form submissions (GDPR Art. 5(1)(e) storage limitation).

The purge handles 20+ tables including measurements, medications, chat history, AI usage logs, devices, templates, licenses, and payment references. Audit log entries are anonymized (user_id set to NULL) rather than deleted.

## Code References

| Component | File | Lines | Purpose |
|---|---|---|---|
| Soft delete handler | `apps/health/sovereign-health/api/src/handlers/settings.rs` | L1219-1258 | Sets is_deleted=true, revokes tokens, notifies admins |
| Protected account guard | `apps/health/sovereign-health/api/src/handlers/settings.rs` | L1226-1237 | Prevents deletion of demo/system accounts |
| Grace period constant | `apps/health/sovereign-health/api/src/services/purge.rs` | L14 | 30-day grace period |
| Hard purge cron | `apps/health/sovereign-health/api/src/services/purge.rs` | L18-54 | Daily job finding expired users |
| Purge user transaction | `apps/health/sovereign-health/api/src/services/purge.rs` | L81-189 | Single-transaction deletion of all user data |
| Explicit FK table deletions | `apps/health/sovereign-health/api/src/services/purge.rs` | L84-153 | 15 tables with NO ACTION FKs |
| Audit log anonymization | `apps/health/sovereign-health/api/src/services/purge.rs` | L159-160 | Nullify user_id, keep audit record |
| Email sends anonymization | `apps/health/sovereign-health/api/src/services/purge.rs` | L163-166 | Replace email with '[purged]' |
| CASCADE deletion | `apps/health/sovereign-health/api/src/services/purge.rs` | L176-184 | Final user row delete triggers cascades |
| Contact purge | `apps/health/sovereign-health/api/src/services/purge.rs` | L58-77 | 90-day retention for contact submissions |

## Test References

| Test | File | Assertion |
|---|---|---|
| Tier tests (delete flow) | `apps/health/sovereign-health/api/tests/tier_test.rs` | Soft delete state verified |

## ADR References

| ADR | Title | Relevance |
|---|---|---|
| ADR-016 | GDPR Privacy Architecture | Right to erasure design, grace period rationale |
| ADR-033 | Data Reset Preserve Account | Data reset vs. full deletion distinction |

## Automated Verification

```bash
# Purge service tests
cargo test -p sovereign-health-api -- purge

# Verify no orphaned data after purge (staging)
psql -c "SELECT 'measurements' as tbl, COUNT(*) FROM measurements WHERE user_id NOT IN (SELECT id FROM users)
         UNION ALL
         SELECT 'devices', COUNT(*) FROM devices WHERE user_id NOT IN (SELECT id FROM users)" sovereign_health
```

## Manual Verification Steps

1. Create test user, add measurements, delete account -- verify is_deleted=true, deleted_at set
2. Advance clock past 30 days (or call `cron_hard_purge` directly) -- verify all user rows removed
3. Verify audit_log entries have user_id=NULL (anonymized, not deleted)
4. Verify email_sends show '[purged]' for email field
