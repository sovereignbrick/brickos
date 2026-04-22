# ADR-053: Shared API Base URL Helper (no hand-rolled fetch clients)

**Date:** 2026-04-22
**Status:** Accepted (v0.45.0 staging RC finding, landing in Sprint 049)
**Sprint:** 048 (discovered), 049 (refactor target)

## Context

The Next.js frontend has grown a main API client (`lib/api.ts`) that
computes its base URL at runtime:

```ts
const API_BASE = (() => {
  if (typeof window === 'undefined') return APP_CONFIG.apiUrl
  const host = window.location.hostname
  if (host.endsWith('.onion')) return ''
  if (host.endsWith('.brickos.io')) return ''
  if (host.endsWith('.sovereignhealth.io')) return ''
  return APP_CONFIG.apiUrl
})()
```

The `''` (same-origin) return is correct for every prod/staging host
because nginx path-mounts the API behind a location regex on those
domains. Only local dev / third-party hosts need the build-time
`NEXT_PUBLIC_API_URL` default (`http://localhost:8080` or `/api`).

Two components bypassed this and hand-rolled their own helper:

- `components/admin/audit-logs-tab.tsx`
- `components/admin/contact-tab.tsx`

Both read `process.env.NEXT_PUBLIC_API_URL` directly, which is `/api`
on staging -- so every fetch resolved to `/api/admin/audit/events`
instead of `/admin/audit/events`. No nginx rule or backend route
matches that path; the page showed "Error: 404" in every sub-tab.

The bug predated Sprint 048 (the AuditLogsTab was written in Sprint
041) but surfaced during Sprint 048's v0.45.0 staging RC because it
was the first time the admin audit page got a deliberate walk-through
on staging. It had been shipping broken on staging for ~3 sprints
without anyone noticing.

## Decision

**Every frontend component that needs the backend API base URL
imports the same helper from `lib/api.ts`.** No component hand-rolls
`const API = process.env.NEXT_PUBLIC_API_URL || ''`.

Implementation steps (Sprint 049):

1. Export `API_BASE` (or a `resolveApiBase()` function) from
   `lib/api.ts` as a public const.
2. Delete the local `const API = ...` in AuditLogsTab, ContactTab,
   and any other component surfaced by
   `grep -rn 'process.env.NEXT_PUBLIC_API_URL' src/`.
3. Add a unit test asserting that `resolveApiBase()` returns `''`
   for `app.brickos.io`, `app.sovereignhealth.io`,
   `test-clinic.demo.brickos.io`, etc., and the env fallback for
   localhost.
4. Add a lint rule (eslint custom rule or grep-based CI check) that
   fails the build if any file outside `lib/api.ts` references
   `NEXT_PUBLIC_API_URL` directly.

For the duration of v0.45.0, the two offending components have
point-fix copies of the runtime logic inlined -- the Sprint 049
refactor deletes those copies and imports from the shared helper.

## Consequences

### Positive

- **One place to update when host rules change.** Today the list
  (`.brickos.io`, `.sovereignhealth.io`, `.onion`) is hand-copied
  into 3 places. Tomorrow when we add `brickos-health.de` or
  similar, it's one edit, not three.
- **No more silent 404s on staging.** The failure mode was
  invisible -- staging smoke tests didn't cover the admin audit
  page, so the double-prefix persisted sprint after sprint.
- **Easier to reason about SSR vs CSR.** The helper's
  `typeof window === 'undefined'` guard is subtle; keeping it in
  one file means fewer places for that guard to drift.

### Negative

- **Refactor has a blast radius of ~3 files.** Small; low risk.
- **Lint rule is a new moving part.** Custom eslint rules have
  maintenance cost; the grep-based CI check is simpler but less
  ergonomic.

### Neutral

- **This is catching up to convention rather than establishing one.**
  The `lib/api.ts` client is already the canonical path for 95%
  of API calls; the two admin-only offenders are outliers from
  earlier sprints.

## Alternatives considered

1. **Leave the hand-rolled copies and just fix each one as bugs
   surface.** Rejected -- already cost us a pre-prod RC iteration
   and months of latent brokenness. The shared helper is trivial to
   write.
2. **Delete the components and rewrite them on top of `api.ts`'s
   typed client.** Too large for a lesson; do it incrementally
   when each component changes for other reasons.
3. **Use a single build-time env var that encodes the full logic.**
   Can't -- Docker builds once and serves across staging/prod/
   org-domains that have different apexes. Runtime detection is
   the only workable choice.

## Related

- Sprint 048 RC fix commit `fc7235f`: point-fix for AuditLogsTab +
  ContactTab.
- ADR-050: multi-app URL prefix strategy (context for why
  `.brickos.io` and `.sovereignhealth.io` both need same-origin
  handling).
- ADR-052: effective-user swap via AuthenticatedUser (the
  refactored spec discovered this bug while setting up staging
  coverage).
