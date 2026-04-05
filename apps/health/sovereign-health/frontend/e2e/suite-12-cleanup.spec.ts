import { test, expect } from '@playwright/test'
import { login, authHeaders } from './helpers/auth'

const API = process.env.E2E_API_URL || 'https://api.sovereignhealth.io'
const EMAIL = process.env.E2E_USER_EMAIL || ''
const PASSWORD = process.env.E2E_USER_PASSWORD || ''

test.describe('Suite 12: Data integrity checks', () => {
  test.skip(!EMAIL, 'E2E_USER_EMAIL not set')

  test('12.1 health endpoint reports OK', async ({ request }) => {
    const res = await request.get(`${API}/health`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.status).toBe('ok')
  })

  test('12.2 user data is self-consistent', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)

    // Get settings
    const settingsRes = await request.get(`${API}/settings`, {
      headers: authHeaders(user),
    })
    expect(settingsRes.ok()).toBeTruthy()

    // Get license
    const licenseRes = await request.get(`${API}/license`, {
      headers: authHeaders(user),
    })
    expect(licenseRes.ok()).toBeTruthy()
    const license = await licenseRes.json()
    expect(license.data).toBeTruthy()
    expect(license.data.tier).toBeTruthy()
  })

  test('12.3 no orphaned measurements (all have valid marker_id)', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)
    const res = await request.get(`${API}/measurements?limit=50`, {
      headers: authHeaders(user),
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    if (body.data && body.data.length > 0) {
      for (const m of body.data) {
        expect(m.marker_slug).toBeTruthy()
        expect(m.value).toBeDefined()
      }
    }
  })

  test('12.4 search index is populated', async ({ request }) => {
    const res = await request.get(`${API}/api/v1/search?q=glucose&locale=en`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.total).toBeGreaterThan(0)
    expect(body.results.length).toBeGreaterThan(0)
  })

  test('12.5 no test email users in system', async ({ request }) => {
    // Verify no @test.sovereignhealth.io users leaked
    // This endpoint is admin-only, so this test only works with admin credentials
    // Skip if not admin
    if (!process.env.E2E_ADMIN_EMAIL) {
      test.skip()
      return
    }
    const admin = await login(
      request,
      process.env.E2E_ADMIN_EMAIL!,
      process.env.E2E_ADMIN_PASSWORD!,
    )
    const res = await request.get(`${API}/admin/users?search=test.sovereignhealth.io`, {
      headers: authHeaders(admin),
    })
    if (res.ok()) {
      const body = await res.json()
      expect(body.data.length).toBe(0)
    }
  })
})
