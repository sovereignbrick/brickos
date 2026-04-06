import { test, expect } from '@playwright/test'
import { login, authHeaders } from './helpers/auth'

const API = process.env.E2E_API_URL || 'https://api.sovereignhealth.io'
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || ''
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || ''
const USER_EMAIL = process.env.E2E_USER_EMAIL || ''
const USER_PASSWORD = process.env.E2E_USER_PASSWORD || ''

test.describe('Suite 10: Admin', () => {
  test.skip(!ADMIN_EMAIL, 'E2E_ADMIN_EMAIL not set')

  test('10.1 Admin users list endpoint', async ({ request }) => {
    const admin = await login(request, ADMIN_EMAIL, ADMIN_PASSWORD)
    const res = await request.get(`${API}/admin/users`, {
      headers: authHeaders(admin),
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.data).toBeInstanceOf(Array)
    expect(body.meta).toBeTruthy()
    expect(typeof body.meta.total).toBe('number')

    // Verify each user has expected fields
    if (body.data.length > 0) {
      const user = body.data[0]
      expect(user).toHaveProperty('email')
      expect(user).toHaveProperty('tier')
      expect(user).toHaveProperty('created_at')
    }
  })

  test('10.2 Admin users search', async ({ request }) => {
    const admin = await login(request, ADMIN_EMAIL, ADMIN_PASSWORD)
    const res = await request.get(`${API}/admin/users?search=demo`, {
      headers: authHeaders(admin),
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.data).toBeInstanceOf(Array)

    // All results should match the search term
    for (const user of body.data) {
      const matchesEmail = user.email?.toLowerCase().includes('demo')
      const matchesName = user.display_name?.toLowerCase().includes('demo')
      expect(matchesEmail || matchesName).toBeTruthy()
    }
  })

  test('10.3 Admin affiliate summary', async ({ request }) => {
    const admin = await login(request, ADMIN_EMAIL, ADMIN_PASSWORD)
    const res = await request.get(`${API}/admin/affiliate-summary`, {
      headers: authHeaders(admin),
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.data).toBeTruthy()
    expect(body.data).toHaveProperty('total_users')
    expect(body.data).toHaveProperty('affiliate_users')
    expect(body.data).toHaveProperty('direct_users')
    expect(body.data).toHaveProperty('conversion_rate')
  })

  test('10.4 Admin AI usage', async ({ request }) => {
    const admin = await login(request, ADMIN_EMAIL, ADMIN_PASSWORD)
    const res = await request.get(`${API}/admin/ai-usage`, {
      headers: authHeaders(admin),
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.data).toBeTruthy()
    expect(body.data).toHaveProperty('total_cost_eur')
    expect(body.data).toHaveProperty('total_calls')
    expect(body.data).toHaveProperty('by_user')
    expect(body.data).toHaveProperty('by_model')
    expect(body.data).toHaveProperty('by_type')
  })

  test('10.5 Admin audit logs', async ({ request }) => {
    const admin = await login(request, ADMIN_EMAIL, ADMIN_PASSWORD)
    const res = await request.get(`${API}/admin/audit/access-logs`, {
      headers: authHeaders(admin),
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.data).toBeInstanceOf(Array)
  })

  test('10.6 Admin endpoints require admin role', async ({ request }) => {
    test.skip(!USER_EMAIL, 'E2E_USER_EMAIL not set')

    const regularUser = await login(request, USER_EMAIL, USER_PASSWORD)
    const res = await request.get(`${API}/admin/users`, {
      headers: authHeaders(regularUser),
    })
    expect(res.status()).toBe(403)
  })

  test('10.7 Admin endpoints require auth', async ({ request }) => {
    const res = await request.get(`${API}/admin/users`)
    expect(res.status()).toBe(401)
  })

  test('10.8 Admin settings endpoint', async ({ request }) => {
    const admin = await login(request, ADMIN_EMAIL, ADMIN_PASSWORD)
    const res = await request.get(`${API}/admin/settings`, {
      headers: authHeaders(admin),
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    // Settings are grouped by category
    expect(body.data).toBeTruthy()
    expect(typeof body.data).toBe('object')
  })
})
