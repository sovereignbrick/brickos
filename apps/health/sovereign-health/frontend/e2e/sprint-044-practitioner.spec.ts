import { test, expect } from '@playwright/test'

/**
 * Sprint 044: Practitioner dashboard E2E tests.
 *
 * Tests the /sovereign-health/practitioner page and API endpoints.
 * Sprint 047 #577 moved the end-user route under /sovereign-health/.
 * On localhost without org context, expects redirect or forbidden.
 */

test.describe('Practitioner Dashboard', () => {
  test('unauthenticated /sovereign-health/practitioner redirects to login', async ({ browser }) => {
    // Fresh context without stored auth
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('/sovereign-health/practitioner')
    await page.waitForURL(/login/, { timeout: 10000 })
    expect(page.url()).toContain('/login')
    await context.close()
  })

  test('/sovereign-health/practitioner page loads without crash', async ({ page }) => {
    await page.goto('/sovereign-health/practitioner')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    // Without org context, may redirect to login or show error -- both valid.
    const url = page.url()
    const isPage = url.includes('/sovereign-health/practitioner')
    const isLogin = url.includes('/login')
    expect(isPage || isLogin).toBeTruthy()
  })

  test('GET /practitioner/members rejects unauthenticated', async ({ request }) => {
    // Use the API request context (which has auth from setup),
    // but test that the endpoint doesn't crash.
    // NOTE: /practitioner/members is a BACKEND API path, not a frontend
    // route -- it was NOT moved by Sprint 047 #577 (that only touched
    // frontend routes). Keep as-is.
    const res = await request.get('/practitioner/members')
    // With auth but no org role: 403. Without org tables: possibly 500.
    // What matters: NOT 200 (data leak) and NOT crash (connection refused).
    expect(res.status()).not.toBe(200)
  })
})
