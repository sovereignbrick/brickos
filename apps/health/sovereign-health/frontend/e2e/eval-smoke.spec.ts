import { test, expect, type APIRequestContext } from '@playwright/test'

/**
 * Sprint 049 #049-14 (Design 029 v0.3 §19): production smoke via
 * the anonymous eval surface.
 *
 * Intent: run after every prod deploy (integrated into deploy.sh verify())
 * AND nightly (catches drift between deploys -- cert expiry, DNS changes,
 * third-party API regressions). Because eval.sovereignhealth.io serves
 * real production data via /demo/* (read-only) it's safe to hit repeatedly.
 *
 *   E2E_BASE_URL=https://eval.sovereignhealth.io pnpm exec playwright test \
 *     eval-smoke --project=unauth --reporter=list
 *
 * Self-skips on non-eval hosts so it doesn't run accidentally in dev.
 */

const EVAL_HOST = 'eval.sovereignhealth.io'

function isEvalBase(baseURL: string | undefined): boolean {
  if (!baseURL) return false
  try {
    return new URL(baseURL).hostname === EVAL_HOST
  } catch {
    return false
  }
}

test.describe('eval-smoke (prod eval surface)', () => {
  test.beforeEach(async ({ baseURL }) => {
    test.skip(
      !isEvalBase(baseURL),
      `eval-smoke is scoped to https://${EVAL_HOST} only (got ${baseURL})`,
    )
  })

  test('landing / returns 200 and renders app shell', async ({ request }) => {
    const res = await request.get('/')
    expect(res.ok()).toBeTruthy()
    const body = await res.text()
    expect(body).toContain('<!DOCTYPE')
    // App shell contains the product name from metadata
    expect(body).toMatch(/Sovereign Health/i)
  })

  test('/sovereign-health/dashboard returns 200 (deep link)', async ({ request }) => {
    const res = await request.get('/sovereign-health/dashboard')
    expect(res.ok()).toBeTruthy()
  })

  test('deep paths carry noindex meta tag (Design 029 §20 / #049-13)', async ({ request }) => {
    const res = await request.get('/sovereign-health/dashboard')
    const body = await res.text()
    // Next.js generateMetadata with robots: { index: false, follow: false }
    // renders as <meta name="robots" content="noindex, nofollow"/>
    expect(body).toMatch(/<meta\s+name="robots"\s+content="[^"]*noindex[^"]*"/i)
  })

  test('landing / is indexable (no global noindex)', async ({ request }) => {
    const res = await request.get('/')
    const body = await res.text()
    // The landing page should NOT have robots=noindex; only deep paths do.
    // If Next's generateMetadata ran, the meta would appear here too for
    // every page under the /sovereign-health layout. Root (/) is NOT
    // under that layout so it stays indexable.
    const noindexMatch = body.match(/<meta\s+name="robots"\s+content="[^"]*noindex[^"]*"/i)
    expect(noindexMatch, 'landing must remain indexable per Design 029 §15 Q3').toBeNull()
  })

  test('/demo/zones returns data for optimized profile', async ({ request }) => {
    const res = await request.get('/demo/zones?profile=optimized')
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(Array.isArray(json.data)).toBeTruthy()
    expect(json.data.length).toBeGreaterThan(0)
  })

  test('/demo/zones returns data for average profile', async ({ request }) => {
    const res = await request.get('/demo/zones?profile=average')
    expect(res.ok()).toBeTruthy()
  })

  test('/demo/zones returns data for at_risk profile', async ({ request }) => {
    const res = await request.get('/demo/zones?profile=at_risk')
    expect(res.ok()).toBeTruthy()
  })

  test('/demo/* rejects write verbs (sanity check vs #049-12)', async ({ request }) => {
    // POST on a /demo/* path should be 404 or 405 (never 200/201/204).
    const res = await request.post('/demo/zones', { data: {} })
    expect([404, 405]).toContain(res.status())
  })

  test('no auth cookie set after browsing (eval never authenticates)', async ({ browser }) => {
    // Fresh context ensures we start with zero cookies.
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.goto('/sovereign-health/dashboard?profile=optimized')
    await page.waitForLoadState('networkidle')
    const cookies = await ctx.cookies()
    const authCookie = cookies.find((c) => c.name === 'auth_token')
    expect(authCookie, 'eval must not set auth_token cookie').toBeUndefined()
    await ctx.close()
  })
})

/** Isolated deep-path noindex probe runnable on its own for quick manual
 *  verification: `pnpm exec playwright test eval-smoke -g "noindex"` */
test.describe('eval-smoke metadata (informational)', () => {
  test.beforeEach(async ({ baseURL }) => {
    test.skip(!isEvalBase(baseURL), 'eval only')
  })

  test('all SHI deep paths carry noindex', async ({ request }) => {
    const paths = [
      '/sovereign-health/dashboard',
      '/sovereign-health/measurements',
      '/sovereign-health/trends',
      '/sovereign-health/doctor-chat',
    ]
    for (const p of paths) {
      const res = await request.get(p)
      const body = await res.text()
      expect(
        body,
        `${p} must carry noindex when served by eval host`,
      ).toMatch(/<meta\s+name="robots"\s+content="[^"]*noindex[^"]*"/i)
    }
  })
})
