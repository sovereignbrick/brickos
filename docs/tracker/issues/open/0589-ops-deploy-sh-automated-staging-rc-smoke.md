---
number: 589
title: "ops(stability): automated post-deploy smoke test (staging + prod) via deploy.sh"
milestone: "Sprint 047 -- Multi-App URL Routing + Stability"
labels: [ops, stability, test, deploy, p2]
created: 2026-04-20
priority: P2
estimate: 0.5d
---

Today `deploy.sh` runs a "platform smoke test" after deploy that calls
hardcoded verify URLs. Some of those URLs are wrong (e.g.
`/api/v1/health` when backend actually serves `/health`), producing
the recurring `[FAIL] Verification -- some endpoints failed` noise
that obscures real failures.

## Scope

Replace the hardcoded URL list with an invocation of the
`sprint-046-rc-smoke` Playwright suite (with an equivalent
`sprint-047-rc-smoke` to be added when Sprint 047 ships):

1. After container restart + 5s stabilisation, run:
   ```bash
   (cd apps/health/sovereign-health/frontend && \
     E2E_BASE_URL=https://app.brickos.io npx playwright test \
       sprint-04\*-rc-smoke --project=unauth --reporter=list)
   ```

2. Real pass/fail becomes the deploy's exit code + report; the
   `[FAIL] Image size mismatch` and `/api/v1/health` verify noise go
   away.

3. For production deploys, additionally run the `sprint-046-rc-smoke`
   tests against `https://app.brickos.io` to catch regressions in the
   Sprint 046 two-plane behaviour.

## Acceptance

- `bash ops/deploy.sh staging frontend` runs sprint-04*-rc-smoke at
  the end
- Deploy fails (non-zero exit) if any rc-smoke test fails
- No more `[FAIL] Image size mismatch` noise
- Prod deploy runs the same suite against the prod URL

## Why this goes in Sprint 047

Sprint 046 RC surfaced 8 rounds of hotfixes partly because the smoke
verification didn't catch regressions -- the suite existed but wasn't
wired into the deploy pipeline. Bundling this with the URL refactor
(#577) means every route move in the refactor is verified on every
deploy.
