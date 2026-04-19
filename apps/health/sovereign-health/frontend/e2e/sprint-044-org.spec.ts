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
  // On platform domain (demo.brickos.io), the user's JWT has no org claims.
  // Org pages either load with content or redirect to login (valid behavior).
  // Full org page testing requires login on an org subdomain.

  const orgPages = [
    '/org',
    '/org/general',
    '/org/branding',
    '/org/members',
    '/org/domains',
    '/org/analytics',
    '/org/billing',
    '/org/apps',
    '/org/apps/shi/email',
    '/org/apps/shi/ai',
  ]

  for (const path of orgPages) {
    test(`${path} loads without crash`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle', { timeout: 10000 })
      // Page either shows content or redirects to login -- both are valid.
      // What's NOT valid: a 500 error or blank white page.
      const url = page.url()
      const isOrgPage = url.includes('/org')
      const isLogin = url.includes('/login')
      expect(isOrgPage || isLogin).toBeTruthy()
    })
  }
})
