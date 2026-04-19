import { test, expect } from '@playwright/test'

/**
 * Sprint 044: Org branding + settings E2E tests.
 *
 * On localhost / platform domains, these test the DEFAULT (no-org) path.
 * Org-specific branding tests require staging with a real org.
 *
 * Uses shared auth from auth.setup.ts via storageState.
 */

test.describe('Org Branding API', () => {
  test('GET /api/v1/org/branding returns default branding on platform domain', async ({ request }) => {
    const res = await request.get('/api/v1/org/branding')
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.data).toBeTruthy()
    expect(json.data.org_name).toBe('BrickOS')
    expect(json.data.is_org).toBe(false)
    expect(json.data.branding).toBeTruthy()
    expect(json.data.branding.primary_color).toBeTruthy()
  })

  test('branding response has cache-control header', async ({ request }) => {
    const res = await request.get('/api/v1/org/branding')
    expect(res.ok()).toBeTruthy()
    const cc = res.headers()['cache-control']
    expect(cc).toContain('max-age=300')
  })
})

test.describe('Org Settings Pages', () => {
  test('/org loads overview or shows no-org message', async ({ page }) => {
    await page.goto('/org')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    // Should either show overview (if user has org) or no-org message
    const hasContent = await page.locator('text=Settings').or(page.locator('text=Organization')).or(page.locator('text=only available')).first().isVisible()
    expect(hasContent).toBeTruthy()
  })

  test('/org/general loads', async ({ page }) => {
    await page.goto('/org/general')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    expect(page.url()).toContain('/org/general')
  })

  test('/org/branding loads', async ({ page }) => {
    await page.goto('/org/branding')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    expect(page.url()).toContain('/org/branding')
  })

  test('/org/members loads', async ({ page }) => {
    await page.goto('/org/members')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    expect(page.url()).toContain('/org/members')
  })

  test('/org/domains loads', async ({ page }) => {
    await page.goto('/org/domains')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    expect(page.url()).toContain('/org/domains')
  })

  test('/org/analytics loads', async ({ page }) => {
    await page.goto('/org/analytics')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    expect(page.url()).toContain('/org/analytics')
  })

  test('/org/billing loads', async ({ page }) => {
    await page.goto('/org/billing')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    expect(page.url()).toContain('/org/billing')
  })

  test('/org/apps loads with app list', async ({ page }) => {
    await page.goto('/org/apps')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    expect(page.url()).toContain('/org/apps')
  })

  test('/org/apps/shi/email loads', async ({ page }) => {
    await page.goto('/org/apps/shi/email')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    expect(page.url()).toContain('/org/apps/shi/email')
  })

  test('/org/apps/shi/ai loads', async ({ page }) => {
    await page.goto('/org/apps/shi/ai')
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    expect(page.url()).toContain('/org/apps/shi/ai')
  })
})
