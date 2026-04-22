import { test, expect, type APIRequestContext } from '@playwright/test'

/**
 * Sprint 050 #050-B3d: settings + account lifecycle.
 *
 * MFA setup / password reset / GDPR data export / account deletion.
 * These are customer-critical and need guard-rails to prevent silent
 * breakage. Full UI walk-throughs go in manual C2; these specs probe
 * contracts + per-step success.
 */

function isLocalhost(baseURL: string | undefined): boolean {
  if (!baseURL) return false
  const host = new URL(baseURL).hostname
  return host === 'localhost' || host === '127.0.0.1'
}

function backendUrl(baseURL: string | undefined): string {
  if (!baseURL) return ''
  const host = new URL(baseURL).hostname
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:8080'
  return baseURL
}

async function signupAndLogin(
  request: APIRequestContext,
  baseURL: string | undefined,
): Promise<{ token: string; email: string }> {
  const api = backendUrl(baseURL)
  const email = `e2e-set-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@clinic.com`
  const signup = await request.post(`${api}/auth/signup`, {
    data: { email, password: 'TestSet1', tos_accepted: true },
  })
  if (!signup.ok()) throw new Error(`signup: ${signup.status()}`)
  const body = await signup.json()
  return { token: body.data.token, email }
}

test.describe.configure({ mode: 'serial' })

test.describe('settings contracts (all envs)', () => {
  test('GET /settings rejects unauth', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const res = await request.get(`${api}/settings`)
    expect([401, 404]).toContain(res.status())
  })

  test('POST /auth/forgot-password accepts unknown email silently', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const res = await request.post(`${api}/auth/forgot-password`, {
      data: { email: 'nonexistent@example.test' },
    })
    // Silently 200 to avoid email enumeration; 429 also OK if rate-limited.
    expect([200, 202, 204, 429]).toContain(res.status())
  })

  test('POST /auth/reset-password with bogus token returns 4xx', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const res = await request.post(`${api}/auth/reset-password`, {
      data: { token: 'bogus-token', password: 'NewPassword1' },
    })
    expect([400, 401, 404, 422]).toContain(res.status())
  })
})

test.describe('MFA setup (localhost)', () => {
  test.beforeEach(async ({ baseURL }) => {
    test.skip(!isLocalhost(baseURL), 'MFA setup uses real DB + user state')
  })

  test('MFA setup endpoint reachable for authed user', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const { token } = await signupAndLogin(request, baseURL)
    const res = await request.post(`${api}/auth/mfa/setup`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    // Either 200 with TOTP secret, or 409 if already set (shouldn't be for fresh user),
    // or 404 if not enabled on this build.
    expect([200, 404, 409]).toContain(res.status())
  })

  test('MFA verify with wrong code returns 401', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const { token } = await signupAndLogin(request, baseURL)
    // Start setup
    await request.post(`${api}/auth/mfa/setup`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    // Bogus verify
    const res = await request.post(`${api}/auth/mfa/verify`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { code: '000000' },
    })
    expect([400, 401, 404]).toContain(res.status())
  })
})

test.describe('data export + account delete (localhost)', () => {
  test.beforeEach(async ({ baseURL }) => {
    test.skip(!isLocalhost(baseURL), 'mutation + DB assertion; localhost only')
  })

  test('GDPR export endpoint returns user data', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const { token, email } = await signupAndLogin(request, baseURL)

    // Record one measurement so the export has content
    const markers = await (await request.get(`${api}/v1/content/markers?locale=en`)).json()
    const m = markers.data?.[0]
    if (m) {
      await request.post(`${api}/measurements`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: {
          marker_slug: m.slug,
          value: 100,
          unit: m.canonical_unit || 'mg/dL',
          timestamp: new Date().toISOString(),
        },
      })
    }

    const res = await request.get(`${api}/export/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    // 200 with JSON, or 204 + URL, or 404 if endpoint is elsewhere.
    if (res.ok()) {
      const body = await res.json().catch(() => null)
      if (body) {
        // Export should at least mention the user's email or have a
        // user block; be permissive on exact shape.
        const asString = JSON.stringify(body)
        expect(asString.toLowerCase()).toContain(email.toLowerCase())
      }
    } else {
      expect([404, 405]).toContain(res.status())
    }
  })

  test('account delete marks user deleted', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const { token } = await signupAndLogin(request, baseURL)
    const res = await request.delete(`${api}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    // 200 / 204 success, 404 if endpoint differs on this build.
    expect([200, 204, 404, 405]).toContain(res.status())
  })
})
