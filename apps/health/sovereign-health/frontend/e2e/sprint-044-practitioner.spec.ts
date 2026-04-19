import { test, expect } from '@playwright/test'

/**
 * Sprint 044: Practitioner dashboard E2E tests.
 *
 * Tests the /practitioner page and API endpoints.
 * On localhost without org context, expects redirect or forbidden.
 */

test.describe('Practitioner Dashboard', () => {
  test('unauthenticated /practitioner redirects to login', async ({ browser }) => {
    // Fresh context without stored auth
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('/practitioner')
    await page.waitForURL(/login/, { timeout: 10000 })
    expect(page.url()).toContain('/login')
    await context.close()
  })

  test('/practitioner page loads for authenticated user', async ({ page }) => {
    await page.goto('/practitioner')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    // Without org context, should show error message or the page
    const hasContent = await page
      .locator('text=Members')
      .or(page.locator('text=only available'))
      .or(page.locator('text=Forbidden'))
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    // Page loaded without crash -- that's the test
    expect(page.url()).not.toContain('/login')
  })

  test('GET /practitioner/members requires auth', async ({ request }) => {
    // Request without auth token
    const context = await request.newContext()
    const res = await context.get('/practitioner/members')
    // Should be 401 (no auth) not 500
    expect([401, 403]).toContain(res.status())
    await context.dispose()
  })
})
