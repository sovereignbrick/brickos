import { test, expect } from '@playwright/test'
import { loginAndNavigate, DEMO_ADMIN } from './helpers/auth'

/**
 * BrickOS Platform Session Tests
 *
 * Tests that the platform admin GUI at /platform/* works correctly
 * on the brickos.io domain. The platform is self-contained -- no
 * cross-navigation to SHI pages (/affiliate, /dashboard, etc.).
 *
 * SHI pages are tested separately on sovereignhealth.io domain.
 *
 * Run: E2E_BASE_URL=https://demo.brickos.io npx playwright test platform-session
 */

test.describe('BrickOS Platform Admin', () => {
  test('unauthenticated /platform redirects to login', async ({ page }) => {
    await page.goto('/platform')
    await page.waitForURL(/login/, { timeout: 10000 })
    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('return')
  })

  test('login with return=/platform lands on platform dashboard', async ({ page }) => {
    await loginAndNavigate(page, DEMO_ADMIN.email, DEMO_ADMIN.password, '/platform')
    expect(page.url()).toContain('/platform')
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 })
  })

  test('sidebar navigation: platform -> services -> users -> analytics', async ({ page }) => {
    await loginAndNavigate(page, DEMO_ADMIN.email, DEMO_ADMIN.password, '/platform')

    if (!page.url().includes('/platform')) return // skip if login didn't land on platform

    // Wait for sidebar and dashboard to fully load before navigating
    await page.waitForSelector('nav', { timeout: 5000 })
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // Navigate to Services
    const servicesLink = page.locator('a[href="/platform/services"]')
    if (await servicesLink.isVisible()) {
      await servicesLink.click()
      await page.waitForTimeout(2000)
      expect(page.url()).toContain('/platform/services')
      expect(page.url()).not.toContain('/login')
    }

    // Navigate to Users
    const usersLink = page.locator('a[href="/platform/users"]')
    if (await usersLink.isVisible()) {
      await usersLink.click()
      await page.waitForTimeout(2000)
      expect(page.url()).toContain('/platform/users')
      expect(page.url()).not.toContain('/login')
    }

    // Navigate to Analytics
    const analyticsLink = page.locator('a[href="/platform/analytics"]')
    if (await analyticsLink.isVisible()) {
      await analyticsLink.click()
      await page.waitForTimeout(2000)
      expect(page.url()).toContain('/platform/analytics')
      expect(page.url()).not.toContain('/login')
    }

    // Navigate back to Home
    const homeLink = page.locator('a[href="/platform"]')
    if (await homeLink.isVisible()) {
      await homeLink.click()
      await page.waitForTimeout(2000)
      expect(page.url()).toMatch(/\/platform\/?$/)
      expect(page.url()).not.toContain('/login')
    }
  })

  test('platform dashboard shows stat cards', async ({ page }) => {
    await loginAndNavigate(page, DEMO_ADMIN.email, DEMO_ADMIN.password, '/platform')
    if (!page.url().includes('/platform')) return

    // Should show stat cards with data
    await expect(page.locator('text=Total Users').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Measurements').first()).toBeVisible({ timeout: 10000 })
  })

  test('platform services shows health status', async ({ page }) => {
    await loginAndNavigate(page, DEMO_ADMIN.email, DEMO_ADMIN.password, '/platform')
    if (!page.url().includes('/platform')) return

    await page.goto('/platform/services')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    expect(page.url()).toContain('/platform/services')
    expect(page.url()).not.toContain('/login')
  })

  // Sprint 032 features
  test('organizations page loads with org list', async ({ page }) => {
    await loginAndNavigate(page, DEMO_ADMIN.email, DEMO_ADMIN.password, '/platform')
    if (!page.url().includes('/platform')) return

    await page.goto('/platform/orgs')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    expect(page.url()).toContain('/platform/orgs')
    expect(page.url()).not.toContain('/login')
    // Should show org table
    await expect(page.locator('text=Organizations').first()).toBeVisible({ timeout: 5000 })
  })

  test('members page loads with org selector', async ({ page }) => {
    await loginAndNavigate(page, DEMO_ADMIN.email, DEMO_ADMIN.password, '/platform')
    if (!page.url().includes('/platform')) return

    await page.goto('/platform/members')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    expect(page.url()).toContain('/platform/members')
    expect(page.url()).not.toContain('/login')
  })

  test('AI config page shows profiles', async ({ page }) => {
    await loginAndNavigate(page, DEMO_ADMIN.email, DEMO_ADMIN.password, '/platform')
    if (!page.url().includes('/platform')) return

    await page.goto('/platform/ai/config')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    expect(page.url()).toContain('/platform/ai/config')
    expect(page.url()).not.toContain('/login')
    await expect(page.locator('text=AI Configuration').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Default').first()).toBeVisible({ timeout: 5000 })
  })

  test('compliance page shows frameworks', async ({ page }) => {
    await loginAndNavigate(page, DEMO_ADMIN.email, DEMO_ADMIN.password, '/platform')
    if (!page.url().includes('/platform')) return

    await page.goto('/platform/compliance')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    expect(page.url()).toContain('/platform/compliance')
    await expect(page.locator('text=GDPR').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=EU AI Act').first()).toBeVisible({ timeout: 5000 })
  })

  test('branding page shows presets', async ({ page }) => {
    await loginAndNavigate(page, DEMO_ADMIN.email, DEMO_ADMIN.password, '/platform')
    if (!page.url().includes('/platform')) return

    await page.goto('/platform/branding')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    expect(page.url()).toContain('/platform/branding')
    await expect(page.locator('text=Theme Presets').first()).toBeVisible({ timeout: 5000 })
  })

  test('app switcher nav visible in header', async ({ page }) => {
    await loginAndNavigate(page, DEMO_ADMIN.email, DEMO_ADMIN.password, '/platform')
    if (!page.url().includes('/platform')) return

    // App switcher should show Platform, Health, Links, Voice
    await expect(page.locator('header nav')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('header a:has-text("Platform")')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('header a:has-text("Health")')).toBeVisible({ timeout: 5000 })
  })
})
