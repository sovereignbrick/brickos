# Issue #328: Error handling, monitoring, logging + DSGVO compliance

**Type:** feature
**Priority:** high
**Component:** full-stack / import pipeline + admin + platform
**Sprint:** 021

## Description

The import pipeline needs proper error handling with user-friendly i18n messages, structured logging for debugging, and monitoring for performance analysis. Currently errors show technical messages ("Upstream AI service error") or hardcoded English strings.

Additionally, all logging must feed into the admin panel (`/admin` — Data Access, App Events, DB Audit tabs) as a consistent source of truth, with API monitoring exposed via an external health/metrics endpoint and displayed in a new admin tab. User activity tracking and DSGVO-compliant data access logging must be ensured.

## Requirements

### 1. User-facing error messages (i18n)
All error messages shown to users must be:
- Translated (EN + DE minimum)
- Non-technical (no API details, no stack traces)
- Actionable (tell user what to do)

Error scenarios to cover:
| Error | Current message | Required message |
|-------|----------------|-----------------|
| API credits exhausted | "Upstream AI service error" | "Import temporarily unavailable. Please try again later." |
| API timeout | "Upstream AI service error" | "Import is taking longer than expected. Please try again." |
| Invalid file type | Technical error | "This file type is not supported. Please upload a PDF or image." |
| File too large | Technical error | "File is too large. Maximum size is 10 MB." |
| No markers found | Shows empty review | "No health markers could be identified in this document." |
| Rate limited | "Upstream AI service error" | "Too many imports. Please wait a moment and try again." |
| API key missing | "Missing API key" | "Import service is not configured. Contact support." |
| Session expired | Various | "Your session has expired. Please log in again." |

### 2. Structured logging for debugging
Every import should log to `audit_log` with consistent action names:
- `import.start` — session ID, user ID, import type, file type, file size
- `import.classify` — category, language, confidence
- `import.extract` — method (tool_use vs text), token usage
- `import.match` — matched count, fuzzy count, unmatched count
- `import.validate` — validation warnings count
- `import.confirm` — measurements created, duplicates skipped
- `import.rollback` — measurements deleted
- `import.error` — full error context with request ID

### 3. API monitoring (external endpoint + admin tab)
- **External health/metrics endpoint** (`GET /api/v1/health/metrics`) returning:
  - Per-endpoint latency (p50, p95, p99) over last hour
  - Error rate per endpoint
  - Active sessions count
  - AI API latency and error rate
  - Import success/failure rate
  - DB connection pool status
- **New admin tab: "API Monitoring"** displaying the metrics endpoint data:
  - Endpoint latency table with sparkline charts
  - Error rate trend (last 24h)
  - AI API status (avg latency, error count)
  - Import pipeline health (success rate, avg duration)
- Store per-request metrics in `import_sessions` for import pipeline
- Store general API metrics in-memory (rolling window) or lightweight DB table

### 4. User activity tracking (365-day retention)
- Add `last_login_at TIMESTAMPTZ` column to `users` table (migration)
- Update `last_login_at` on every successful authentication (login handler)
- Add `last_active_at TIMESTAMPTZ` column — updated on any authenticated API request (middleware, throttled to 1 update per 5 minutes to avoid DB pressure)
- Display both in admin Users tab with sortable columns
- 365-day retention policy: flag users inactive > 365 days for review
- Show "Last Active" in admin user detail view

### 5. DSGVO data access logging compliance
- **IP standardization:** Migrate `audit_log.ip_address` to hashed IPs (SHA-256), matching `data_access_log.ip_hash` — never store raw IPs
- **Consent audit trail (Art. 7):** Log every consent toggle change (newsletter, partner_offers, anonymous_data) with timestamp, old value, new value, IP hash
- **Auto-purge cron:** Implement scheduled cleanup for logs exceeding `audit_retention_days` setting (default 90 days for audit_log, 365 days for data_access_log per DSGVO Art. 5(1)(e))
- **Consistent logging source of truth:** All application events → `audit_log`, all data access → `data_access_log`, all DB changes → pgaudit — no overlap, no gaps

### 6. No hardcoded strings
- All user-facing text in i18n files (EN + DE)
- Error codes returned from backend, frontend maps to translated message
- Backend returns structured error: `{ "error": { "code": "credits_exhausted", "message": "..." } }`

## Location
- Backend errors: `api/src/handlers/import.rs`, `api/src/services/doctor_chat.rs`
- Backend audit: `api/src/services/audit.rs`
- Admin handlers: `api/src/handlers/admin_audit.rs`
- Admin frontend: `frontend/src/app/admin/` (audit-logs-tab, new api-monitoring-tab)
- Frontend error display: `components/doctor-chat/chat-layout.tsx`
- i18n: `frontend/src/i18n/messages/en.json`, `de.json`
- User privacy: `frontend/src/app/settings/components/privacy-tab.tsx`

## Acceptance Criteria
1. All import errors show translated, actionable messages (EN + DE)
2. Every import pipeline step writes to audit_log with structured metadata
3. External `/api/v1/health/metrics` endpoint returns live API metrics
4. New "API Monitoring" tab in admin panel displays metrics
5. `last_login_at` and `last_active_at` columns exist and update correctly
6. Admin Users tab shows last login/active with sort
7. No raw IPs in audit_log — all hashed
8. Consent changes logged with before/after values
9. Auto-purge runs on API startup for expired log entries
