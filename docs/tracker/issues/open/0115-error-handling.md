---
github_number: 115
title: "feat: graceful API error handling across services"
milestone: infrastructure
labels: [feat]
points: 8
---

## Description
Graceful API error handling across services — systematic approach across all layers.

## Design Doc
apps/health/sovereign-health/docs/project-files/design/010-error-handling-and-fault-tolerance.md

## Sprint 021 Scope (Phase 1 only)

### Frontend
1. **Global `<ErrorToast />`** — `useErrorHandler()` hook + toast component in root layout. Catches API errors and shows translated messages.
2. **React Error Boundaries** — wrap each route segment in `<PageErrorBoundary>`. Prevent full-page crashes.
3. **`classifyApiError()` utility** — extend existing to cover all error codes from backend.
4. **Common `errors.*` i18n namespace** — EN + DE translations for: serviceOverloaded, rateLimited, serviceError, networkError, sessionExpired, paymentFailed, tryAgain, contactSupport.

### Backend
5. **Shared `classify_upstream_error()`** — centralized function in `services/http_client.rs` that maps HTTP status codes to `AppError` variants. Used by all external service calls.
6. **Smarter `From<sqlx::Error>`** — map PostgreSQL constraint codes (23505 unique, 23503 FK, 23514 check) to specific `AppError` variants instead of generic 500.
7. **Timeout on ALL external HTTP clients** — Stripe (10s), Strike (15s), Mailgun (10s). Anthropic chat (30s) and vision (60s) already set.

### Not in Sprint 021 (Phase 2+)
- `request_id` correlation across layers
- Circuit breaker on Anthropic
- Retry with exponential backoff
- Per-page graceful degradation
- Alerting cron
- Connection pool monitoring

## Location
- Design doc: `docs/project-files/design/010-error-handling-and-fault-tolerance.md`
- Backend error enum: `api/src/error.rs`
- Backend audit: `api/src/services/audit.rs`
- Frontend error handling: new `components/error-boundary.tsx`, `lib/error-handler.ts`
- i18n: `frontend/src/i18n/messages/{en,de}.json`
