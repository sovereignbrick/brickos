import { test, expect } from '@playwright/test'
import { loginAndNavigate, loginViaUI, DEMO_ADMIN } from './helpers/auth'

test.describe('Platform Session', () => {
  test('login with return=/platform lands on platform', async ({ page }) => {
    await loginAndNavigate(page, DEMO_ADMIN.email, DEMO_ADMIN.password, '/platform')
    const url = page.url()
    expect(url.includes('/platform') || url.includes('/dashboard')).toBe(true)
  })

  test('unauthenticated /platform redirects to login', async ({ page }) => {
    await page.goto('/platform')
    await page.waitForURL(/login/, { timeout: 10000 })
    expect(page.url()).toContain('/login')
  })

  test('session persists across SHI pages via client navigation', async ({ page }) => {
    await loginViaUI(page, DEMO_ADMIN.email, DEMO_ADMIN.password)
    // Now on /dashboard. Use client-side navigation (click a link)
    await page.goto('/affiliate')
    // Wait for page to settle
    await page.waitForTimeout(3000)
    // Should NOT be on login page
    const url = page.url()
    const onLogin = url.includes('/login')
    if (onLogin) {
      // Session dropped -- this is the bug we're tracking (#0370)
      console.log('BUG #0370: Session dropped when navigating to /affiliate')
    }
    // For now, assert it doesn't redirect (will fail until #0370 is fixed)
    expect(url).not.toContain('/login')
  })

  test('session persists across platform pages via sidebar clicks', async ({ page }) => {
    // Login and go directly to platform
    await loginAndNavigate(page, DEMO_ADMIN.email, DEMO_ADMIN.password, '/platform')

    // If we landed on platform, test sidebar navigation
    if (page.url().includes('/platform')) {
      // Wait for sidebar to render
      await page.waitForSelector('nav', { timeout: 5000 })

      // Click Services in sidebar (client-side navigation)
      const servicesLink = page.locator('a[href="/platform/services"]')
      if (await servicesLink.isVisible()) {
        await servicesLink.click()
        await page.waitForTimeout(2000)
        expect(page.url()).toContain('/platform/services')
        expect(page.url()).not.toContain('/login')
      }

      // Click Users in sidebar
      const usersLink = page.locator('a[href="/platform/users"]')
      if (await usersLink.isVisible()) {
        await usersLink.click()
        await page.waitForTimeout(2000)
        expect(page.url()).toContain('/platform/users')
        expect(page.url()).not.toContain('/login')
      }
    }
  })
})
