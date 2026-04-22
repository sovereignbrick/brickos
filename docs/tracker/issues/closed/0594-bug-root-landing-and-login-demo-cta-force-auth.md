# 0594 -- bug: root landing + login "View Demo" CTA both force-redirect to login

**Type:** bug
**Priority:** P1 (public-traffic regression -- external links don't see the demo)
**Found:** Sprint 051 RC manual pass, 2026-04-23
**Sprint target:** 051 (hotfix before v0.49.0 promote)
**Reporter:** helmut

## Observed

Two related symptoms on the consumer plane (`*.sovereignhealth.io`):

1. Visiting `https://app.sovereignhealth.io/` unauthed bounces to
   `/login` instead of showing the 3-profile demo. External marketing
   links, social-media bookmarks, and press traffic all hit the login
   wall.

2. Clicking the "View Demo" CTA on `/login` takes the user to
   `/sovereign-health/dashboard`, which is auth-gated, so they bounce
   back to `/login` -- an infinite-loop UX.

## Root cause

Two unrelated-but-similar links both pointed into the authed SHI app:

1. `src/app/page.tsx` did a blind server-side
   `redirect('/sovereign-health/dashboard')`. AuthGate then caught the
   unauthed state and pushed to `/login`.

2. `src/app/login/page.tsx:377` "View Demo" CTA was
   `href="/sovereign-health/dashboard"` -- same auth-gate redirect
   chain.

Since Sprint 049 moved the anonymous demo to its own dedicated host
(`eval.sovereignhealth.io`, Design 029 Plane 3), these two entry-points
never got updated.

## Fix

- **page.tsx** is now a server component that reads Host + auth cookie
  and redirects as:
  - authed -> `/sovereign-health/dashboard`
  - unauthed on `eval.sovereignhealth.io` -> `/sovereign-health/dashboard`
    (eval dashboard renders the profile picker inline)
  - unauthed on any other `*.sovereignhealth.io` -> cross-plane to
    `https://eval.sovereignhealth.io/`
  - unauthed on brickos.io / localhost -> `/login`

- **login/page.tsx** "View Demo" CTA now uses a plain `<a>` with
  `href={"https://${APP_CONFIG.evalHost}/"}` (cross-plane absolute
  URL). Bypasses the Next.js Link + AuthGate chain entirely.

## Acceptance

- [x] Unauthed `https://app.sovereignhealth.io/` -> cross-plane to eval
  (real external 302 redirect)
- [x] Authed `https://app.sovereignhealth.io/` -> /sovereign-health/dashboard
- [x] Unauthed `/login` "View Demo" click -> eval.sovereignhealth.io (new tab or same, depending on browser cross-origin behavior)
- [x] No infinite redirect loop
- [x] Unauthed `demo.brickos.io/` still goes to `/login` (admin plane)
- [x] tsc + vitest green

Closes #0594.
