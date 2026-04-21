# ADR-052: Effective-User Swap via AuthenticatedUser

**Date:** 2026-04-20
**Status:** Accepted (implemented in Sprint 048)
**Sprint:** 048
**Supersedes / refines:** ADR-051 (impersonation-only model)
**Design:** 028 v3

## Context

ADR-051 decided that practitioner access to patient data is via
read-only impersonation only -- no parallel clinical record store.
During implementation we had to answer a concrete engineering
question:

> Should impersonation be a new code path (dedicated
> `/practitioner/view/...` endpoints that fetch on behalf of a
> patient), or should it reuse the existing patient endpoints
> unchanged?

The trade-off:

- **Dedicated endpoints** are explicit and easy to audit, but double
  the surface area: every read path already exposed to patients needs
  a practitioner-view twin. Changes to trend computation, marker
  enrichment, or zone rollups have to land in both places or the
  practitioner view drifts.
- **Endpoint reuse** keeps one code path but requires a mechanism to
  swap the effective user for the duration of the request: the
  backend must answer "what data does this practitioner see right
  now?" by acting as if the patient were the caller.

## Decision

We reuse every existing patient endpoint. Impersonation is a
middleware-level swap of the effective user inside
`AuthenticatedUser`.

```rust
pub struct AuthenticatedUser {
    pub user_id: Uuid,                           // effective caller
    pub original_user_id: Option<Uuid>,          // practitioner, if impersonating
    pub impersonating_session_id: Option<Uuid>,  // impersonation_sessions.id
    pub role: String,
    pub org_id: Option<Uuid>,
    pub org_role: Option<String>,
    // ...
}
```

`FromRequest` for `AuthenticatedUser` is async. It:

1. Resolves the JWT and loads the base user (the practitioner).
2. If `X-Impersonation-Token` is present, runs a single
   `UPDATE impersonation_sessions ... RETURNING patient_user_id,
   org_id` that also `JOIN`s `patient_consents WHERE revoked_at IS
   NULL` and `WHERE last_seen_at > now() - 30 min`.
3. If the session is valid and consent is active, it swaps
   `user_id` to the patient's id, bumps `last_seen_at` in the same
   statement, and records `original_user_id` = practitioner id +
   `impersonating_session_id` = the session row.
4. Otherwise the token is ignored silently -- the practitioner
   continues to see their own data. (The frontend banner + cookie
   are cleared on the next 401/consent-revoked error, but the
   backend never 401s on a stale impersonation token alone.)

Every handler that reads `auth.user_id` now sees the patient's id
under impersonation. Existing queries, caching, and zone rollups
work unchanged. A one-line helper `auth.principal_id()` returns the
practitioner id (preferring `original_user_id` when set) and is used
exclusively for audit-log `actor_user_id` columns.

A separate `ImpersonationScopeGate` middleware rejects writes and
hard-excluded reads before they hit the handler:

- Writes → 403 `impersonation_readonly` + audit row
  `impersonation.blocked_write`.
- Hard-excluded paths (Doctor Chat, billing, settings mutations) →
  403 `impersonation_out_of_scope` + audit row
  `impersonation.blocked_out_of_scope`.

The scope classifier lives in `handlers/impersonation.rs` next to
the session handlers so route changes stay co-located with the
allow-list.

## Consequences

### Positive

- **One code path per feature.** Zone computation, trend chart,
  marker-by-slug endpoint, unit conversion -- every existing reader
  becomes impersonation-safe without edits.
- **Audit attribution is clean.** `principal_id()` gives the
  practitioner; `auth.user_id` gives the patient; we store both in
  every `audit_log` row so the cross-org viewer can filter either
  way.
- **Consent revocation is atomic.** Because the middleware's
  `UPDATE ... RETURNING` joins `patient_consents`, a revoked consent
  kills impersonation on the very next request without any
  cache-invalidation dance.
- **Tests are cheap.** Impersonation flow tests set one header and
  re-use the existing read-endpoint smoke suite. No test doubles
  for a "practitioner read service."
- **Adding a new endpoint is still simple.** Write it against
  `AuthenticatedUser.user_id` as usual. If it mutates, the scope
  gate blocks it automatically. If it's hard-excluded, add the path
  prefix to `HARD_EXCLUDED_PREFIXES`.

### Negative

- **Two sources of truth for "who is calling."** Handlers that want
  practitioner-scoped behaviour (e.g. logging who triggered a read)
  must call `principal_id()` not `user_id`. Easy to get wrong.
  Mitigation: audit-logging goes through a single `audit_log!`
  macro that always reads `principal_id()`.
- **Middleware complexity.** The `UPDATE ... RETURNING` with a
  consent JOIN is the hot path on every impersonated request.
  Measured p50 ~1.2 ms on local dev against a 5-row consents
  table; we will monitor staging when clinics scale.
- **Async `FromRequest`.** Required boxing the future, which is a
  small ergonomic cost and a small runtime cost (one heap
  allocation per request). Acceptable.
- **Hard-exclude list is a denylist.** New routes default to
  "allowed for impersonation reads." A future route that leaks
  clinic-private data would need an explicit `HARD_EXCLUDED_PREFIXES`
  entry. Mitigation: the scope-gate unit test asserts that every
  write verb is blocked, and a new code-review checklist item asks
  "does this endpoint need to be impersonation-scoped?"

### Neutral

- **Endpoint reuse vs. explicit endpoints.** The opposite design
  would have shown up as a `/practitioner/...` tree in the OpenAPI
  spec. The current design shows up as a single header on
  patient-facing routes. Both are defensible; we chose reuse for
  maintenance cost. A future compliance audit may reasonably ask
  to see an explicit practitioner-view route table -- we can
  synthesise one from the scope classifier's allow-list.

## Alternatives considered

1. **Dedicated `/practitioner/read/*` endpoints.** Rejected: doubles
   the read-path surface for the foreseeable future.
2. **Per-request `as_user_id` parameter on every reader.** Rejected:
   leaks the concern into every handler signature; easy to forget.
3. **Session-bound effective user stored in DB (no header).**
   Rejected: forces a session-scope switch the practitioner can't
   see, and couples impersonation to the browser's main auth
   cookie -- not possible to run two tabs as different patients.
4. **JWT swap.** Rejected: would require re-issuing a JWT every
   start/exit, complicating token rotation and revocation.

## Implementation references

- `api/src/middleware/auth.rs` (`AuthenticatedUser` + FromRequest)
- `api/src/middleware/impersonation.rs` (`ImpersonationScopeGate`)
- `api/src/handlers/impersonation.rs` (start/exit + scope classifier)
- `api/migrations/20260421000003_sprint048_impersonation_sessions.sql`
- `frontend/src/lib/impersonation.ts` (cookie helpers)
- `frontend/src/components/impersonation-banner.tsx`
- `frontend/e2e/sprint-048-impersonation.spec.ts` (11 test specs)

## Follow-ups

- Monitor impersonation UPDATE latency on staging. If it becomes
  a bottleneck, consider a 5-second in-memory cache keyed by
  (session_id, last_seen_at) with consent-revoke invalidation.
- Consider a "peek" mode where the practitioner can glance at a
  patient without writing an audit row per read. Out of scope for
  Sprint 048 -- would need a separate ADR about when reads are not
  audited.
