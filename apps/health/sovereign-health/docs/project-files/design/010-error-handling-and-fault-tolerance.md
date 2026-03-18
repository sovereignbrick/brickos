# Design: Error Handling & Fault Tolerance — BrickOS Platform

**Issue:** [#115](https://github.com/sovereignbrick/brickos/issues/115)
**Status:** Draft
**Date:** 2026-03-18

---

## Problem

When external services fail (Anthropic 529, Stripe timeout, Mailgun bounce), the platform either hangs silently, shows raw technical errors, or swallows failures without logging. Users get no feedback; admins get no visibility. The `audit_log` table existed but had 0 rows. The Dr. Alex chat showed an infinite "thinking" spinner on API failure.

RC3 patched the immediate chat issue (#113) and added basic audit logging (#114), but the platform needs a systematic approach across all layers — not ad-hoc per-handler fixes.

This design proposes the **core infrastructure** for error handling, fault tolerance, and observability. Not everything needs to ship at once, but the foundation must be in place so each new handler/service follows the same pattern.

---

## Architecture: Six Layers of Error Handling

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. PRESENTATION (Frontend)                                         │
│     User-friendly messages, error boundaries, retry UX              │
├─────────────────────────────────────────────────────────────────────┤
│  2. APPLICATION (Backend Business Logic)                            │
│     AppError enum, domain error classification, Result<T, AppError> │
├─────────────────────────────────────────────────────────────────────┤
│  3. API (Service Boundary)                                          │
│     HTTP status codes, structured JSON error contract                │
├─────────────────────────────────────────────────────────────────────┤
│  4. DATABASE                                                        │
│     Constraints, transactions, migration safety                     │
├─────────────────────────────────────────────────────────────────────┤
│  5. INFRASTRUCTURE (External Services)                              │
│     Timeouts, circuit breakers, retry, graceful degradation         │
├─────────────────────────────────────────────────────────────────────┤
│  6. OBSERVABILITY (Cross-cutting)                                   │
│     Structured logging, audit_log, metrics, alerting                │
└─────────────────────────────────────────────────────────────────────┘
```

### Error Flow (concrete example)

```
Anthropic returns 529 Overloaded
  → reqwest gets non-2xx status               [Layer 5: Infrastructure]
  → call_claude() logs error, returns Err()   [Layer 6: Observability]
  → handler maps → AppError::ServiceOverloaded [Layer 2: Application]
  → audit::log() writes to audit_log           [Layer 6: Observability]
  → ResponseError → HTTP 503 + JSON error      [Layer 3: API]
  → Frontend catches, maps to i18n key         [Layer 1: Presentation]
  → User sees: "Dr. Alex is temporarily        [Layer 1: Presentation]
    unavailable. Please try again."
  → Retry button offered                       [Layer 1: Presentation]
```

---

## Layer 1: Presentation (Frontend)

### Current State (RC3)
- Chat: maps `service_overloaded`, `rate_limited`, `upstream_error` to i18n messages (EN + DE)
- Chat: retry button on error
- Generic `request()` function throws on non-200
- No React Error Boundaries
- No global error toast system

### Target State

#### 1a. Global Error Toast
A `useErrorHandler()` hook + `<ErrorToast />` component in root layout:

```tsx
// lib/error-handler.ts
export function classifyApiError(err: Error): ErrorKey {
  const msg = err.message.toLowerCase()
  if (msg.includes('overloaded') || msg.includes('temporarily')) return 'serviceOverloaded'
  if (msg.includes('rate') || msg.includes('too many')) return 'rateLimited'
  if (msg.includes('upstream')) return 'serviceError'
  if (msg.includes('network') || msg.includes('fetch')) return 'networkError'
  if (msg.includes('unauthorized')) return 'sessionExpired'
  return 'unknown'
}
```

#### 1b. Error Boundaries
Wrap each route segment in a React Error Boundary:

```tsx
// components/error-boundary.tsx
export function PageErrorBoundary({ children }) {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      {children}
    </ErrorBoundary>
  )
}
```

#### 1c. i18n Error Keys (common namespace)

```json
{
  "errors": {
    "serviceOverloaded": "This service is temporarily unavailable. Please try again in a moment.",
    "rateLimited": "Too many requests. Please wait a moment.",
    "serviceError": "Something went wrong. Please try again.",
    "networkError": "Could not connect. Check your internet connection.",
    "sessionExpired": "Your session has expired. Please sign in again.",
    "paymentFailed": "Payment could not be processed. Please check your details.",
    "tryAgain": "Try again",
    "contactSupport": "If this persists, contact support."
  }
}
```

### Implementation Priority
- **P0 (RC4):** `classifyApiError()` utility, chat error messages (done in RC3)
- **P1:** Global `<ErrorToast />`, error boundary on route segments
- **P2:** Per-page graceful degradation (e.g., dashboard loads even if trends API fails)

---

## Layer 2: Application (Backend — `AppError` Enum)

### Current State (RC3)

```rust
pub enum AppError {
    InvalidCredentials,    // 401
    EmailConflict,         // 409
    Validation(String),    // 400
    NotFound,              // 404
    Unauthorized,          // 401
    Internal,              // 500
    QuotaExceeded,         // 403
    MissingApiKey,         // 503
    UpstreamError,         // 502
    ServiceOverloaded,     // 503 (new in RC3)
    RateLimited,           // 429 (new in RC3)
    UpgradeRequired(..),   // 403
    Forbidden,             // 403
}
```

### Target Additions

```rust
// Group external service errors with source context
#[error("External service error: {service} — {message}")]
ExternalServiceError {
    service: String,     // "anthropic", "stripe", "strike", "mailgun"
    message: String,
    retry_after: Option<u32>,  // seconds, from Retry-After header
},

// Timeout specifically (vs generic upstream)
#[error("Request to {service} timed out")]
Timeout { service: String },
```

### Error Classification Rules

| Upstream Status | AppError Variant | HTTP Response | User Impact |
|----------------|-----------------|---------------|-------------|
| 401/403 | `MissingApiKey` | 503 | "Service configuration error" |
| 429 | `RateLimited` | 429 | "Please wait and try again" |
| 500 | `UpstreamError` | 502 | "Service error, try again" |
| 503/529 | `ServiceOverloaded` | 503 | "Temporarily unavailable" |
| Timeout | `Timeout` | 504 | "Request took too long" |
| Network error | `UpstreamError` | 502 | "Could not reach service" |

### Implementation Priority
- **P0 (done):** `ServiceOverloaded`, `RateLimited` variants
- **P1:** `ExternalServiceError` with service name, `Timeout` variant
- **P2:** Middleware-based error logging (auto-audit all AppError responses)

---

## Layer 3: API (Error Contract)

### Current JSON Error Format

```json
{
  "data": null,
  "error": {
    "code": "service_overloaded",
    "message": "Service is temporarily overloaded — please try again in a moment"
  }
}
```

### Target Format (RFC 7807-inspired)

```json
{
  "data": null,
  "error": {
    "code": "service_overloaded",
    "message": "Service is temporarily overloaded — please try again in a moment",
    "service": "anthropic",
    "retry_after": 30,
    "request_id": "req_abc123"
  }
}
```

New fields (optional, only when relevant):
- `service` — which external service failed
- `retry_after` — seconds to wait (from upstream Retry-After header)
- `request_id` — correlation ID for admin debugging

### Implementation Priority
- **P0 (done):** `code` + `message` on all errors
- **P1:** Add `service` and `retry_after` fields
- **P2:** Add `request_id` correlation

---

## Layer 4: Database

### Current State
- Migrations use `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` (safe)
- `sqlx::Error` auto-converts to `AppError::Internal`
- Constraints: FK, UNIQUE, NOT NULL enforced
- RLS enabled on 16 tables
- pgaudit extension installed

### Gaps
- DB constraint violations (e.g., UNIQUE) return generic 500 instead of 409 Conflict
- No distinction between transient DB errors (connection pool exhausted) and permanent ones (constraint violation)

### Target: Smarter `From<sqlx::Error>`

```rust
impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        match &e {
            sqlx::Error::Database(db_err) => {
                let code = db_err.code().unwrap_or_default();
                match code.as_ref() {
                    "23505" => AppError::EmailConflict,  // unique_violation
                    "23503" => AppError::Validation(     // foreign_key_violation
                        "Referenced resource does not exist".into()
                    ),
                    "23514" => AppError::Validation(     // check_violation
                        "Value violates constraint".into()
                    ),
                    _ => {
                        tracing::error!("Database error ({}): {:?}", code, e);
                        AppError::Internal
                    }
                }
            }
            sqlx::Error::PoolTimedOut => {
                tracing::error!("Database pool exhausted");
                AppError::ServiceOverloaded
            }
            _ => {
                tracing::error!("Database error: {:?}", e);
                AppError::Internal
            }
        }
    }
}
```

### Implementation Priority
- **P1:** Smarter `From<sqlx::Error>` with constraint code mapping
- **P2:** Connection pool health monitoring

---

## Layer 5: Infrastructure (External Services)

### External Services Inventory

| Service | Crate/File | Current Timeout | Current Error Handling |
|---------|-----------|-----------------|----------------------|
| Anthropic (Chat) | `services/doctor_chat.rs` | 30s (RC3) | `ServiceOverloaded`/`RateLimited` (RC3) |
| Anthropic (Vision) | `services/doctor_chat.rs:1117,1224` | None | Generic `UpstreamError` |
| Stripe | `crates/brickos-billing/src/stripe.rs` | None | Varies |
| Strike | `crates/brickos-billing/src/strike.rs` | None | Varies |
| Mailgun | `crates/brickos-email/src/lib.rs` | None | Varies |
| Mailgun (Newsletter) | `handlers/newsletter.rs` | None | Generic error |

### Target: Shared HTTP Client with Defaults

```rust
// crates/brickos-http/src/lib.rs (or services/http_client.rs)
pub fn external_client(timeout_secs: u64) -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(timeout_secs))
        .connect_timeout(Duration::from_secs(5))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new())
}

pub fn classify_upstream_error(
    service: &str,
    status: StatusCode,
    body: &str,
) -> AppError {
    match status.as_u16() {
        401 | 403 => AppError::MissingApiKey,
        429 => AppError::RateLimited,
        503 | 529 => AppError::ServiceOverloaded,
        _ if status.is_server_error() => AppError::UpstreamError,
        _ => AppError::UpstreamError,
    }
}
```

### Timeout Policy

| Service | Timeout | Rationale |
|---------|---------|-----------|
| Anthropic (chat) | 30s | LLM generation can be slow |
| Anthropic (vision) | 60s | Image processing adds latency |
| Stripe | 10s | Payment API is fast |
| Strike | 15s | BTC invoice creation |
| Mailgun | 10s | Email send |

### Circuit Breaker (P2)

Not needed immediately, but the pattern to follow:

```
If service fails 3x in 60s → open circuit for 30s → return ServiceOverloaded immediately
After 30s → allow 1 probe request → if success, close circuit
```

Candidate for circuit breaker: Anthropic (most likely to be overloaded).

### Implementation Priority
- **P0 (done):** 30s timeout on Anthropic chat
- **P1:** Timeout on ALL external clients (vision, Stripe, Strike, Mailgun)
- **P1:** Shared `classify_upstream_error()` function
- **P2:** Circuit breaker on Anthropic
- **P3:** Retry with exponential backoff on transient errors (503, 429 with Retry-After)

---

## Layer 6: Observability

### Current State (RC3)
- `tracing` structured logging to stdout (Docker logs)
- `audit_log` table: chat errors + login success (RC3)
- `ai_usage_log` table: token/cost tracking
- `data_access_log` table: data access events
- pgaudit: SQL-level audit (extension installed)

### Target: Comprehensive Audit Events

#### audit_log Events to Implement

| Action | When | Metadata |
|--------|------|----------|
| `auth.login_success` | Login | ip (done in RC3) |
| `auth.login_failed` | Wrong password | ip, email_hash |
| `auth.signup` | New registration | ip |
| `auth.logout` | Logout | — |
| `auth.password_reset` | Password reset requested | — |
| `chat.request` | Chat message sent | agent_type, model |
| `chat.error` | Chat API failed | error, agent_type (done in RC3) |
| `chat.vision` | Image analysis | file_type, file_size |
| `measurement.create` | New measurement | marker_count |
| `measurement.delete` | Measurement deleted | — |
| `settings.update` | Settings changed | changed_fields |
| `billing.checkout` | Checkout initiated | tier, interval |
| `billing.error` | Payment failed | error, provider |
| `export.gdpr` | GDPR export | — |
| `account.delete` | Account deletion | — |
| `admin.*` | All admin actions | action details |

#### Structured Log Format

All `tracing` log entries should include:

```rust
tracing::error!(
    service = "anthropic",
    action = "chat.error",
    user_id = %user_id,
    status = status.as_u16(),
    error_type = "overloaded_error",
    "Anthropic API error"
);
```

### Monitoring Dashboard (P2)

Query audit_log for operational visibility:

```sql
-- Errors per service in the last hour
SELECT
    metadata->>'service' AS service,
    action,
    COUNT(*) AS count
FROM audit_log
WHERE created_at > now() - interval '1 hour'
  AND action LIKE '%.error'
GROUP BY 1, 2
ORDER BY count DESC;

-- Login attempts per IP
SELECT ip_address, COUNT(*) AS attempts,
       COUNT(*) FILTER (WHERE action = 'auth.login_success') AS success,
       COUNT(*) FILTER (WHERE action = 'auth.login_failed') AS failed
FROM audit_log
WHERE action LIKE 'auth.login%'
  AND created_at > now() - interval '24 hours'
GROUP BY 1
ORDER BY failed DESC;
```

### Alerting (P3)

Future: lightweight alerting via cron job or startup check:

- If `audit_log` has >10 `chat.error` in 5 minutes → log WARNING
- If `audit_log` has 0 `auth.login_success` in 24h on prod → investigate

### Implementation Priority
- **P0 (done):** `audit.rs` service, chat.error + auth.login_success events
- **P1:** Add login_failed, signup, measurement.create/delete, settings.update, billing events
- **P1:** Structured tracing fields (service, action, user_id)
- **P2:** Admin dashboard SQL queries
- **P3:** Alerting cron

---

## Implementation Roadmap

### Phase 1 — Core Infrastructure (RC4)

| Task | Layer | Effort |
|------|-------|--------|
| Timeout on all external HTTP clients | 5 | S |
| Shared `classify_upstream_error()` | 5 | S |
| Smarter `From<sqlx::Error>` | 4 | S |
| Add remaining audit events (login_failed, signup, measurement, settings) | 6 | M |
| Global `<ErrorToast />` component | 1 | M |
| React Error Boundary on route segments | 1 | S |
| Common `errors.*` i18n namespace (EN + DE) | 1 | S |

### Phase 2 — Enhanced Observability

| Task | Layer | Effort |
|------|-------|--------|
| `service` + `retry_after` fields in error response | 3 | S |
| `request_id` correlation across layers | 3+6 | M |
| Circuit breaker on Anthropic | 5 | M |
| Admin audit dashboard (SQL views) | 6 | M |
| Structured tracing fields on all handlers | 6 | L |

### Phase 3 — Production Hardening

| Task | Layer | Effort |
|------|-------|--------|
| Retry with exponential backoff (429, 503) | 5 | M |
| Per-page graceful degradation (dashboard partial load) | 1 | M |
| Alerting cron for error spikes | 6 | S |
| Health check endpoint with dependency status | 5 | S |
| Connection pool monitoring | 4 | S |

---

## Principles

1. **Fail fast internally, fail gracefully externally.** Backend returns errors immediately; frontend shows friendly messages with retry options.

2. **Never leak abstractions.** DB constraint names, API keys, stack traces — none of these reach the user. Map everything through `AppError`.

3. **Every external call gets a timeout.** No unbounded waits. 30s for LLMs, 10-15s for payment/email APIs.

4. **Every error gets logged.** `tracing` for developers (stdout/Docker), `audit_log` for admins (DB). Both, always.

5. **Error messages are i18n.** Frontend never shows raw backend error strings to users. All user-facing text goes through the translation system.

6. **Audit logging is fire-and-forget.** `audit::log()` never panics, never blocks the request. If logging fails, warn and continue.

---

## References

- [#113](https://github.com/sovereignbrick/brickos/issues/113) — Doctor chat infinite thinking (fixed RC3)
- [#114](https://github.com/sovereignbrick/brickos/issues/114) — Audit log population (started RC3)
- [#115](https://github.com/sovereignbrick/brickos/issues/115) — Graceful API error handling across services
- [RFC 7807](https://tools.ietf.org/html/rfc7807) — Problem Details for HTTP APIs
- `apps/health/sovereign-health/api/src/error.rs` — Current AppError enum
- `apps/health/sovereign-health/api/src/services/audit.rs` — Audit log service (RC3)
