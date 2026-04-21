import { test, expect, type APIRequestContext } from '@playwright/test'

/**
 * Sprint 048 end-to-end impersonation flow tests.
 *
 * Runs against localhost and staging. IDs (TEST_CLINIC_ORG_ID, ANNA_ID)
 * are looked up by business key (slug / email) at startup, so the spec
 * is UUID-agnostic and works anywhere the fixtures are applied.
 *
 * Prereqs on the target environment:
 *   - `ops/fixtures/001_test_clinic_org.sql` applied (creates
 *     organizations.slug = 'test-clinic')
 *   - `ops/fixtures/002_test_users.sql` applied (test-clinic-admin
 *     and anna.meier users exist with fixture passwords)
 *
 *   Localhost:
 *     E2E_BASE_URL=http://localhost:3000 pnpm exec playwright test \
 *       sprint-048-impersonation --project=unauth --reporter=list
 *
 *   Staging:
 *     E2E_BASE_URL=https://test-clinic.demo.brickos.io pnpm exec playwright test \
 *       sprint-048-impersonation --project=unauth --reporter=list
 */

const ADMIN_EMAIL = 'test-clinic-admin@clinic.com'
const ADMIN_PASSWORD = process.env.E2E_TEST_CLINIC_PASSWORD || 'TestClinicAdmin1'
const ANNA_EMAIL = 'anna.meier@patients.clinic.com'
const ANNA_PASSWORD = process.env.E2E_TEST_PATIENT_PASSWORD || 'TestPatient1'

function backendUrl(baseURL: string | undefined): string {
  if (!baseURL) return ''
  const host = new URL(baseURL).hostname
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:8080'
  return baseURL // path-mount on staging/prod
}

// The `X-Org-Domain` header the backend's org_resolver uses to scope
// queries to test-clinic. On localhost this is the virtual subdomain
// `test-clinic.brickos.io`; on staging the equivalent is
// `test-clinic.demo.brickos.io`. Picked from baseURL so the same spec
// works against either.
function testClinicOrgDomain(baseURL: string | undefined): string {
  if (!baseURL) return 'test-clinic.brickos.io'
  const host = new URL(baseURL).hostname
  if (host === 'localhost' || host === '127.0.0.1') return 'test-clinic.brickos.io'
  // Staging: test-clinic.demo.brickos.io / test-clinic.demo.sovereignhealth.io / ...
  // Use the baseURL hostname verbatim (spec is typically pointed at
  // test-clinic.<something>).
  if (host.startsWith('test-clinic.')) return host
  return 'test-clinic.brickos.io'
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
      testClinicOrgDomain(baseURL),
    )
  }
  if (!cachedAnnaToken) {
    cachedAnnaToken = await login(request, baseURL, ANNA_EMAIL, ANNA_PASSWORD)
  }
  return { admin: cachedAdminToken, anna: cachedAnnaToken }
}

// Resolves test-clinic org id + Anna's user id by business key. Same
// spec works across environments where these UUIDs differ.
let cachedIds: { orgId: string; annaId: string } | null = null
async function getIds(
  request: APIRequestContext,
  baseURL: string | undefined,
): Promise<{ orgId: string; annaId: string }> {
  if (!cachedIds) {
    const { anna } = await getTokens(request, baseURL)
    const api = backendUrl(baseURL)
    const headers = { Authorization: `Bearer ${anna}` }
    const me = (await (await request.get(`${api}/auth/me`, { headers })).json()).data
    const access = (await (await request.get(`${api}/user/organization-access`, { headers })).json()).data
    const testClinic = access.find((o: { org_slug: string }) => o.org_slug === 'test-clinic')
    if (!testClinic) {
      throw new Error(
        'test-clinic not present in Anna\'s organization-access list. ' +
          'Apply ops/fixtures/001_test_clinic_org.sql and 002_test_users.sql first.',
      )
    }
    cachedIds = { orgId: testClinic.org_id, annaId: me.id }
  }
  return cachedIds
}

test.describe('Sprint 048 -- patient consent API', () => {
  test('grant -> list shows is_granted=true, revoke -> false', async ({ request, baseURL }) => {
    const token = (await getTokens(request, baseURL)).anna
    const { orgId } = await getIds(request, baseURL)
    const auth = { Authorization: `Bearer ${token}` }
    const api = backendUrl(baseURL)

    // Revoke first to normalise state.
    await request.post(`${api}/user/organization-access/${orgId}/revoke`, {
      headers: auth,
    })

    // Grant.
    const grantRes = await request.post(
      `${api}/user/organization-access/${orgId}/grant`,
      { headers: auth },
    )
    expect(grantRes.ok()).toBeTruthy()

    // List.
    const listRes = await request.get(`${api}/user/organization-access`, { headers: auth })
    const list = (await listRes.json()).data
    const testClinic = list.find((o: { org_id: string }) => o.org_id === orgId)
    expect(testClinic?.is_granted).toBe(true)
    expect(testClinic?.granted_at).toBeTruthy()

    // Revoke.
    await request.post(`${api}/user/organization-access/${orgId}/revoke`, {
      headers: auth,
    })
    const list2 = (await (await request.get(`${api}/user/organization-access`, { headers: auth })).json()).data
    const testClinic2 = list2.find((o: { org_id: string }) => o.org_id === orgId)
    expect(testClinic2?.is_granted).toBe(false)
  })
})

test.describe('Sprint 048 -- practitioner caseload consent filter', () => {
  test('consent gates caseload visibility', async ({ request, baseURL }) => {
    const annaToken = (await getTokens(request, baseURL)).anna
    const adminToken = (await getTokens(request, baseURL)).admin
    const { orgId, annaId } = await getIds(request, baseURL)
    const api = backendUrl(baseURL)
    const orgDomain = testClinicOrgDomain(baseURL)

    // Revoke Anna's consent.
    await request.post(`${api}/user/organization-access/${orgId}/revoke`, {
      headers: { Authorization: `Bearer ${annaToken}` },
    })

    // Caseload should be empty.
    const caseloadRevoked = await (await request.get(`${api}/practitioner/members`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'X-Org-Domain': orgDomain },
    })).json()
    expect(caseloadRevoked.data.find((m: { user_id: string }) => m.user_id === annaId)).toBeUndefined()

    // Grant Anna's consent.
    await request.post(`${api}/user/organization-access/${orgId}/grant`, {
      headers: { Authorization: `Bearer ${annaToken}` },
    })

    // Caseload should now include Anna.
    const caseloadGranted = await (await request.get(`${api}/practitioner/members`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'X-Org-Domain': orgDomain },
    })).json()
    const anna = caseloadGranted.data.find((m: { user_id: string }) => m.user_id === annaId)
    expect(anna).toBeDefined()
    expect(anna.consent_granted_at).toBeTruthy()
  })
})

test.describe('Sprint 048 -- invite-by-email flow (#048-30)', () => {
  test('create invite -> public lookup -> signup joins org', async ({ request, baseURL }) => {
    const adminToken = (await getTokens(request, baseURL)).admin
    const api = backendUrl(baseURL)
    const orgDomain = testClinicOrgDomain(baseURL)
    const uniqueEmail = `invite-e2e-${Date.now()}@clinic.com`

    // Clean slate.
    await request.post(`${api}/auth/login`, {
      data: { email: 'x', password: 'x' }, // trigger rate limiter? no, just to check server is up
    }).catch(() => null)

    // 1. Admin creates the invite.
    const createRes = await request.post(`${api}/org-settings/invites`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-Org-Domain': orgDomain,
      },
      data: { email: uniqueEmail, role: 'member' },
    })
    expect(createRes.ok()).toBeTruthy()
    const { data: invite } = await createRes.json()
    expect(invite.token).toMatch(/^[0-9a-f-]{36}$/)
    expect(invite.signup_path).toBe(`/signup?invite=${invite.token}`)

    // 2. Public lookup (no auth) returns enough info for the signup page.
    const publicRes = await request.get(`${api}/signup/invite/${invite.token}`)
    expect(publicRes.ok()).toBeTruthy()
    const publicInfo = (await publicRes.json()).data
    expect(publicInfo.email).toBe(uniqueEmail)
    expect(publicInfo.org_name).toBe('Test Clinic')
    expect(publicInfo.role).toBe('member')

    // 3. Signup with the token.
    const signupRes = await request.post(
      `${api}/auth/signup?invite=${invite.token}`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          email: uniqueEmail,
          password: 'TestPatient1',
          display_name: 'E2E Test Invitee',
          tos_accepted: true,
        },
      },
    )
    expect([200, 201].includes(signupRes.status())).toBeTruthy()

    // 4. Second public lookup should 404 (invite accepted).
    const lookupAfter = await request.get(`${api}/signup/invite/${invite.token}`)
    expect(lookupAfter.status()).toBe(404)

    // 5. Admin members list now shows the new user.
    const membersRes = await request.get(`${api}/org-settings/members`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'X-Org-Domain': orgDomain,
      },
    })
    const { data: members } = await membersRes.json()
    const invited = members.find((m: { email: string }) => m.email === uniqueEmail)
    expect(invited).toBeDefined()
    expect(invited.role).toBe('member')
  })

  test('public lookup with bogus token returns 404', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const res = await request.get(`${api}/signup/invite/00000000-0000-0000-0000-000000000000`)
    expect(res.status()).toBe(404)
  })

  test('admin can list + cancel pending invites', async ({ request, baseURL }) => {
    const adminToken = (await getTokens(request, baseURL)).admin
    const api = backendUrl(baseURL)
    const uniqueEmail = `cancel-e2e-${Date.now()}@clinic.com`
    const authed = {
      Authorization: `Bearer ${adminToken}`,
      'X-Org-Domain': testClinicOrgDomain(baseURL),
    }

    // Create.
    const create = await request.post(`${api}/org-settings/invites`, {
      headers: { ...authed, 'Content-Type': 'application/json' },
      data: { email: uniqueEmail, role: 'practitioner' },
    })
    const { data: invite } = await create.json()

    // List includes it.
    const list1 = await (await request.get(`${api}/org-settings/invites`, { headers: authed })).json()
    expect(list1.data.find((i: { email: string }) => i.email === uniqueEmail)).toBeDefined()

    // Cancel.
    const cancel = await request.post(`${api}/org-settings/invites/${invite.id}/cancel`, {
      headers: authed,
    })
    expect(cancel.ok()).toBeTruthy()

    // List no longer includes it.
    const list2 = await (await request.get(`${api}/org-settings/invites`, { headers: authed })).json()
    expect(list2.data.find((i: { email: string }) => i.email === uniqueEmail)).toBeUndefined()

    // Public lookup now returns 404.
    const publicAfter = await request.get(`${api}/signup/invite/${invite.token}`)
    expect(publicAfter.status()).toBe(404)
  })
})

test.describe('Sprint 048 -- impersonation session lifecycle', () => {
  test('start requires consent (404 when revoked, session id when granted)', async ({ request, baseURL }) => {
    const annaToken = (await getTokens(request, baseURL)).anna
    const adminToken = (await getTokens(request, baseURL)).admin
    const { orgId, annaId } = await getIds(request, baseURL)
    const api = backendUrl(baseURL)
    const orgDomain = testClinicOrgDomain(baseURL)

    await request.post(`${api}/user/organization-access/${orgId}/revoke`, {
      headers: { Authorization: `Bearer ${annaToken}` },
    })

    // Without consent: 404.
    const res404 = await request.post(`${api}/practitioner/impersonate/start`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-Org-Domain': orgDomain,
      },
      data: { patient_user_id: annaId },
    })
    expect(res404.status()).toBe(404)

    // With consent: 200 + session_id.
    await request.post(`${api}/user/organization-access/${orgId}/grant`, {
      headers: { Authorization: `Bearer ${annaToken}` },
    })
    const res200 = await request.post(`${api}/practitioner/impersonate/start`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-Org-Domain': orgDomain,
      },
      data: { patient_user_id: annaId },
    })
    expect(res200.ok()).toBeTruthy()
    const body = await res200.json()
    expect(body.data.session_id).toMatch(/^[0-9a-f-]{36}$/)
    expect(body.data.patient_user_id).toBe(annaId)
  })

  test('effective-user swap: /auth/me returns patient with valid token, practitioner without', async ({ request, baseURL }) => {
    const annaToken = (await getTokens(request, baseURL)).anna
    const adminToken = (await getTokens(request, baseURL)).admin
    const { orgId, annaId } = await getIds(request, baseURL)
    const api = backendUrl(baseURL)
    const orgDomain = testClinicOrgDomain(baseURL)

    await request.post(`${api}/user/organization-access/${orgId}/grant`, {
      headers: { Authorization: `Bearer ${annaToken}` },
    })
    const start = await (await request.post(`${api}/practitioner/impersonate/start`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-Org-Domain': orgDomain,
      },
      data: { patient_user_id: annaId },
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
    expect(annaMe.data.id).toBe(annaId)
  })

  test('scope gate: hard-excluded (doctor-chat) 403 + blocked write 403', async ({ request, baseURL }) => {
    const annaToken = (await getTokens(request, baseURL)).anna
    const adminToken = (await getTokens(request, baseURL)).admin
    const { orgId, annaId } = await getIds(request, baseURL)
    const api = backendUrl(baseURL)
    const orgDomain = testClinicOrgDomain(baseURL)

    await request.post(`${api}/user/organization-access/${orgId}/grant`, {
      headers: { Authorization: `Bearer ${annaToken}` },
    })
    const start = await (await request.post(`${api}/practitioner/impersonate/start`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-Org-Domain': orgDomain,
      },
      data: { patient_user_id: annaId },
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
    const { orgId, annaId } = await getIds(request, baseURL)
    const api = backendUrl(baseURL)
    const orgDomain = testClinicOrgDomain(baseURL)

    await request.post(`${api}/user/organization-access/${orgId}/grant`, {
      headers: { Authorization: `Bearer ${annaToken}` },
    })
    const start = await (await request.post(`${api}/practitioner/impersonate/start`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-Org-Domain': orgDomain,
      },
      data: { patient_user_id: annaId },
    })).json()
    const session = start.data.session_id

    // First: swap works.
    const before = await (await request.get(`${api}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'X-Impersonation-Token': session },
    })).json()
    expect(before.data.email).toBe(ANNA_EMAIL)

    // Revoke.
    await request.post(`${api}/user/organization-access/${orgId}/revoke`, {
      headers: { Authorization: `Bearer ${annaToken}` },
    })

    // Same token, same request, now falls back to practitioner.
    const after = await (await request.get(`${api}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}`, 'X-Impersonation-Token': session },
    })).json()
    expect(after.data.email).toBe(ADMIN_EMAIL)

    // Clean up for next run.
    await request.post(`${api}/user/organization-access/${orgId}/grant`, {
      headers: { Authorization: `Bearer ${annaToken}` },
    })
  })

  test('exit ends the session: subsequent reads fall back', async ({ request, baseURL }) => {
    const annaToken = (await getTokens(request, baseURL)).anna
    const adminToken = (await getTokens(request, baseURL)).admin
    const { orgId, annaId } = await getIds(request, baseURL)
    const api = backendUrl(baseURL)
    const orgDomain = testClinicOrgDomain(baseURL)

    await request.post(`${api}/user/organization-access/${orgId}/grant`, {
      headers: { Authorization: `Bearer ${annaToken}` },
    })
    const start = await (await request.post(`${api}/practitioner/impersonate/start`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-Org-Domain': orgDomain,
      },
      data: { patient_user_id: annaId },
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
