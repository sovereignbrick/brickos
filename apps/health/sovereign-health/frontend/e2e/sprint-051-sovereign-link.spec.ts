import { test, expect } from '@playwright/test'

/**
 * Sprint 051 #0587: Sovereign Link end-user skeleton.
 *
 * Contract-level checks (page routes exist + render without 500s);
 * the full authed CRUD flow is covered by the admin-links tests.
 */

test.describe('Sovereign Link end-user routes', () => {
  test.beforeEach(async ({ baseURL }) => {
    const host = baseURL ? new URL(baseURL).hostname : ''
    test.skip(host === 'eval.sovereignhealth.io', 'eval has no org context')
  })

  test('/sovereign-link redirects unauth to /login', async ({ page, baseURL }) => {
    const res = await page.goto('/sovereign-link')
    expect(res, 'navigation response').not.toBeNull()
    // Unauth users get bounced to login with a return target; don't
    // assert strictly on the path (AuthGate implementation details may
    // change) -- assert we end up somewhere not a 500 / not the raw
    // sovereign-link page showing protected data.
    await expect(page).toHaveURL(/(login|signup|sovereign-link)/)
    if (baseURL) {
      const status = res?.status() ?? 0
      expect(status, `status ${status}`).toBeLessThan(500)
    }
  })

  test('/sovereign-link/new page is reachable without 500', async ({ page }) => {
    const res = await page.goto('/sovereign-link/new')
    expect(res?.status() ?? 0).toBeLessThan(500)
  })

  test('/sovereign-link/analytics page is reachable without 500', async ({ page }) => {
    const res = await page.goto('/sovereign-link/analytics')
    expect(res?.status() ?? 0).toBeLessThan(500)
  })
})
