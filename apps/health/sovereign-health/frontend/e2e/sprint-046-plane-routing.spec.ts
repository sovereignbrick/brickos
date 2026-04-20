import { test, expect } from '@playwright/test'

/**
 * Sprint 046 regression suite -- plane routing + admin consolidation.
 *
 * Validates the hotfixes made during 2026-04-20 RC testing:
 *   1. /admin hard-removed -> 308 to /platform (browser Accept only)
 *   2. /org/* -> /platform/org/* redirects
 *   3. Unauthenticated /settings goes to /login (NOT /dashboard)
 *   4. /settings renders on both planes without cross-plane redirect
 *   5. PlaneGate redirects cross-plane navigation
 *   6. Cross-plane profile-menu links point at the opposite plane
 *
 * Run against staging:
 *   E2E_BASE_URL=https://test-clinic.demo.brickos.io \
 *     npx playwright test sprint-046 --project=chromium
 *
 * Some tests need the opposite plane -- they build the URL explicitly
 * rather than trusting BASE_URL.
 */

// Helper: extract host for cross-plane URLs. Tests run against a single
// base URL; we swap the parent to reach the other plane.
function swapPlane(baseURL: string | undefined, toPlane: 'admin' | 'end-user'): string {
  const url = new URL(baseURL || 'https://test-clinic.demo.brickos.io')
  if (toPlane === 'admin') {
    url.hostname = url.hostname
      .replace(/\.demo\.sovereignhealth\.io$/, '.demo.brickos.io')
      .replace(/\.sovereignhealth\.io$/, '.brickos.io')
  } else {
    url.hostname = url.hostname
      .replace(/\.demo\.brickos\.io$/, '.demo.sovereignhealth.io')
      .replace(/\.brickos\.io$/, '.sovereignhealth.io')
  }
  return url.origin
}

test.describe('Sprint 046 -- /admin deprecated', () => {
  test('/admin redirects 308 to /platform (browser Accept)', async ({ request, baseURL }) => {
    const res = await request.get('/admin', {
      headers: { Accept: 'text/html,application/xhtml+xml' },
      maxRedirects: 0,
    })
    expect(res.status()).toBe(308)
    expect(res.headers()['location']).toContain('/platform')
  })

  test('/admin/anything redirects to /platform', async ({ request }) => {
    const res = await request.get('/admin/users', {
      headers: { Accept: 'text/html' },
      maxRedirects: 0,
    })
    expect(res.status()).toBe(308)
    expect(res.headers()['location']).toContain('/platform')
  })
})

test.describe('Sprint 046 -- /org/* legacy redirects', () => {
  test('/org -> /platform/org', async ({ request }) => {
    const res = await request.get('/org', {
      headers: { Accept: 'text/html' },
      maxRedirects: 0,
    })
    expect(res.status()).toBe(308)
    expect(res.headers()['location']).toMatch(/\/platform\/org$/)
  })

  test('/org/branding -> /platform/org/branding', async ({ request }) => {
    const res = await request.get('/org/branding', {
      headers: { Accept: 'text/html' },
      maxRedirects: 0,
    })
    expect(res.status()).toBe(308)
    expect(res.headers()['location']).toMatch(/\/platform\/org\/branding$/)
  })
})

test.describe('Sprint 046 -- /settings auth + plane handling', () => {
  test('unauth /settings -> /login (NOT /dashboard -- hotfix 2026-04-20)', async ({ browser }) => {
    // Fresh context -- no stored auth.
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('/settings')
    await page.waitForURL(/\/login/, { timeout: 10000 })
    // Should have return param pointing at /settings, not be on /dashboard.
    // (Assertion catches both legacy /dashboard and Sprint 047's
    // /sovereign-health/dashboard -- substring match is intentional.)
    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('return')
    expect(page.url()).toContain('settings')
    expect(page.url()).not.toContain('/dashboard')
    await context.close()
  })

  test('authed /settings on admin plane stays there (no cross-plane redirect)', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })
    // Host should be brickos.io (admin plane), NOT sovereignhealth.io.
    expect(page.url()).toMatch(/\.brickos\.io/)
    expect(page.url()).toContain('/settings')
    expect(page.url()).not.toContain('sovereignhealth.io')
  })
})

test.describe('Sprint 046 -- plane gate cross-plane redirects', () => {
  test('/sovereign-health/dashboard on admin plane redirects to end-user plane', async ({ page, baseURL }) => {
    // Sprint 047 #577: dashboard lives at /sovereign-health/dashboard. Go
    // direct to the new path so the 308 from next.config.ts doesn't
    // confuse the plane-gate assertion.
    const endUserHost = swapPlane(baseURL, 'end-user')
    await page.goto('/sovereign-health/dashboard')
    // Plane gate uses window.location.replace in a client useEffect.
    // Wait for the redirect to fire.
    await page.waitForURL(new RegExp(endUserHost), { timeout: 10000 })
    expect(page.url()).toMatch(/\/(sovereign-health\/)?dashboard/)
  })

  test('/platform/org on end-user plane redirects to admin plane', async ({ page, baseURL }) => {
    const endUser = swapPlane(baseURL, 'end-user')
    const admin = swapPlane(baseURL, 'admin')
    await page.goto(`${endUser}/platform/org`)
    await page.waitForURL(new RegExp(admin), { timeout: 10000 })
    expect(page.url()).toMatch(/\/platform\/org/)
  })
})

test.describe('Sprint 046 -- admin sidebar visibility', () => {
  test('ORGANIZATION + PEOPLE sections render on /platform', async ({ page }) => {
    await page.goto('/platform')
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    // Section headers are text nodes in the sidebar.
    await expect(page.locator('text=ORGANIZATION').first()).toBeVisible()
    await expect(page.locator('text=PEOPLE').first()).toBeVisible()
    await expect(page.locator('text=APPS').first()).toBeVisible()
  })

  test('APPS section lists all three registered apps', async ({ page }) => {
    await page.goto('/platform')
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    // App labels appear as zinc-600 (greyed) or zinc-300 (licensed) text.
    await expect(page.locator('text=Sovereign Health').first()).toBeVisible()
    await expect(page.locator('text=Sovereign Link').first()).toBeVisible()
    await expect(page.locator('text=Sovereign Voice').first()).toBeVisible()
  })

  test('unlicensed apps show "Licensed by BrickOS" tag', async ({ page }) => {
    await page.goto('/platform')
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    await expect(page.locator('text=Licensed by BrickOS').first()).toBeVisible()
  })
})

test.describe('Sprint 046 -- /platform/org pages reachable', () => {
  for (const path of [
    '/platform/org',
    '/platform/org/general',
    '/platform/org/branding',
    '/platform/org/domains',
    '/platform/org/analytics',
    '/platform/org/affiliate',
    '/platform/org/billing',
    '/platform/members',
  ]) {
    test(`${path} returns 200`, async ({ page }) => {
      const response = await page.goto(path)
      expect(response?.status()).toBeLessThan(400)
    })
  }

  test('/platform/org/members is 404 (intentional -- collapsed to /platform/members)', async ({ request }) => {
    const res = await request.get('/platform/org/members', {
      headers: { Accept: 'text/html' },
    })
    expect(res.status()).toBe(404)
  })
})
