import { test, expect } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL || 'https://demo.brickos.io'
const BASIC_USER = 'helmut'
const BASIC_PASS = 'JM8Lv97Ax3LiRDLMgYfXdw=='
const EMAIL = 'demo@sovereignhealth.io'
const PASSWORD = 'SovereignDemo1'

test.describe('BrickOS Platform Session', () => {
  test.use({
    httpCredentials: { username: BASIC_USER, password: BASIC_PASS },
  })

  test('login and navigate platform pages without re-login', async ({ page }) => {
    // Go to platform -- should redirect to login
    await page.goto(`${BASE}/platform`)
    await page.waitForURL(/login/)

    // Login
    await page.fill('input[name="email"], input[type="email"]', EMAIL)
    await page.fill('input[name="password"], input[type="password"]', PASSWORD)
    await page.click('button[type="submit"]')

    // Should land on platform dashboard
    await page.waitForURL(/platform/, { timeout: 10000 })
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 })

    // Navigate to services
    await page.click('a[href="/platform/services"]')
    await page.waitForURL(/platform\/services/)
    await expect(page.locator('text=Services')).toBeVisible({ timeout: 5000 })
    // Should NOT redirect to login
    expect(page.url()).not.toContain('login')

    // Navigate to users
    await page.click('a[href="/platform/users"]')
    await page.waitForURL(/platform\/users/)
    await expect(page.locator('text=Users')).toBeVisible({ timeout: 5000 })
    expect(page.url()).not.toContain('login')

    // Navigate to analytics
    await page.click('a[href="/platform/analytics"]')
    await page.waitForURL(/platform\/analytics/)
    await expect(page.locator('text=Analytics')).toBeVisible({ timeout: 5000 })
    expect(page.url()).not.toContain('login')
  })
})
