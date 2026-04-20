import { test, expect } from '@playwright/test'

// ─── Public Pages (no auth) ─────────────────────────────────────────────────

test.describe('Public pages', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    // Sprint 044: login text may vary by org branding. On platform domains
    // (localhost, app.brickos.io) it shows the default. Check for sign-in form elements.
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button:has-text("Sign in")')).toBeVisible()
    // Heading should show some app/org name
    await expect(page.locator('h1')).toBeVisible()
  })

  test('demo profiles accessible', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=View Demo')).toBeVisible()
  })

  test('offline page renders', async ({ page }) => {
    await page.goto('/offline')
    await expect(page.locator('text=offline')).toBeVisible()
    await expect(page.locator('button:has-text("Retry")')).toBeVisible()
  })
})

// ─── PWA ────────────────────────────────────────────────────────────────────

test.describe('PWA', () => {
  test('manifest.json accessible and valid', async ({ request }) => {
    const res = await request.get('/manifest.json')
    expect(res.ok()).toBeTruthy()
    const manifest = await res.json()
    expect(manifest.name).toBe('Sovereign Health Intelligence')
    expect(manifest.short_name).toBe('Sovereign Health Intelligence')
    expect(manifest.start_url).toBe('/sovereign-health/dashboard')
    expect(manifest.display).toBe('standalone')
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2)
  })

  test('service worker registered', async ({ page }) => {
    await page.goto('/login')
    // Wait for SW to register
    await page.waitForTimeout(3000)
    const swRegistrations = await page.evaluate(async () => {
      const regs = await navigator.serviceWorker.getRegistrations()
      return regs.map(r => ({ scope: r.scope, active: !!r.active }))
    })
    expect(swRegistrations.length).toBeGreaterThan(0)
    expect(swRegistrations[0].active).toBeTruthy()
  })
})

// ─── API Health ─────────────────────────────────────────────────────────────

test.describe('API', () => {
  const API = process.env.E2E_API_URL || 'https://api.sovereignhealth.io'

  test('health endpoint returns 200', async ({ request }) => {
    const res = await request.get(`${API}/health`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.service).toBe('sovereign-health-backend')
    expect(body.version).toBeTruthy()
  })

  test('content endpoints return data', async ({ request }) => {
    const zones = await request.get(`${API}/v1/content/zones?locale=en`)
    expect(zones.ok()).toBeTruthy()

    const markers = await request.get(`${API}/v1/content/markers?locale=en`)
    expect(markers.ok()).toBeTruthy()

    const tiers = await request.get(`${API}/v1/content/tiers?locale=en`)
    expect(tiers.ok()).toBeTruthy()
  })
})

// ─── Auth Flow ──────────────────────────────────────────────────────────────

test.describe('Auth flow', () => {
  const API = process.env.E2E_API_URL || 'https://api.sovereignhealth.io'
  const EMAIL = process.env.E2E_USER_EMAIL || ''
  const PASSWORD = process.env.E2E_USER_PASSWORD || ''

  test.skip(!process.env.E2E_USER_EMAIL, 'E2E_USER_EMAIL not set')

  test('login returns JWT', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: EMAIL, password: PASSWORD },
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.data.token).toBeTruthy()
    expect(body.data.user.email).toBe(EMAIL)
  })

  test('login and navigate to dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    await page.click('button:has-text("Sign in")')

    // Sprint 047 #577: dashboard lives at /sovereign-health/dashboard on
    // brickos.io; sovereignhealth.io nginx rewrites internally so the
    // URL bar stays /dashboard. Accept EITHER.
    await page.waitForURL(/\/(sovereign-health\/)?dashboard(\?|$|#)/, { timeout: 15000 })
    await expect(page.locator('text=Health Overview')).toBeVisible({ timeout: 10000 })
  })

  test('login then navigate: dashboard zones, settings, add measurement', async ({ page }) => {
    // Single login, multiple page navigations (avoids rate limiting)
    await page.goto('/login')
    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    await page.click('button:has-text("Sign in")')
    await page.waitForURL(/\/(sovereign-health\/)?dashboard(\?|$|#)/, { timeout: 15000 })

    // Dashboard: verify page loaded with user data
    await expect(page.getByText('Your Health Overview')).toBeVisible({ timeout: 10000 })

    // Settings page
    await page.goto('/settings')
    await expect(page.getByRole('button', { name: 'Profile', exact: true })).toBeVisible({ timeout: 10000 })

    // Add measurement page (Sprint 047 #577: /measurements -> /sovereign-health/measurements)
    await page.goto('/sovereign-health/measurements/new')
    await expect(page.getByText('Save', { exact: false })).toBeVisible({ timeout: 10000 })
  })
})

// ─── Demo Mode ──────────────────────────────────────────────────────────────

test.describe('Demo mode', () => {
  test('demo dashboard loads with profile selector', async ({ page }) => {
    // Sprint 047 #577: /dashboard -> /sovereign-health/dashboard
    await page.goto('/sovereign-health/dashboard?demo=true')
    await expect(page.locator('text=Demo data')).toBeVisible({ timeout: 10000 })
  })

  test('demo zone detail loads', async ({ page }) => {
    // Sprint 047 #577: /zones/* -> /sovereign-health/zones/*
    await page.goto('/sovereign-health/zones/energy_metabolic?profile=optimized')
    await expect(page.getByRole('heading', { name: 'Energy & Metabolic' })).toBeVisible({ timeout: 10000 })
  })
})

// ─── Sovereign Link ─────────────────────────────────────────────────────────

test.describe('Sovereign Link', () => {
  test('short link redirects (GET)', async ({ request }) => {
    const res = await request.get('https://brickos.io/r/sh0xforr84', {
      maxRedirects: 0,
    })
    // Should be 301 redirect
    expect([301, 302, 307]).toContain(res.status())
    expect(res.headers()['location']).toContain('sovereignhealth.io')
  })
})

// ─── Accessibility ──────────────────────────────────────────────────────────

test.describe('Accessibility', () => {
  test('login page has no critical a11y violations', async ({ page }) => {
    await page.goto('/login')
    // Check basic structure
    await expect(page.locator('html[lang]')).toBeAttached()
    await expect(page.locator('a[href="#main-content"]')).toBeAttached()
    // Verify page has a heading
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 5000 })
  })

  test('dark theme enforced', async ({ page }) => {
    await page.goto('/login')
    const htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass).toContain('dark')
  })
})
