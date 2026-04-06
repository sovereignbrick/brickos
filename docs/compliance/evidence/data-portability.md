# Data Portability -- Evidence Package

**Control:** Complete user data export in JSON and CSV formats
**Regimes:** GDPR Art. 15 (right of access), GDPR Art. 20 (right to data portability), Data Act Art. 4-5
**Last verified:** 2026-04-06
**Verification method:** Automated test + Code audit

## Implementation

BrickOS provides two export formats covering all personal data:

1. **CSV Export** -- Measurements, calculated markers, medications, doctor chat conversations. Values are decrypted before export. Supports filtering by date range, markers, zones, devices, and protocol tags.
2. **JSON Export (v2.0)** -- Complete GDPR-compliant export including: user profile, preferences, consent records, measurements, calculated markers, medications, influence factors, devices (active + archived), templates, custom reference ranges, chat conversations (decrypted), data access log, and license information.

A GDPR export completeness test ensures every user-linked database table is either included in the export or explicitly documented as excluded with a reason.

## Code References

| Component | File | Lines | Purpose |
|---|---|---|---|
| CSV export handler | `apps/health/sovereign-health/api/src/handlers/export.rs` | L22-394 | Full CSV export with filtering, decryption, medications, chat |
| CSV value decryption | `apps/health/sovereign-health/api/src/handlers/export.rs` | L192 | Decrypts encrypted biomarker values |
| CSV medication export | `apps/health/sovereign-health/api/src/handlers/export.rs` | L243-303 | GDPR Art.20 portability for medications |
| CSV chat export | `apps/health/sovereign-health/api/src/handlers/export.rs` | L305-352 | GDPR Art.15/20 portability for AI conversations |
| JSON export handler | `apps/health/sovereign-health/api/src/handlers/reports.rs` | L653-671 | JSON export with tier check and audit logging |
| Export access logging | `apps/health/sovereign-health/api/src/handlers/export.rs` | L366-372 | GDPR audit trail for export events |

## Test References

| Test | File | Assertion |
|---|---|---|
| GDPR completeness -- all tables covered | `apps/health/sovereign-health/frontend/src/lib/gdpr-export-completeness.test.ts` | L86-97 | Every user-data table has a corresponding export field |
| GDPR completeness -- no unmapped fields | `apps/health/sovereign-health/frontend/src/lib/gdpr-export-completeness.test.ts` | L99-109 | Every export field maps to a known table |
| GDPR completeness -- exclusions documented | `apps/health/sovereign-health/frontend/src/lib/gdpr-export-completeness.test.ts` | L111-119 | Every excluded table has a documented reason |
| GDPR completeness -- no overlap | `apps/health/sovereign-health/frontend/src/lib/gdpr-export-completeness.test.ts` | L121-131 | No table in both included and excluded lists |
| GDPR completeness -- total count | `apps/health/sovereign-health/frontend/src/lib/gdpr-export-completeness.test.ts` | L133-147 | Total classified tables matches known count (33) |

## ADR References

| ADR | Title | Relevance |
|---|---|---|
| ADR-016 | GDPR Privacy Architecture | Data portability design decisions |

## Automated Verification

```bash
# GDPR export completeness test
cd apps/health/sovereign-health/frontend && pnpm test -- src/lib/gdpr-export-completeness.test.ts

# Backend export handler tests
cargo test -p sovereign-health-api -- export
```

## Manual Verification Steps

1. Log in as test user, trigger JSON export -- verify all 15 data categories present
2. Log in as test user, trigger CSV export -- verify measurements, medications, and chat sections
3. Verify encrypted fields are decrypted in export (values should not start with `v1:`)
4. Check `data_access_log` for export event after download
