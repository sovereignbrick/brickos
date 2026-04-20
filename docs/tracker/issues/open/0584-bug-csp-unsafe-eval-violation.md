---
number: 584
title: "bug: CSP violation 'unsafe-eval' from chunked JS on /login and /doctor-chat"
milestone: "Sprint 046 -- Unified Admin Home"
labels: [bug, csp, security, p2]
created: 2026-04-20
priority: P2
estimate: 0.5d
---

Reported during RC round 3 on 2026-04-20. Two pages emit a Content
Security Policy violation to the console:

```
Content-Security-Policy: The page's settings blocked a JavaScript eval
(script-src) from being executed because it violates the following
directive: "script-src 'self' 'unsafe-inline'" (Missing 'unsafe-eval')
1070-4c23bff552f2a7c1.js:1:8406
```

Seen on: demo.brickos.io/login (A1), test-clinic.demo.sovereignhealth.io/doctor-chat (B4)

## Diagnosis

Some bundled library uses `eval()` or `new Function()`. Candidates:
- Recharts (some versions eval in SVG path optimisation)
- lucide-react icons (unlikely)
- Zod / standard-schema validators (possible)
- next-intl dynamic locale loading (possible)
- sonner toast (unlikely)

## Options

1. Identify the culprit with a source-map trace and replace the dependency
2. Relax CSP to add `'unsafe-eval'` (security regression -- avoid)
3. Add `'wasm-unsafe-eval'` only, which is narrower (some libs use WASM)

## Impact assessment

- Login + doctor-chat STILL WORK despite the warning -- browser blocked
  the eval, dependent code fell through to a non-eval path
- No visual break reported
- Console noise only

## Acceptance

- No CSP violation on /login or /doctor-chat
- No relaxation of CSP (keep 'self' 'unsafe-inline' only)
- All existing functionality intact
