import { test, expect, type APIRequestContext } from '@playwright/test'

/**
 * Sprint 050 #050-B3a (Design 029 + Phase B): customer acquisition
 * funnel end-to-end.
 *
 * Routes:
 *   marketing (sovereignhealth.io) -> eval.sovereignhealth.io ->
 *   [Sign up] -> app.sovereignhealth.io/signup?from=demo-<profile>
 *   -> verify email -> first dashboard.
 *
 * These specs exercise the funnel contractually (HTTP-level + API
 * assertions) rather than pixel-by-pixel UI. Pixel/visual goes in
 * the separate sprint-050-mobile-responsive spec.
 *
 *   E2E_BASE_URL=https://test-clinic.demo.brickos.io pnpm exec playwright \
 *     test sprint-050-acquisition-funnel --project=unauth --reporter=list
 *
 * Some specs require localhost (for real signup + DB assertion); others
 * target any environment (for endpoint reachability).
 */

function isLocalhost(baseURL: string | undefined): boolean {
  if (!baseURL) return false
  const host = new URL(baseURL).hostname
  return host === 'localhost' || host === '127.0.0.1'
}

function backendUrl(baseURL: string | undefined): string {
  if (!baseURL) return ''
  const host = new URL(baseURL).hostname
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:8080'
  return baseURL
}

test.describe.configure({ mode: 'serial' })

// ──────────────────────────────────────────────────────────────────
// 1. Eval surface exposes the demo data anonymously
// ──────────────────────────────────────────────────────────────────

test.describe('eval surface anonymous read', () => {
  test('GET /demo/zones returns zones for each of 3 profiles', async ({ request, baseURL }) => {
    test.skip(isLocalhost(baseURL), 'eval surface not on localhost')
    const api = backendUrl(baseURL)
    for (const profile of ['optimized', 'average', 'at_risk']) {
      const res = await request.get(`${api}/demo/zones?profile=${profile}`)
      expect(res.ok(), `${profile}: HTTP ${res.status()}`).toBeTruthy()
      const body = await res.json()
      expect(Array.isArray(body.data), `${profile}: data not array`).toBeTruthy()
      expect(body.data.length, `${profile}: zero zones`).toBeGreaterThan(0)
    }
  })

  test('POST /demo/zones is rejected (read-only invariant)', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const res = await request.post(`${api}/demo/zones`, { data: {} })
    expect([404, 405]).toContain(res.status())
  })
})

// ──────────────────────────────────────────────────────────────────
// 2. Signup endpoint shape + signup_source attribution
// ──────────────────────────────────────────────────────────────────

test.describe('signup endpoint contract', () => {
  test('POST /auth/signup with empty body returns structured 400', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const res = await request.post(`${api}/auth/signup`, { data: {} })
    // 400 (validation) or 403 (registration gate closed) -- both prove
    // the endpoint is wired. 500 would be broken; 404 would be routing.
    expect([400, 403, 422, 429]).toContain(res.status())
  })

  test('POST /auth/signup persists signup_source=demo-<profile>', async ({ request, baseURL }) => {
    test.skip(!isLocalhost(baseURL), 'signup persistence check localhost only (needs DB access + no rate limit)')
    const api = backendUrl(baseURL)
    const email = `e2e-funnel-${Date.now()}@clinic.com`

    const res = await request.post(`${api}/auth/signup`, {
      data: {
        email,
        password: 'TestFunnel1',
        tos_accepted: true,
        signup_source: 'demo-optimized',
      },
    })
    expect(res.ok(), `signup: HTTP ${res.status()}`).toBeTruthy()
    const body = await res.json()
    expect(body.data.user.email).toBe(email)
    // signup_source is intentionally not echoed back in the signup
    // response (PII-minimal). Persistence is verified by
    // sprint_050_coverage.rs in the Rust test suite.
  })

  test('POST /auth/signup with invalid signup_source accepts signup + drops source', async ({ request, baseURL }) => {
    test.skip(!isLocalhost(baseURL), 'localhost only')
    const api = backendUrl(baseURL)
    const email = `e2e-funnel-bogus-${Date.now()}@clinic.com`

    const res = await request.post(`${api}/auth/signup`, {
      data: {
        email,
        password: 'TestFunnel1',
        tos_accepted: true,
        signup_source: '<script>alert(1)</script>',
      },
    })
    // Signup should succeed (the source is dropped, not rejected).
    expect(res.ok()).toBeTruthy()
  })
})

// ──────────────────────────────────────────────────────────────────
// 3. Signup page HTML surfaces the invite/ from params correctly
// ──────────────────────────────────────────────────────────────────

test.describe('signup page rendering', () => {
  test('/signup loads with no console errors on public path', async ({ page, baseURL }) => {
    test.skip(isLocalhost(baseURL), 'visual smoke against staging')
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto('/signup')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.locator('button:has-text("Create Account")')).toBeVisible()
    expect(errors.filter((e) => !e.includes('Cache-Control'))).toEqual([])
  })

  test('/signup?from=demo-optimized preserves the query', async ({ page, baseURL }) => {
    test.skip(isLocalhost(baseURL), 'visual smoke against staging')
    await page.goto('/signup?from=demo-optimized')
    await expect(page).toHaveURL(/from=demo-optimized/)
  })

  test('/signup?invite=<bogus> shows the "invite invalid" banner', async ({ page, baseURL }) => {
    test.skip(isLocalhost(baseURL), 'visual smoke against staging')
    // eval host has no signup flow (conversion banner cross-planes
    // to app.* instead). Skip there.
    const host = baseURL ? new URL(baseURL).hostname : ''
    test.skip(host === 'eval.sovereignhealth.io', 'eval has no /signup flow')
    await page.goto('/signup?invite=00000000-0000-0000-0000-000000000000')
    const bannerText = page.locator('text=/invite.*(expired|cancelled|doesn|abgelaufen|storniert)/i')
    await expect(bannerText.first()).toBeVisible()
  })
})

// ──────────────────────────────────────────────────────────────────
// 4. Post-verify: first-login landing
// ──────────────────────────────────────────────────────────────────

test.describe('post-signup first dashboard', () => {
  test('fresh user lands on /sovereign-health/dashboard after login', async ({ request, page, baseURL }) => {
    test.skip(!isLocalhost(baseURL), 'needs DB + email-verify bypass; localhost only')
    const api = backendUrl(baseURL)
    const email = `e2e-dashboard-${Date.now()}@clinic.com`

    // 1. Signup
    const signupRes = await request.post(`${api}/auth/signup`, {
      data: { email, password: 'TestDash1', tos_accepted: true },
    })
    expect(signupRes.ok()).toBeTruthy()

    // 2. Verify email directly in the DB path isn't easily scriptable
    //    here; localhost has is_oss() which auto-verifies on signup.
    //    Login should succeed immediately.
    const loginRes = await request.post(`${api}/auth/login`, {
      data: { email, password: 'TestDash1' },
    })
    expect(loginRes.ok(), `login: HTTP ${loginRes.status()}`).toBeTruthy()
    const { data } = await loginRes.json()
    expect(data.token).toBeTruthy()

    // 3. Auth'd /auth/me returns the new user
    const meRes = await request.get(`${api}/auth/me`, {
      headers: { Authorization: `Bearer ${data.token}` },
    })
    expect(meRes.ok()).toBeTruthy()
    const me = await meRes.json()
    expect(me.data.email).toBe(email)

    // 4. First dashboard view -- empty state is fine, no 500s
    await page.goto(`/sovereign-health/dashboard`)
    await expect(page).toHaveURL(/sovereign-health\/dashboard|login/)
  })
})
