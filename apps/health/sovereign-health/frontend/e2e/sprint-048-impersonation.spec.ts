import { test, expect, type APIRequestContext } from '@playwright/test'

/**
 * Sprint 048 end-to-end impersonation flow tests.
 *
 * Only runs against localhost (the fixture expects deterministic
 * patient user_ids seeded by ops/fixtures/002_test_users.sql). Against
 * staging / prod it self-skips.
 *
 *   E2E_BASE_URL=http://localhost:3000 npx playwright test \
 *     sprint-048-impersonation --project=unauth --reporter=list
 */

const TEST_CLINIC_ORG_ID = '00000000-0000-4001-a001-000000000001'
const ANNA_ID = '00000000-0000-4002-b002-000000000001'

const ADMIN_EMAIL = 'test-clinic-admin@clinic.com'
const ADMIN_PASSWORD = 'TestClinicAdmin1'
const ANNA_EMAIL = 'anna.meier@patients.clinic.com'
const ANNA_PASSWORD = 'TestPatient1'

function backendUrl(baseURL: string | undefined): string {
  if (!baseURL) return ''
  const host = new URL(baseURL).hostname
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:8080'
  return baseURL // path-mount on staging/prod
}

async function login(
  request: APIRequestContext,
  baseURL: string | undefined,
  email: string,
  password: string,
  orgDomain?: string,
): Promise<string> {
  const url = `${backendUrl(baseURL)}/auth/login`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (orgDomain) headers['X-Org-Domain'] = orgDomain
  const res = await request.post(url, {
    data: { email, password },
    headers,
  })
  expect(res.ok(), `login failed for ${email}`).toBeTruthy()
  const body = await res.json()
  return body.data.token
}

// Serial mode -- every test logs in as the admin and/or Anna, which
// trips the backend auth rate limiter (10/hour per IP) when Playwright
// runs the describe's tests in parallel.
test.describe.configure({ mode: 'serial' })

// Shared tokens across all tests in this file to stay under the 10/hr
// per-IP auth rate limit. Populated on demand by getTokens().
let cachedAdminToken: string | null = null
let cachedAnnaToken: string | null = null
async function getTokens(
  request: APIRequestContext,
  baseURL: string | undefined,
): Promise<{ admin: string; anna: string }> {
  if (!cachedAdminToken) {
    cachedAdminToken = await login(
      request,
      baseURL,
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
      'test-clinic.brickos.io',
    )
  }
  if (!cachedAnnaToken) {
    cachedAnnaToken = await login(request, baseURL, ANNA_EMAIL, ANNA_PASSWORD)
  }
  return { admin: cachedAdminToken, anna: cachedAnnaToken }
}

test.describe('Sprint 048 -- patient consent API', () => {
  test.beforeEach(async ({ baseURL }) => {
    const host = baseURL ? new URL(baseURL).hostname : ''
    test.skip(
      host !== 'localhost' && host !== '127.0.0.1',
      'fixture-dependent; localhost only',
    )
  })

  test('grant -> list shows is_granted=true, revoke -> false', async ({ request, baseURL }) => {
    const token = (await getTokens(request, baseURL)).anna
    const auth = { Authorization: `Bearer ${token}` }
    const api = backendUrl(baseURL)

    // Revoke first to normalise state.
    await request.post(`${api}/user/organization-access/${TEST_CLINIC_ORG_ID}/revoke`, {
      headers: auth,
    })

    // Grant.
    const grantRes = await request.post(
      `${api}/user/organization-access/${TEST_CLINIC_ORG_ID}/grant`,
      { headers: auth },
    )
    expect(grantRes.ok()).toBeTruthy()

    // List.
    const listRes = await request.get(`${api}/user/organization-access`, { headers: auth })
    const list = (await listRes.json()).data
    const testClinic = list.find((o: { org_id: string }) => o.org_id === TEST_CLINIC_ORG_ID)
    expect(testClinic?.is_granted).toBe(true)
    expect(testClinic?.granted_at).toBeTruthy()

    // Revoke.
    await request.post(`${api}/user/organization-access/${TEST_CLINIC_ORG_ID}/revoke`, {
      headers: auth,
    })
    const list2 = (await (await request.get(`${api}/user/organization-access`, { headers: auth })).json()).data
    const testClinic2 = list2.find((o: { org_id: string }) => o.org_id === TEST_CLINIC_ORG_ID)
    expect(testClinic2?.is_granted).toBe(false)
  })
})

test.describe('Sprint 048 -- practitioner caseload consent filter', () => {
  test.beforeEach(async ({ baseURL }) => {
    const host = baseURL ? new URL(baseURL).hostname : ''
    test.skip(host !== 'localhost' && host !== '127.0.0.1', 'localhost only')
  })

  test('consent gates caseload visibility', async ({ request, baseURL }) => {
    const annaToken = (await getTokens(request, baseURL)).anna
    const adminToken = (await getTokens(request, baseURL)).admin
    const api = backendUrl(baseURL)

    // Revoke Anna's consent.
    await request.post(`${api}/user/organization-access/${TEST_CLINIC_ORG_ID}/revoke`, {
      headers: { Authorization: `Bearer ${annaToken}` },
    })

    // Caseload should be empty.
    const caseloadRevoked = await (await request.get(`${api}/practitioner/members`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'X-Org-Domain': 'test-clinic.brickos.io' },
    })).json()
    expect(caseloadRevoked.data.find((m: { user_id: string }) => m.user_id === ANNA_ID)).toBeUndefined()

    // Grant Anna's consent.
    await request.post(`${api}/user/organization-access/${TEST_CLINIC_ORG_ID}/grant`, {
      headers: { Authorization: `Bearer ${annaToken}` },
    })

    // Caseload should now include Anna.
    const caseloadGranted = await (await request.get(`${api}/practitioner/members`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'X-Org-Domain': 'test-clinic.brickos.io' },
    })).json()
    const anna = caseloadGranted.data.find((m: { user_id: string }) => m.user_id === ANNA_ID)
    expect(anna).toBeDefined()
    expect(anna.consent_granted_at).toBeTruthy()
  })
})

test.describe('Sprint 048 -- impersonation session lifecycle', () => {
  test.beforeEach(async ({ baseURL }) => {
    const host = baseURL ? new URL(baseURL).hostname : ''
    test.skip(host !== 'localhost' && host !== '127.0.0.1', 'localhost only')
  })

  test('start requires consent (404 when revoked, session id when granted)', async ({ request, baseURL }) => {
    const annaToken = (await getTokens(request, baseURL)).anna
    const adminToken = (await getTokens(request, baseURL)).admin
    const api = backendUrl(baseURL)

    await request.post(`${api}/user/organization-access/${TEST_CLINIC_ORG_ID}/revoke`, {
      headers: { Authorization: `Bearer ${annaToken}` },
    })

    // Without consent: 404.
    const res404 = await request.post(`${api}/practitioner/impersonate/start`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-Org-Domain': 'test-clinic.brickos.io',
      },
      data: { patient_user_id: ANNA_ID },
    })
    expect(res404.status()).toBe(404)

    // With consent: 200 + session_id.
    await request.post(`${api}/user/organization-access/${TEST_CLINIC_ORG_ID}/grant`, {
      headers: { Authorization: `Bearer ${annaToken}` },
    })
    const res200 = await request.post(`${api}/practitioner/impersonate/start`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-Org-Domain': 'test-clinic.brickos.io',
      },
      data: { patient_user_id: ANNA_ID },
    })
    expect(res200.ok()).toBeTruthy()
    const body = await res200.json()
    expect(body.data.session_id).toMatch(/^[0-9a-f-]{36}$/)
    expect(body.data.patient_user_id).toBe(ANNA_ID)
  })

  test('effective-user swap: /auth/me returns patient with valid token, practitioner without', async ({ request, baseURL }) => {
    const annaToken = (await getTokens(request, baseURL)).anna
    const adminToken = (await getTokens(request, baseURL)).admin
    const api = backendUrl(baseURL)

    await request.post(`${api}/user/organization-access/${TEST_CLINIC_ORG_ID}/grant`, {
      headers: { Authorization: `Bearer ${annaToken}` },
    })
    const start = await (await request.post(`${api}/practitioner/impersonate/start`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-Org-Domain': 'test-clinic.brickos.io',
      },
      data: { patient_user_id: ANNA_ID },
    })).json()
    const session = start.data.session_id

    // Without the token: practitioner.
    const pracMe = await (await request.get(`${api}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })).json()
    expect(pracMe.data.email).toBe(ADMIN_EMAIL)

    // With the token: swapped to Anna.
    const annaMe = await (await request.get(`${api}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'X-Impersonation-Token': session },
    })).json()
    expect(annaMe.data.email).toBe(ANNA_EMAIL)
    expect(annaMe.data.id).toBe(ANNA_ID)
  })

  test('scope gate: hard-excluded (doctor-chat) 403 + blocked write 403', async ({ request, baseURL }) => {
    const annaToken = (await getTokens(request, baseURL)).anna
    const adminToken = (await getTokens(request, baseURL)).admin
    const api = backendUrl(baseURL)

    await request.post(`${api}/user/organization-access/${TEST_CLINIC_ORG_ID}/grant`, {
      headers: { Authorization: `Bearer ${annaToken}` },
    })
    const start = await (await request.post(`${api}/practitioner/impersonate/start`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-Org-Domain': 'test-clinic.brickos.io',
      },
      data: { patient_user_id: ANNA_ID },
    })).json()
    const session = start.data.session_id
    const authed = {
      Authorization: `Bearer ${adminToken}`,
      'X-Impersonation-Token': session,
    }

    // Hard-excluded: Doctor Chat
    const chatRes = await request.get(`${api}/doctor-chat/quota`, { headers: authed })
    expect(chatRes.status()).toBe(403)
    expect((await chatRes.json()).error.code).toBe('impersonation_out_of_scope')

    // Blocked write: POST /measurements
    const writeRes = await request.post(`${api}/measurements`, {
      headers: { ...authed, 'Content-Type': 'application/json' },
      data: {},
    })
    expect(writeRes.status()).toBe(403)
    expect((await writeRes.json()).error.code).toBe('impersonation_readonly')
  })

  test('invalid session token: no swap (falls back to practitioner)', async ({ request, baseURL }) => {
    const adminToken = (await getTokens(request, baseURL)).admin
    const api = backendUrl(baseURL)
    const res = await (await request.get(`${api}/auth/me`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'X-Impersonation-Token': '00000000-1111-2222-3333-444444444444',
      },
    })).json()
    expect(res.data.email).toBe(ADMIN_EMAIL)
  })

  test('revoking consent mid-session kills the swap on next request', async ({ request, baseURL }) => {
    const annaToken = (await getTokens(request, baseURL)).anna
    const adminToken = (await getTokens(request, baseURL)).admin
    const api = backendUrl(baseURL)

    await request.post(`${api}/user/organization-access/${TEST_CLINIC_ORG_ID}/grant`, {
      headers: { Authorization: `Bearer ${annaToken}` },
    })
    const start = await (await request.post(`${api}/practitioner/impersonate/start`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-Org-Domain': 'test-clinic.brickos.io',
      },
      data: { patient_user_id: ANNA_ID },
    })).json()
    const session = start.data.session_id

    // First: swap works.
    const before = await (await request.get(`${api}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'X-Impersonation-Token': session },
    })).json()
    expect(before.data.email).toBe(ANNA_EMAIL)

    // Revoke.
    await request.post(`${api}/user/organization-access/${TEST_CLINIC_ORG_ID}/revoke`, {
      headers: { Authorization: `Bearer ${annaToken}` },
    })

    // Same token, same request, now falls back to practitioner.
    const after = await (await request.get(`${api}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'X-Impersonation-Token': session },
    })).json()
    expect(after.data.email).toBe(ADMIN_EMAIL)

    // Clean up for next run.
    await request.post(`${api}/user/organization-access/${TEST_CLINIC_ORG_ID}/grant`, {
      headers: { Authorization: `Bearer ${annaToken}` },
    })
  })

  test('exit ends the session: subsequent reads fall back', async ({ request, baseURL }) => {
    const annaToken = (await getTokens(request, baseURL)).anna
    const adminToken = (await getTokens(request, baseURL)).admin
    const api = backendUrl(baseURL)

    await request.post(`${api}/user/organization-access/${TEST_CLINIC_ORG_ID}/grant`, {
      headers: { Authorization: `Bearer ${annaToken}` },
    })
    const start = await (await request.post(`${api}/practitioner/impersonate/start`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-Org-Domain': 'test-clinic.brickos.io',
      },
      data: { patient_user_id: ANNA_ID },
    })).json()
    const session = start.data.session_id

    // Exit.
    const exitRes = await request.post(`${api}/practitioner/impersonate/exit`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      data: { session_id: session },
    })
    expect(exitRes.ok()).toBeTruthy()

    // Next request with the same token: no swap.
    const after = await (await request.get(`${api}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'X-Impersonation-Token': session },
    })).json()
    expect(after.data.email).toBe(ADMIN_EMAIL)
  })
})
