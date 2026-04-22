# Design 029 — Anonymous Eval Surface on `eval.sovereignhealth.io`

**Date:** 2026-04-22
**Status:** Draft v0.2 (revised after the staging/prod demo-host conflict was raised)
**Sprint:** target 049 (small scope) or 050
**Author:** Sovereign Brick founder + Claude

### Revision history

- **v0.1 (2026-04-22 morning):** first draft targeting `app.sovereignhealth.io` as the anonymous demo host.
- **v0.2 (2026-04-22 afternoon):** rescoped to dedicated `eval.sovereignhealth.io`. Staging/prod separation, unlocked prod smoke target.
- **v0.3 (2026-04-22 late afternoon):** product decisions locked (all 6 of §15). User-facing copy renamed "Eval" → "Demo Data" throughout. Analytics scoped to a single `signup_source` column per privacy policy (no behavioural tracking). Added §20 Demo Content Lifecycle covering how content updates propagate (automatic) or require a migration (new measured markers, profile tweaks).

---

## 1. Problem

Before Sprint 047, a visitor to `https://app.sovereignhealth.io/` without a login session saw a demo landing page with three risk-profile cards:

```
┌────────────────────────────────────────────────────────┐
│  Sovereign Health Intelligence                         │
│                                                        │
│  Try the app with demo data (read-only)                │
│                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Optimized  │  │   Average   │  │   At Risk   │    │
│  │   profile   │  │   profile   │  │   profile   │    │
│  │             │  │             │  │             │    │
│  │  healthy    │  │  typical    │  │  metabolic  │    │
│  │  baseline   │  │  adult      │  │  risk       │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                        │
│     [Sign up free]   [Log in]                          │
└────────────────────────────────────────────────────────┘
```

Sprint 047 (ADR + auth hardening) narrowed demo mode to the dedicated `demo.sovereignhealth.io` host and added an `<AuthGate>` component that redirects every unauth visit on every other host to `/login`. As a side-effect, the anonymous demo experience on `app.sovereignhealth.io` was removed.

**Impact:** visitors from marketing and ad traffic hitting `app.*` now see a bare login page instead of an interactive product demo. Conversion funnel lost its top of the funnel.

## 2. Goals

- Anonymous visitor on `eval.sovereignhealth.io/` and any `/sovereign-health/*` deep link **sees the eval surface**, with the 3-profile selector and live seed data.
- Interaction is **read-only**. No account state, no cookies set, no data mutation.
- `app.sovereignhealth.io` stays **fully locked down** to authenticated users -- no regression to Sprint 047's auth hardening.
- Org-scoped subdomains (`{slug}.sovereignhealth.io`) stay login-only.
- Restore the conversion funnel: every eval page has a visible **"Sign up free"** CTA pointing at `app.sovereignhealth.io/signup`.
- **Production smoke / regression testing target.** Playwright suites can point at `eval.sovereignhealth.io` after a prod deploy to assert render + navigation against real prod data without touching customer accounts.

## 3. Non-goals

- Making `app.sovereignhealth.io` demo-available. It's the authed-customer surface; stays login-only.
- Making `demo.sovereignhealth.io` public. That stays the staging-RC Basic-auth host.
- Changing org-subdomain behavior. Orgs are paying customers; their subdomains stay login-only.
- Demo write operations. If the eval user wants to save a measurement they can see in the eval surface -> sign up.
- Synthetic test data on `eval.*`. It uses the real production-seed users (`optimized@`, `average@`, `atrisk@sovereignhealth.io`) that already exist -- no new fixtures.

## 4. Current vs proposed behavior

### Current (post-Sprint-047)

```
                        ┌────────────────────┐
  Request /path  ─────▶ │  AuthGate          │
                        │  (unauth + ≠ demo) │
                        └─────────┬──────────┘
                                  │
          ┌───────────────────────┴─────────────────────────┐
          │                                                 │
          ▼                                                 ▼
  isDemoOnly = true                               isDemoOnly = false
  (demo.sovereignhealth.io, which                 (app.sovereignhealth.io)
   is ALSO used for staging RC --                         │
   conflated)                                             ▼
          │                                     redirect → /login
          ▼                                               │
  render demo mode                                        ▼
  with profile selector                         ← lost conversion funnel
```

### Proposed

```
                        ┌────────────────────┐
  Request /path  ─────▶ │  AuthGate          │
                        │                    │
                        └─────────┬──────────┘
                                  │
          ┌───────────────────────┴─────────────────────────┐
          │                                                 │
          ▼                                                 ▼
  unauth + isEvalHost                            unauth + ¬isEvalHost
  (eval.sovereignhealth.io)                      (app.sovereignhealth.io,
          │                                       {slug}.sovereignhealth.io,
          ▼                                       all *.brickos.io, ...)
  render eval mode                                         │
  with profile selector                                    ▼
  + "Sign up" CTA that cross-planes              redirect → /login
  to app.sovereignhealth.io/signup                         │
          │                                                 ▼
          ▼                                        /auth/* API
     /demo/* API                                   (login flow)
     (read-only)
```

Key shift from v0.1: the "demo-available" concept now lives on its own subdomain (`eval.sovereignhealth.io`), not on the authed app host. This means:

- `app.sovereignhealth.io` goes back to being fully locked. No special case for unauth.
- `eval.sovereignhealth.io` is a new DNS + nginx server block serving the same Next.js frontend bundle but with `isEval = true` at runtime -> AuthGate skipped, demo UI rendered.
- `demo.sovereignhealth.io` is unambiguously the staging Basic-auth host. Nothing else.

## 5. Host × auth state matrix

After this change:

```
┌─────────────────────────────────┬──────────────┬─────────────────┐
│ Hostname                        │ Unauth       │ Authed          │
├─────────────────────────────────┼──────────────┼─────────────────┤
│ eval.sovereignhealth.io  (NEW)  │ EVAL mode    │ (n/a, no cookie)│
│ app.sovereignhealth.io          │ /login       │ user's own data │
│ sovereignhealth.io              │ marketing    │ redirect to app │
│ www.sovereignhealth.io          │ marketing    │ redirect to app │
│ {slug}.sovereignhealth.io       │ /login       │ user's org data │
│ app.brickos.io                  │ /login       │ platform admin  │
│ demo.brickos.io (staging)       │ Basic auth   │ staging admin   │
│ demo.sovereignhealth.io         │ Basic auth   │ staging RC      │
│ {slug}.brickos.io               │ /login       │ org admin       │
│ test-clinic.demo.brickos.io     │ Basic auth   │ staging org adm │
└─────────────────────────────────┴──────────────┴─────────────────┘
```

**Only `eval.sovereignhealth.io` is eval-capable.**  Everything else requires auth (or Basic-auth for staging). Clean, unambiguous boundaries.

### Environment separation at a glance

```
            ┌────────────────────────────────────────────────┐
            │              PRODUCTION (public)               │
            │                                                │
            │  sovereignhealth.io   → marketing              │
            │  app.sovereignhealth.io → authed customer app  │
            │  {slug}.sovereignhealth.io → paying org app    │
            │  eval.sovereignhealth.io → anonymous eval / 3  │
            │                             risk profiles      │
            └────────────────────────────────────────────────┘
            ┌────────────────────────────────────────────────┐
            │           STAGING (Basic-auth gated)           │
            │                                                │
            │  demo.sovereignhealth.io → staging RC (was     │
            │                            conflated w/ demo;  │
            │                            no longer)          │
            │  demo.brickos.io → staging platform admin      │
            │  {slug}.demo.brickos.io → staging org admin    │
            │  {slug}.demo.sovereignhealth.io → staging org  │
            │                                    end-user    │
            └────────────────────────────────────────────────┘
```

## 6. Data model (no new tables)

Demo users already exist in production:

```
┌──────────────────────────────────┬────────┬────────────┬──────────────┐
│ Email                            │ Tier   │ Override   │ Last Active  │
├──────────────────────────────────┼────────┼────────────┼──────────────┤
│ optimized@sovereignhealth.io     │ clarity│ override   │ 2026-04-22   │
│ average@sovereignhealth.io       │ glimpse│ —          │ never        │
│ atrisk@sovereignhealth.io        │ glimpse│ —          │ never        │
└──────────────────────────────────┴────────┴────────────┴──────────────┘
```

Each has a 90+ day measurement history seeded via `20240401000001_bootstrap_demo_users.sql`. The frontend's `/demo/*` endpoints select data by the `profile` query-string ("optimized" | "average" | "at_risk") which maps to the user ID server-side.

**Security risk to resolve:** these users currently have argon2 password hashes in the DB. Anyone with the password could log in and see (or modify) the seed data. The "Last Active 2026-04-22" on optimized above suggests someone has been logging in as them. Action item below.

## 7. Frontend changes

### 7.1 New concept: `isEvalHost`, replaces `isDemoOnly`

Today the `isDemoOnly` flag does double duty (and was the source of the Sprint 047 leak):
- "This host has no real auth" (blocks settings, account page)
- "Show demo to unauth"

With the dedicated eval host, we can simplify: `isEvalHost` is true iff the hostname is `eval.sovereignhealth.io`. `isDemoOnly` becomes unused and can be removed (or kept as a dead alias for one sprint to ease deletion).

```ts
// lib/config.ts
export const EVAL_HOST = 'eval.sovereignhealth.io'
```

```ts
// lib/auth-context.tsx
const [isEvalHost] = useState(() =>
  typeof window !== 'undefined' ? window.location.hostname === EVAL_HOST : false
)

// `isDemo` still the right name for "we're rendering demo UX right now."
// On eval host, unauth visitors are always in demo mode. Authed visitors
// never reach here (eval doesn't set auth cookie).
const isDemo = !loading && isEvalHost
```

Note: no separate unauth check needed because the eval host never sets an auth cookie (see §8.4 below). If a user somehow arrives on eval with a cookie from app.sovereignhealth.io (sibling `.sovereignhealth.io` domain), we explicitly ignore it on eval -- see §11.

### 7.2 AuthGate: skip on eval host

```ts
// components/auth-gate.tsx
useEffect(() => {
  if (loading) return
  if (isEvalHost) return      // NEW: eval is always public
  if (user) return
  if (isPublicPath(path)) return
  router.replace(`/login?return=${encodeURIComponent(path)}`)
}, [loading, user, isEvalHost, pathname, router])
```

### 7.3 Persistent "Sign up free" CTA (cross-plane link)

New component `<EvalConversionBanner>` rendered in root layout when `isDemo`. The Sign up button crosses from eval.* to app.* since the new user needs to sign up on the real app, not on eval:

```
┌────────────────────────────────────────────────────────────┐
│  👁  Demo Data -- sign up free to save your own            │
│     measurements.  [Sign up ↗]  [Log in ↗]                 │
│                                                            │
│  ↗ = cross-plane link to app.sovereignhealth.io/{signup|  │
│       login}                                               │
└────────────────────────────────────────────────────────────┘
```

- Position: bottom-fixed, slim
- Dismissible: yes (session-storage flag)
- Re-appears on next session (not per-visit)
- Click [Sign up ↗] → `https://app.sovereignhealth.io/signup?from=demo-{profile}` — registration captures the profile of origin (single attribute on the new user row). No session tracking, no browsing-behavior events.

### 7.3.1 Terminology convention (user-facing vs engineering)

Internal engineering terms stay `eval`: the hostname is `eval.sovereignhealth.io`, the runtime flag is `isEvalHost`, the component class is `EvalConversionBanner`. All **user-facing copy** says "Demo Data" or "Evaluation Data." The URL layer matches the engineer layer; the product layer is distinct.

i18n keys (defined in `messages/{en,de}.json` under `demoSurface`):

| Key | EN | DE |
|---|---|---|
| `demoSurface.banner.title` | Demo Data | Demodaten |
| `demoSurface.banner.subtitle` | Sign up free to save your own measurements. | Kostenlos registrieren, um eigene Messungen zu speichern. |
| `demoSurface.banner.signUp` | Sign up ↗ | Registrieren ↗ |
| `demoSurface.banner.login` | Log in ↗ | Anmelden ↗ |
| `demoSurface.badge` | Demo Data | Demodaten |
| `demoSurface.landing.heading` | Try Sovereign Health Intelligence | Testen Sie Sovereign Health Intelligence |
| `demoSurface.landing.subheading` | Pick a profile to explore real data. | Wählen Sie ein Profil, um echte Daten zu erkunden. |
| `demoSurface.landing.loginLink` | Already have an account? Log in ↗ | Schon registriert? Anmelden ↗ |

### 7.4 UI guard audit

Every write CTA already wrapped in `!isDemo`. Verify the following components still correctly gate on the new `isDemo` semantics (`isDemo` = `isEvalHost` now):

- `/sovereign-health/dashboard` → "Add measurement" button hidden ✓
- `/sovereign-health/doctor-chat` → already redirects to sign-up on demo ✓ (existing logic)
- `/sovereign-health/measurements/new` → on eval: render sign-up prompt instead of form
- `/settings` → on eval: redirect to `/sovereign-health/dashboard` (no settings to configure)
- `/sovereign-health/markers/{slug}` → hide personal-threshold editor
- `/sovereign-health/trends` → hide filter save
- `/sovereign-health/practitioner` → 404 / redirect on eval (practitioner workbench makes no sense for anonymous)
- `/platform/*` → 404 / redirect on eval (admin surfaces make no sense for anonymous)
- Nav dropdown → hide "Logout" / "Settings" / "Account" on eval; replace with "Sign up ↗" and "Log in ↗"

### 7.5 Cross-plane link convention

`eval.sovereignhealth.io` is a new "plane" for `swapPlaneHost()`. Since it has no admin counterpart and no org-specific counterpart, it's listed as a single-plane host (same pattern as the Sprint 048 RC fix for `demo.brickos.io` / `demo.sovereignhealth.io`):

```ts
// lib/plane.ts, swapPlaneHost()
if (host === 'eval.sovereignhealth.io') return null
```

For eval -> signup, don't use the swap function; hardcode the target (`https://app.sovereignhealth.io/signup`) in the banner component. This matches the marketing-site pattern (→ app.*).

## 8. Backend / infra changes

### 8.1 New DNS + nginx + TLS for `eval.sovereignhealth.io`

1. **DNS:** A/CNAME record for `eval.sovereignhealth.io` pointing at the production edge (same Cloudflare origin as `app.sovereignhealth.io`).
2. **TLS:** Covered by Cloudflare Universal SSL (`*.sovereignhealth.io` wildcard). No manual cert work.
3. **nginx server block:** add a new `server { server_name eval.sovereignhealth.io; ... }` in `apps/health/sovereign-health/ops/nginx-sovereignhealth.conf`. Same body as the `app.sovereignhealth.io` block (proxies `/demo/*`, `/api/*`, `/auth/*`, static, etc.), but:
   - NO Basic auth (public)
   - Rate-limit `/demo/*` at 60/min/IP (see §8.3)
4. Deploy script (`ops/deploy.sh`) already syncs the nginx config, so adding the server block is a one-file edit + deploy.

### 8.2 Verify existing `/demo/*` endpoints

Endpoints already registered (see `handlers/demo.rs`):

```
GET  /demo/zones?profile=<slug>
GET  /demo/measurements?profile=<slug>&per_page=<n>
GET  /demo/markers?profile=<slug>
GET  /demo/trends?marker=<slug>&profile=<slug>
GET  /demo/profile?profile=<slug>
```

Nginx allow-list regex already includes `demo`. Same bundle serves eval.*, app.*, and {slug}.*, so no new backend endpoints required.

### 8.3 Rate-limit `/demo/*` per IP

Add a governor rule scoped to `/demo/*`:

```rust
// actix governor, 60 requests / 60 seconds per IP
.wrap(Governor::new(
    &GovernorConfigBuilder::default()
        .per_second(1)
        .burst_size(60)
        .finish()
        .unwrap(),
))
```

Prevents scraping abuse. Legitimate demo browsing is well under 60 req/min.

### 8.4 Eval never sets an auth cookie

The frontend currently sets `auth_token` as a `SameSite=Lax` cookie on the parent domain (`.sovereignhealth.io`). This means a cookie set on `app.sovereignhealth.io` is sent to every `*.sovereignhealth.io` request, including `eval.*`.

Two safeguards:

1. On eval host, the frontend explicitly ignores any `auth_token` cookie and does not include `Authorization` headers on API calls. `isEval` short-circuits the `api.ts` token attach:
   ```ts
   const token = (typeof window !== 'undefined' && window.location.hostname === EVAL_HOST)
     ? undefined
     : getToken()
   ```
2. Backend `/demo/*` handlers MUST NOT return cookie-setting headers or trigger any session writes. Unit-test this in tests/integration.rs.

Why safeguards: we don't want to "accidentally log in" an authed user on eval and let them modify state. Eval is strictly read-only, regardless of cookie state.

### 8.5 Lock the seed user passwords

```sql
-- One-time migration, runs once to lock the 3 demo accounts.
UPDATE users
   SET password_hash = '$argon2id$v=19$m=65536,t=3,p=4$LOCKED$LOCKED'
 WHERE email IN (
     'optimized@sovereignhealth.io',
     'average@sovereignhealth.io',
     'atrisk@sovereignhealth.io'
 );
```

Argon2 will never verify against `$LOCKED` so login is impossible. Their data remains readable via `/demo/*` endpoints (which don't check user auth).

### 8.6 "No writes under `/demo/*`" unit test

Add to `tests/integration.rs`:

```rust
#[actix_web::test]
async fn demo_namespace_has_no_write_handlers() {
    let app = build_test_app().await;
    // Enumerate every registered route under /demo/*, assert method
    // is GET or HEAD.
    // (Actix doesn't expose route table easily -- may need to keep a
    //  manual allowlist in a const and assert handlers match.)
}
```

Prevents a future sprint from accidentally adding `POST /demo/something` that bypasses auth.

## 9. User flow

```
┌────────────────────────────────────────────────────────────┐
│  Marketing site        sovereignhealth.io                  │
│  (ad, blog, landing)   www.sovereignhealth.io              │
└────────────────────────┬───────────────────────────────────┘
                         │  [Try it free]  → eval.sovereignhealth.io
                         ▼
┌────────────────────────────────────────────────────────────┐
│  eval.sovereignhealth.io/                                   │
│                                                              │
│  Try Sovereign Health Intelligence with demo data:          │
│                                                              │
│  [ Optimized ]  [ Average ]  [ At Risk ]                   │
│                                                              │
│  (after click, goes to /sovereign-health/dashboard)         │
└────────────────────────┬───────────────────────────────────┘
                         │  User clicks Optimized
                         ▼
┌────────────────────────────────────────────────────────────┐
│  eval.sovereignhealth.io/sovereign-health/dashboard         │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Profile: Optimized ▾  (switches dataset)           │    │
│  │                                                    │    │
│  │ Zone cards, markers, trends, all from              │    │
│  │ optimized@sovereignhealth.io's seeded history      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫          │
│  👁 Demo Data. [Sign up ↗] [Log in ↗] (↗ → app.*)         │
│  ▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫          │
└────────────────────────┬───────────────────────────────────┘
                         │  User clicks [Sign up ↗]
                         │  → cross-plane jump to app.*
                         ▼
┌────────────────────────────────────────────────────────────┐
│  app.sovereignhealth.io/signup?from=demo-optimized          │
│  email, password, display name, accept ToS                  │
└────────────────────────┬───────────────────────────────────┘
                         │  Verify email
                         ▼
┌────────────────────────────────────────────────────────────┐
│  app.sovereignhealth.io/sovereign-health/dashboard          │
│  (AUTHED, user's own data)                                  │
│  Welcome banner: "Sovereign Health Intelligence"            │
│  No measurements yet → "Record your first" empty state      │
└────────────────────────────────────────────────────────────┘
```

## 10. Component architecture

```
  <html>
  └─ <body>
     └─ <Providers>
        ├─ <AuthContextProvider>          ← isEvalHost, isDemo flags
        ├─ <OrgContextProvider>           ← no-ops on eval (skip fetch)
        ├─ <DemoProfileProvider>          ← which of 3 profiles selected
        ├─ <SyncProvider>                  ← no-ops on eval (no cookie)
        ├─ <OfflineBanner>
        ├─ <RefreshBanner>
        ├─ <ImpersonationBanner>           ← no-ops on eval
        ├─ <EvalConversionBanner>    ← NEW, renders when isDemo=true
        ├─ <AuthGate>                ← skips on isEvalHost
        └─ {children} (dashboard, markers, etc.)
                - components check `isDemo` to hide write UIs
                - api calls route to /demo/* when isDemo
                - api.ts never sends auth_token from eval host
```

## 11. Security analysis

| Threat | Mitigation |
|---|---|
| Unauth user mutates data | No `/demo/*` POST/PUT/DELETE handlers; unit test enforces. Frontend never sends auth token on `/demo/*`. |
| Scraping seed data | Governor rate limit 60/min per IP on `/demo/*`. |
| Credential stuffing against demo users | Password hash set to `$LOCKED` (argon2 never verifies). Documented one-time migration. |
| Session fixation via demo | Demo never sets `auth_token` cookie. Verified by Playwright assertion. |
| XSS in seed data bleed into real users | Seed data is controlled/curated by us in the bootstrap migration. Standard XSS protections (React escaping) still apply. |
| SEO: demo pages indexed as "real" app | Add `<meta name="robots" content="noindex">` on demo mode (`isDemo === true`). Google sees the app but not demo-specific URLs. |
| Abuse: using demo to probe backend for vulns | Governor rate limit + (optional) Cloudflare bot-fight mode on `/demo/*`. |

## 12. Testing

### Automated

```
e2e/anonymous-demo.spec.ts  (NEW, ~8 specs)
  ✓ unauth visit to app.sovereignhealth.io/ renders demo dashboard
  ✓ profile selector shows 3 cards
  ✓ clicking Optimized loads optimized data
  ✓ switching to Average changes the dataset
  ✓ "Add measurement" CTA is not rendered in demo mode
  ✓ /sovereign-health/markers/iron deep link works anonymously
  ✓ Sign up link goes to /signup
  ✓ No auth_token cookie set during browsing

lib/auth-context.test.ts  (additions)
  ✓ demoAvailable true on app.sovereignhealth.io
  ✓ demoAvailable false on test-clinic.sovereignhealth.io
  ✓ isDemo true when demoAvailable && user=null
  ✓ isDemo false when user=authed (even on demo-available host)

tests/integration.rs  (additions)
  ✓ /demo/* namespace has no write handlers (enforced)
  ✓ /demo/zones?profile=optimized returns 200 without auth
  ✓ /demo/measurements rate-limits at 60/min
```

### Manual RC

```
┌─────┬─────────────────────────────────────────────────────┬────────┐
│ #   │ Action                                              │ Expected│
├─────┼─────────────────────────────────────────────────────┼────────┤
│ 1   │ Incognito → https://app.sovereignhealth.io/         │ 3-card │
│     │                                                     │ demo   │
│ 2   │ Click Optimized                                     │ dash   │
│     │                                                     │ loads  │
│ 3   │ Switch profile to At Risk                           │ data   │
│     │                                                     │ changes│
│ 4   │ Click "Add measurement" (should not exist)          │ hidden │
│ 5   │ Conversion banner visible, dismiss it               │ hides  │
│ 6   │ Click [Sign up], complete signup                    │ authed │
│     │                                                     │ dash   │
│ 7   │ Log out                                             │ demo   │
│     │                                                     │ returns│
│ 8   │ Deep link /sovereign-health/markers/iron unauthed  │ loads  │
└─────┴─────────────────────────────────────────────────────┴────────┘
```

## 13. Rollout plan

### Phase 1 — ship the feature (Sprint 049 Phase A, ~1 day)

```
┌───────────────────────────────────────────────────────────┐
│ 1. DNS: add eval.sovereignhealth.io A-record              │
│ 2. Cloudflare: ensure Universal SSL wildcard covers eval  │
│ 3. nginx: new server block in nginx-sovereignhealth.conf  │
│ 4. Add EVAL_HOST + isEvalHost in config.ts / auth-context │
│ 5. Update AuthGate to skip on isEvalHost                  │
│ 6. Add <EvalConversionBanner> with cross-plane signup link│
│ 7. Audit UI write-CTA guards                               │
│ 8. api.ts: no auth_token on eval host                     │
│ 9. Add Playwright spec eval-surface.spec.ts               │
│10. Deploy to staging (no effect -- eval.* only exists in  │
│    prod DNS -- verify no regression on staging tests)     │
│11. Promote → prod                                          │
│12. Manual RC on eval.sovereignhealth.io (incognito)       │
└───────────────────────────────────────────────────────────┘
```

### Phase 2 — harden (Sprint 049 Phase B, ~0.5 day)

```
┌───────────────────────────────────────────────────────────┐
│ 1. Governor rate limit on /demo/*                          │
│ 2. Migration: lock demo user password_hash = '$LOCKED'    │
│ 3. Backend integration test: /demo/* has no writes         │
│ 4. <meta robots="noindex"> in demo mode                   │
│ 5. Backend integration test: eval never receives cookies  │
│ 6. Deploy → prod                                           │
└───────────────────────────────────────────────────────────┘
```

### Phase 3 — production smoke (Sprint 050, ~0.5 day)

```
┌───────────────────────────────────────────────────────────┐
│ 1. Playwright suite eval-smoke.spec.ts:                   │
│    - dashboard loads for all 3 profiles                   │
│    - profile switcher changes data                        │
│    - marker detail page renders                           │
│    - trend chart renders                                  │
│ 2. Run after every prod deploy in deploy.sh verify()      │
│ 3. If any spec fails, page oncall                         │
└───────────────────────────────────────────────────────────┘
```

### Phase 4 — signup-source attribute (Sprint 049 Phase D, ~0.25 day)

```
┌───────────────────────────────────────────────────────────┐
│ 1. Migration: ADD COLUMN users.signup_source text          │
│ 2. Signup handler reads ?from=demo-{profile} and stores   │
│    it; null if absent                                      │
│ 3. Platform admin /platform/users: add column "Signup     │
│    source" (hidden default, shown in details drawer)      │
│ 4. No cron, no event log, no third-party analytics        │
└───────────────────────────────────────────────────────────┘
```

Only per-registration attribute. No browsing-behavior tracking of any kind.

### Phase 5 — infra hardening (deferred, optional)

```
┌───────────────────────────────────────────────────────────┐
│ 1. Cloudflare bot-fight rule on eval.sovereignhealth.io  │
│    /demo/*                                                 │
│ 2. robots.txt + <meta noindex> for /sovereign-health/*    │
│    on eval host (landing / stays indexable)               │
└───────────────────────────────────────────────────────────┘
```

## 14. Effort estimate

```
Phase 1 (feature lives):       1.0 day   (Sprint 049 Phase A)
Phase 2 (security hardening):  0.5 day   (Sprint 049 Phase B)
Phase 3 (prod smoke):          0.5 day   (Sprint 049 Phase C)
Phase 4 (signup_source attr):  0.25 day  (Sprint 049 Phase D)
Phase 5 (infra hardening):     0.25 day  (Sprint 050 or later)
──────────────────────────────────────
Sprint 049 scope (P1+P2+P3+P4): 2.25 days
Total (all phases):             2.5 days
```

## 15. Resolved product decisions (locked 2026-04-22)

All six questions resolved:

1. ~~**Keep or sunset `demo.sovereignhealth.io`?**~~ **Resolved v0.2.** `demo.*` stays staging RC host. Prod anonymous demo lives at `eval.sovereignhealth.io`.
2. **Default landing:** **Option A** -- always show the 3-card picker first (marketing hook).
3. **Robots policy:** **Option B** -- index the landing (`/`), `noindex` on deep paths (`/sovereign-health/*`).
4. **Analytics / tracking:** per product privacy policy, **no behavioural tracking**. One exception: when a visitor clicks [Sign up ↗] and completes registration, the resulting `users` row records `signup_source = 'demo-{profile}'` as a single attribute. No session cookies, no page-view events, no IP/UA logging for demo visitors. Phase 4 reduced to that single registration-metadata field.
5. **Demo-to-signup carryover:** **No.** Users want their own data; sample data would confuse. New accounts start with a clean empty state and "Record your first measurement."
6. **Prod smoke cadence:** **Option A + C combined** -- every prod deploy auto-runs `eval-smoke.spec.ts` in `deploy.sh verify()`; a 3am cron runs the same suite nightly to catch drift between deploys.

### Data model impact of decision 4

Add one column in a Sprint 049 migration:

```sql
ALTER TABLE users
  ADD COLUMN signup_source text;
COMMENT ON COLUMN users.signup_source IS
  'Origin of registration: demo-optimized | demo-average | demo-at_risk | NULL';
```

At signup, if the URL carries `?from=demo-{profile}`, store it. Never logged elsewhere, never exposed to other users, purely for founder analytics of conversion rates per profile.

## 16. Risks and rollback

```
┌─────────────────────────────────────┬──────────────────────┐
│ Risk                                 │ Rollback             │
├─────────────────────────────────────┼──────────────────────┤
│ /demo/* endpoint breaks             │ Revert frontend flag; │
│ (returns 500, demo users deleted)   │ demo just stays       │
│                                     │ unreachable, AuthGate │
│                                     │ kicks to /login as    │
│                                     │ today.                │
├─────────────────────────────────────┼──────────────────────┤
│ Scraping traffic DOS the governor   │ Tighten limit; add CF │
│                                     │ bot rule. If severe,  │
│                                     │ revert AuthGate skip  │
│                                     │ (1-line revert).      │
├─────────────────────────────────────┼──────────────────────┤
│ Unintended write on /demo/*          │ Hotfix: remove the    │
│                                     │ handler; unit test    │
│                                     │ would have prevented  │
│                                     │ but defense in depth. │
├─────────────────────────────────────┼──────────────────────┤
│ SEO indexes transient demo content   │ Add <meta noindex>    │
│                                     │ in deploy; Google     │
│                                     │ de-indexes within ~2w.│
└─────────────────────────────────────┴──────────────────────┘
```

All risks are reversible with a single-file frontend change (flip `demoAvailable` to false). No schema changes (other than the optional password lock which is trivially reversible).

## 17. Decision log

- **2026-04-22 morning:** Draft v0.1 created after product request to restore anonymous demo on `app.sovereignhealth.io`.
- **2026-04-22 afternoon:** Product review flagged the demo.* dual-use conflict. Rescoped to v0.2 on dedicated `eval.sovereignhealth.io`. Side-effect: unlocks prod smoke testing target.
- **2026-04-22 late afternoon:** v0.3 finalised -- all §15 decisions locked, user-facing copy finalised ("Demo Data"), privacy-aligned analytics (single `signup_source` attribute), demo content lifecycle documented in §20.
- **Status:** spec is shovel-ready for Sprint 049.

## 18. Related

- Sprint 047 retro: `feedback_cookie_strategy_before_multidomain.md`, ADR-050 multi-app URL prefix
- ADR-052: effective-user swap (not directly related, but same middleware stack)
- ADR-053: shared API URL helper (eval endpoints use the shared helper)
- Design 027: multi-app URL routing (context for `/sovereign-health/*` prefix)
- `feedback_demo_hosts_single_plane.md`: precedent for treating special hosts as single-plane in `swapPlaneHost()` (eval.* follows the same pattern)

## 19. Production smoke testing via eval (new in v0.2)

### Motivation

The eval surface renders the full SHI app against real, curated production data (the 3 risk-profile users in `users` table). It's the only prod surface that:

- is reachable unauthed (no cookie management in CI)
- exercises every read path the real app uses (dashboard, zones, markers, trends)
- never mutates state (safe to hit repeatedly)
- uses real nginx, real backend, real DB, real data -- not a mocked / staged approximation

This makes eval the ideal target for:

1. **Post-deploy smoke** -- automatically after every prod deploy, assert the pages render without error.
2. **Nightly regression** -- catch third-party dependency regressions (CDN, DNS, certificate, Anthropic API for Doctor Chat probes, etc.).
3. **Visual diff** -- snapshot comparison (Percy / Chromatic / custom) against known-good pixels.
4. **Performance baseline** -- Lighthouse / k6 against the 3 profiles for a stable comparison between releases.

### Proposed test suite

```
e2e/eval-smoke.spec.ts  (new Sprint 050 Phase 3)
  ✓ GET https://eval.sovereignhealth.io/ returns 200 and shows 3 cards
  ✓ Navigating to ?profile=optimized loads dashboard with non-zero zones
  ✓ Navigating to ?profile=average loads dashboard with different zone state
  ✓ Navigating to ?profile=at_risk loads dashboard with at least one red marker
  ✓ Marker detail /sovereign-health/markers/iron renders history chart
  ✓ Trends page /sovereign-health/trends renders at least one series
  ✓ Zone detail /sovereign-health/zones/energy_metabolic renders marker list
  ✓ DoctorChat page shows the "sign up to use" state (not the chat)
  ✓ Conversion banner visible and points at app.sovereignhealth.io/signup
  ✓ No auth_token cookie set after full navigation cycle
```

### Integration with deploy.sh

After the existing `verify()` step, add:

```bash
eval_smoke() {
  cd "$APP_ROOT/frontend"
  E2E_BASE_URL=https://eval.sovereignhealth.io \
    pnpm exec playwright test eval-smoke.spec.ts --reporter=list
  if [ $? -ne 0 ]; then
    notify "eval smoke FAILED after prod deploy" \
      "See trace + rollback candidate" 5 "critical" "deploy,eval"
    return 1
  fi
}
```

Runs non-blocking (deploy still considered successful if `eval_smoke` fails; but an ntfy alert fires). Upgrade to blocking once we trust the suite stability.

### Nightly cron

```
0 3 * * *   bash /home/runner/brickos/ops/eval-smoke-cron.sh
```

Runs the same suite once a day, posts result to the ops channel. Catches drift that isn't tied to our deploys (certificate renewal, cloud IP changes, third-party APIs).

### Why this is better than staging smoke

```
┌────────────────────────────────────┬─────────────────────┬──────────────┐
│                                    │  Staging smoke      │  Eval smoke  │
├────────────────────────────────────┼─────────────────────┼──────────────┤
│ Real prod backend                  │  No (staging API)   │  Yes         │
│ Real prod DB                       │  No                 │  Yes         │
│ Real prod TLS cert                 │  No (staging cert)  │  Yes         │
│ Real prod Cloudflare / CDN path    │  No                 │  Yes         │
│ Real prod nginx config applied     │  Yes                │  Yes         │
│ Safe to run repeatedly             │  Yes                │  Yes         │
│ Catches cert expiry / DNS issues   │  No                 │  Yes         │
│ Catches prod DB seed drift         │  No                 │  Yes         │
│ Catches third-party API regressions│  Partially          │  Yes         │
│ Zero PII / customer impact         │  Yes                │  Yes         │
└────────────────────────────────────┴─────────────────────┴──────────────┘
```

Keep staging smoke for pre-promote verification. Add eval smoke for post-deploy-in-prod verification. They complement, don't replace.

---

## 20. Demo content lifecycle (content update path)

The three demo users (`optimized@ / average@ / atrisk@sovereignhealth.io`) are real rows in the prod `users` table. Their measurements, markers, and calculated markers need to stay in sync with whatever the real app supports. This section defines **how we update demo content** when the app evolves.

### 20.1 What propagates automatically (zero-effort)

```
┌──────────────────────────────────┬──────────────────────────────────┐
│  What changed                    │  Demo impact                     │
├──────────────────────────────────┼──────────────────────────────────┤
│  New calculated marker added     │  Auto-appears on eval dashboard  │
│  (e.g. GKI, WHtR, APOB ratio)    │  if the input measurements exist │
│  Marker threshold change         │  Auto-applies (zone colours      │
│                                  │  re-compute)                     │
│  Zone rearrangement / rename     │  Auto-reflected (zone metadata   │
│                                  │  is shared)                      │
│  UI changes (chart types,        │  Auto (eval uses the same        │
│  copy, translations)             │  frontend bundle)                │
│  API response shape changes      │  Auto (eval calls same /demo/*)  │
└──────────────────────────────────┴──────────────────────────────────┘
```

**Takeaway:** if the new feature is purely a read-path over existing data, the eval surface picks it up for free. Test by hitting `eval.sovereignhealth.io/sovereign-health/{whatever}` after the deploy.

### 20.2 What requires an explicit content migration

```
┌──────────────────────────────────┬──────────────────────────────────┐
│  What changed                    │  Demo action required            │
├──────────────────────────────────┼──────────────────────────────────┤
│  New MEASURED marker (e.g. ApoB) │  Seed 90-day measurement history │
│                                  │  for each of the 3 demo users    │
│  Profile semantics tweak (e.g.   │  UPDATE or DELETE+INSERT on the  │
│  "Optimized" should have better  │  relevant measurement rows       │
│  glucose trend)                  │                                  │
│  New profile (e.g. "Athlete")    │  Add a 4th demo user +           │
│                                  │  measurement history             │
│  Dropping a profile              │  DELETE user + measurements +    │
│                                  │  update frontend profile list    │
└──────────────────────────────────┴──────────────────────────────────┘
```

All four require a migration. Convention: **one migration per demo-content change**, in the normal `api/migrations/` directory, named:

```
YYYYMMDDHHMMSS_demo_<verb>_<what>.sql

examples:
  20260601120000_demo_add_apob_measurements.sql
  20260615090000_demo_tune_optimized_glucose.sql
  20260701153000_demo_add_athlete_profile.sql
```

### 20.3 Migration template for "add measurements for a new marker"

```sql
-- YYYYMMDDHHMMSS_demo_add_<marker>_measurements.sql
--
-- Backfills the 3 demo users with 90 days of <marker> measurements
-- so the new marker appears on eval.sovereignhealth.io zones.
--
-- Idempotent: skips if rows already exist (new marker + demo user pair).

DO $$
DECLARE
    marker_uuid UUID;
    optimized_id UUID;
    average_id UUID;
    at_risk_id UUID;
BEGIN
    SELECT id INTO marker_uuid FROM markers WHERE slug = '<marker-slug>';
    SELECT id INTO optimized_id FROM users WHERE email = 'optimized@sovereignhealth.io';
    SELECT id INTO average_id   FROM users WHERE email = 'average@sovereignhealth.io';
    SELECT id INTO at_risk_id   FROM users WHERE email = 'atrisk@sovereignhealth.io';

    IF marker_uuid IS NULL OR optimized_id IS NULL THEN
        RAISE NOTICE 'marker or demo users missing; skipping';
        RETURN;
    END IF;

    -- Skip if already seeded
    IF EXISTS (SELECT 1 FROM measurements WHERE marker_id = marker_uuid
               AND user_id IN (optimized_id, average_id, at_risk_id)) THEN
        RAISE NOTICE 'already seeded';
        RETURN;
    END IF;

    -- Generate 90 days of measurements for each profile using the profile's
    -- expected range. For OPTIMIZED: tight healthy range.
    INSERT INTO measurements (id, user_id, marker_id, timestamp,
                              value_canonical, unit_canonical)
    SELECT gen_random_uuid(), optimized_id, marker_uuid,
           NOW() - (d || ' days')::interval,
           -- healthy value range for this marker
           round(<optimized_mean>::numeric + (random() - 0.5) * <jitter>, 2)::text,
           '<canonical_unit>'
      FROM generate_series(1, 90) d;
    -- ... repeat for average_id (wider range) and at_risk_id (skewed) ...
END$$;
```

### 20.4 Review gate for demo-content migrations

Every `demo_*.sql` migration gets reviewed for:

1. **Realism**: values match the profile semantics (optimized is healthy, at-risk shows risk signals). Product + medical advisor sign-off.
2. **Idempotency**: re-running the migration produces no duplicates.
3. **Reversibility**: every INSERT has a documented DELETE that could roll it back if the data turns out wrong.
4. **Scope**: only touches the 3 demo users (identified by email). Cannot accidentally modify real user data.

### 20.5 Quick content-update workflow (engineer POV)

```
┌──────────────────────────────────────────────────────────────┐
│  1. New marker/feature lands in a sprint                     │
│  2. Check §20.1 table -- if propagates automatically,        │
│     verify via eval.sovereignhealth.io, done                 │
│  3. If needs new data:                                       │
│     - Write migration per §20.3 template                     │
│     - Run locally: docker exec ... psql < migration.sql     │
│     - Run eval-smoke.spec.ts locally against localhost       │
│     - PR review includes product sign-off on realism         │
│  4. Deploy -- migration runs automatically in prod           │
│  5. Post-deploy: eval-smoke runs, pages oncall if red       │
│  6. Manual eyeball: visit eval.sovereignhealth.io, confirm   │
│     the new marker/feature shows the expected profile data   │
└──────────────────────────────────────────────────────────────┘
```

### 20.6 Content-refresh cron (future consideration)

Over time, demo data ages (every measurement is dated). To keep the demo feeling "current," we could run a monthly script that UPDATEs every demo measurement's `timestamp` forward by one month. Deferred -- not urgent, filed as a Sprint 05x candidate.

## Appendix A — Profile card visual (eval.sovereignhealth.io/)

```
┌──────────────────────────────────────────────────────────────┐
│  eval.sovereignhealth.io                                    │
│                                                              │
│   Try Sovereign Health Intelligence                          │
│   Pick a profile to explore with real-looking data          │
│                                                              │
│   ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐│
│   │  OPTIMIZED  ✓   │  │   AVERAGE       │  │   AT RISK ⚠  ││
│   │                 │  │                 │  │              ││
│   │  Healthy        │  │  Typical        │  │  Metabolic   ││
│   │  baseline       │  │  adult          │  │  risk        ││
│   │                 │  │                 │  │              ││
│   │  All markers    │  │  Most markers   │  │  3 markers   ││
│   │  in green       │  │  in green,      │  │  in red,     ││
│   │                 │  │  some orange    │  │  rest orange ││
│   │                 │  │                 │  │              ││
│   │  [Explore →]    │  │  [Explore →]    │  │  [Explore →] ││
│   └─────────────────┘  └─────────────────┘  └──────────────┘│
│                                                              │
│   Already have an account?  [Log in ↗] (→ app.*)            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Appendix B — Dashboard in eval mode (profile: Optimized)

```
┌──────────────────────────────────────────────────────────────┐
│  eval.sovereignhealth.io/sovereign-health/dashboard          │
│  Sov. Health  |  Overview · DoctorChat · Trends · ...        │
│                      [DEMO DATA · Optimized ▾]   [Sign up ↗]│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Your health zones                                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Energy &     │ │ Cognitive    │ │ Cardio       │        │
│  │ Metabolic ⚡ │ │      🧠      │ │   🫀         │        │
│  │              │ │              │ │              │        │
│  │ 4/4 green    │ │ 0/0          │ │ 3/3 green    │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Nutritional  │ │ Structural   │ │ Hormonal     │        │
│  │   🌱         │ │   💪         │ │   🎯         │        │
│  │              │ │              │ │              │        │
│  │ 0/0          │ │ 4/4 green    │ │ 0/0          │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  👁 Demo Data · [Sign up ↗] [Log in ↗]  ↗ = go to app.*    │
└──────────────────────────────────────────────────────────────┘
```

## Appendix C — Endpoint contract summary

```
GET /demo/zones?profile=optimized | average | at_risk
  200 OK  { data: Zone[] }
  429     { error: { code: "rate_limited" } }

GET /demo/measurements?profile=<slug>&per_page=<n>
  200 OK  { data: Measurement[] }

GET /demo/markers?profile=<slug>
  200 OK  { data: Marker[] }

GET /demo/trends?marker=<slug>&profile=<slug>
  200 OK  { data: TrendPoint[] }

GET /demo/profile?profile=<slug>
  200 OK  { data: DemoProfile }  // age, label, description

POST /demo/*  → 404 (no POST handlers registered)
PUT /demo/*   → 404
DELETE /demo/* → 404
```
