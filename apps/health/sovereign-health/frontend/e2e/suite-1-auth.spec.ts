import { test, expect } from '@playwright/test'
import { login, loginViaUI } from './helpers/auth'

const API = process.env.E2E_API_URL || 'https://api.sovereignhealth.io'
const EMAIL = process.env.E2E_USER_EMAIL || ''
const PASSWORD = process.env.E2E_USER_PASSWORD || ''

test.describe('Suite 1: Auth', () => {
  test.skip(!EMAIL, 'E2E_USER_EMAIL not set')

  test('1.1 API login returns JWT with user data', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)
    expect(user.token).toBeTruthy()
    expect(user.userId).toBeTruthy()
    expect(user.email).toBe(EMAIL)
  })

  test('1.2 token can access protected endpoint', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)
    const res = await request.get(`${API}/settings`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.data).toBeTruthy()
  })

  test('1.3 invalid credentials return 401', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: EMAIL, password: 'WrongPassword123!' },
    })
    expect(res.status()).toBe(401)
  })

  test('1.4 expired/invalid token returns 401', async ({ request }) => {
    const res = await request.get(`${API}/settings`, {
      headers: { Authorization: 'Bearer invalid_token_here' },
    })
    expect(res.status()).toBe(401)
  })

  test('1.5 UI login navigates to dashboard', async ({ page }) => {
    await loginViaUI(page, EMAIL, PASSWORD)
    await expect(page.getByText('Health Overview', { exact: false })).toBeVisible({ timeout: 10000 })
  })

  test('1.6 registration status endpoint is public', async ({ request }) => {
    const res = await request.get(`${API}/auth/registration-status`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.data).toHaveProperty('registration_enabled')
  })

  test('1.7 signup page loads', async ({ page }) => {
    await page.goto('/signup')
    // Should show signup form or early access depending on registration status
    const hasForm = await page.locator('input[type="email"]').isVisible().catch(() => false)
    const hasEarlyAccess = await page.getByText('Early Access', { exact: false }).isVisible().catch(() => false)
    expect(hasForm || hasEarlyAccess).toBeTruthy()
  })
})
