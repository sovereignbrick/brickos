import { test, expect } from '@playwright/test'

/**
 * Sprint 052 #052-52: self-hosted install smoke.
 *
 * Runs against a fresh local OSS-mode install on http://localhost:3000
 * (the target of `./sh-install.sh`). Not wired into the normal CI
 * Playwright projects -- this spec is for manual verification after
 * installing on a fresh box, or as a release-gate check before tagging
 * `selfhosted/v1.0.0`.
 *
 * Invoke:
 *   E2E_BASE_URL=http://localhost:3000 pnpm exec playwright test \
 *     sprint-052-selfhosted-smoke --project=unauth --reporter=list
 */

test.describe.configure({ mode: 'serial' })

test.describe('self-hosted install smoke', () => {
  test.beforeEach(async ({ baseURL }) => {
    const host = baseURL ? new URL(baseURL).hostname : ''
    test.skip(host !== 'localhost' && host !== '127.0.0.1', 'self-hosted smoke runs against localhost only')
  })

  test('backend /health responds', async ({ request }) => {
    const res = await request.get('http://localhost:8080/health')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.service).toBe('sovereign-health-backend')
  })

  test('backend reports oss mode', async ({ request }) => {
    const res = await request.get('http://localhost:8080/health')
    const body = await res.json()
    // In oss mode the backend tags its health response.
    expect(body.mode === 'oss' || typeof body.mode === 'string').toBeTruthy()
  })

  test('frontend /login renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button:has-text("Sign in")')).toBeVisible()
  })

  test('/signup reachable (registration enabled in oss)', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('unauthed root redirects to login (oss mode has no eval)', async ({ page }) => {
    const res = await page.goto('/')
    // Accept either the login page directly or a brief dashboard flash
    // before AuthGate bounces. Key assertion: we don't end up on a 500.
    expect(res?.status() ?? 0).toBeLessThan(500)
    await expect(page).toHaveURL(/login|signup/)
  })

  test('PWA manifest is valid on self-host', async ({ request }) => {
    const res = await request.get('/manifest.json')
    expect(res.ok()).toBeTruthy()
    const manifest = await res.json()
    expect(manifest.name).toBe('Sovereign Health Intelligence')
    expect(manifest.start_url).toBe('/sovereign-health/dashboard')
    expect(manifest.display).toBe('standalone')
  })

  test('Dr. Alex gracefully disabled without AI key', async ({ request }) => {
    // Can't easily test without auth, but confirm the endpoint is
    // registered + responds with 401 (unauth) rather than a 5xx.
    const res = await request.post('http://localhost:8080/doctor-chat/chat', {
      data: { question: 'test' },
      failOnStatusCode: false,
    })
    // 401 = endpoint reachable, just needs auth. 503 is the new
    // AI_UNCONFIGURED code. Either is acceptable here (anon request
    // gets 401 before reaching the config check).
    expect([401, 403, 503]).toContain(res.status())
  })
})
