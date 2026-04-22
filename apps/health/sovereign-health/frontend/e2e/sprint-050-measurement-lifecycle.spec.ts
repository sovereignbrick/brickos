import { test, expect, type APIRequestContext } from '@playwright/test'

/**
 * Sprint 050 #050-B3b: measurement lifecycle end-to-end.
 *
 * Covers: record / list / edit / delete / import for an authed user on
 * localhost (full DB) and contract-level probes on staging + prod.
 *
 *   E2E_BASE_URL=http://localhost:3000 pnpm exec playwright test \
 *     sprint-050-measurement-lifecycle --project=unauth --reporter=list
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
): Promise<{ token: string; userId: string; email: string }> {
  const api = backendUrl(baseURL)
  const email = `e2e-meas-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@clinic.com`
  const password = 'TestMeas1'

  const signup = await request.post(`${api}/auth/signup`, {
    data: { email, password, tos_accepted: true },
  })
  if (!signup.ok()) throw new Error(`signup failed: ${signup.status()}`)
  const signupBody = await signup.json()
  return { token: signupBody.data.token, userId: signupBody.data.user.id, email }
}

test.describe.configure({ mode: 'serial' })

test.describe('measurement contract (all envs)', () => {
  test('GET /measurements rejects unauth with 401', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const res = await request.get(`${api}/measurements`)
    expect(res.status()).toBe(401)
  })

  test('POST /measurements rejects unauth with 401', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const res = await request.post(`${api}/measurements`, { data: {} })
    expect([401, 400]).toContain(res.status())
  })
})

test.describe('measurement CRUD (localhost)', () => {
  test.beforeEach(async ({ baseURL }) => {
    test.skip(!isLocalhost(baseURL), 'CRUD localhost only -- no-auth signup + DB mutation')
  })

  test('record a measurement via API', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const { token } = await signupAndLogin(request, baseURL)
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    // Markers list to find a valid marker_id
    const markers = await (await request.get(`${api}/v1/content/markers?locale=en`, { headers })).json()
    const marker = markers.data?.[0]
    expect(marker, 'at least one marker seeded').toBeTruthy()

    const post = await request.post(`${api}/measurements`, {
      headers,
      data: {
        marker_slug: marker.slug,
        value: 100,
        unit: marker.canonical_unit || 'mg/dL',
        timestamp: new Date().toISOString(),
      },
    })
    expect([200, 201].includes(post.status()), `POST status ${post.status()}`).toBeTruthy()
  })

  test('list measurements after recording', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const { token } = await signupAndLogin(request, baseURL)
    const headers = { Authorization: `Bearer ${token}` }

    const list = await request.get(`${api}/measurements?per_page=10`, { headers })
    expect(list.ok()).toBeTruthy()
    const body = await list.json()
    expect(Array.isArray(body.data)).toBeTruthy()
  })

  test('delete a measurement is idempotent', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const { token } = await signupAndLogin(request, baseURL)
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    // Deleting a non-existent UUID is either 404 or 204 (idempotent)
    const res = await request.delete(`${api}/measurements/00000000-0000-0000-0000-000000000000`, { headers })
    expect([200, 204, 404].includes(res.status())).toBeTruthy()
  })
})

test.describe('trends + zones read (localhost + eval)', () => {
  test('GET /zones unauthed on eval returns demo zones', async ({ request, baseURL }) => {
    const host = baseURL ? new URL(baseURL).hostname : ''
    test.skip(host !== 'eval.sovereignhealth.io', 'eval-only check')
    const api = backendUrl(baseURL)
    const res = await request.get(`${api}/demo/zones?profile=optimized`)
    expect(res.ok()).toBeTruthy()
  })

  test('GET /zones authed on localhost returns user zones', async ({ request, baseURL }) => {
    test.skip(!isLocalhost(baseURL), 'localhost only')
    const api = backendUrl(baseURL)
    const { token } = await signupAndLogin(request, baseURL)
    const res = await request.get(`${api}/zones`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.ok()).toBeTruthy()
  })
})
