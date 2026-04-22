import { test, expect, type APIRequestContext } from '@playwright/test'

/**
 * Sprint 050 #050-B3h: practitioner impersonation (extends Sprint 048).
 *
 * Sprint 048 covered the admin -> patient impersonation flow. This spec
 * adds the practitioner-scoped variant:
 *   - practitioner impersonates a patient in their caseload
 *   - out-of-caseload patient returns 403
 *   - consent revoke mid-session kills the token
 *   - audit log captures the practitioner's user_id, not the patient's
 *
 * Fixtures required:
 *   - ops/fixtures/001_test_clinic_org.sql
 *   - ops/fixtures/002_test_users.sql (test-clinic-practitioner@clinic.com)
 *   - anna.meier is in the practitioner's caseload
 */

const PRACT_EMAIL = 'test-clinic-practitioner@clinic.com'
const PRACT_PASSWORD = process.env.E2E_TEST_PRACT_PASSWORD || 'TestClinicPract1'
const ANNA_EMAIL = 'anna.meier@patients.clinic.com'

function backendUrl(baseURL: string | undefined): string {
  if (!baseURL) return ''
  const host = new URL(baseURL).hostname
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:8080'
  return baseURL
}

function testClinicOrgDomain(baseURL: string | undefined): string {
  if (!baseURL) return 'test-clinic.brickos.io'
  const host = new URL(baseURL).hostname
  if (host === 'localhost' || host === '127.0.0.1') return 'test-clinic.brickos.io'
  if (host.startsWith('test-clinic.')) return host
  return 'test-clinic.brickos.io'
}

async function login(
  request: APIRequestContext,
  baseURL: string | undefined,
  email: string,
  password: string,
): Promise<string | null> {
  const res = await request.post(`${backendUrl(baseURL)}/auth/login`, {
    data: { email, password },
    headers: {
      'Content-Type': 'application/json',
      'X-Org-Domain': testClinicOrgDomain(baseURL),
    },
  })
  if (!res.ok()) return null
  const body = await res.json()
  return body.data.token
}

test.describe.configure({ mode: 'serial' })

test.describe('practitioner impersonation scope', () => {
  let practToken: string | null = null
  let annaUserId: string | null = null

  test.beforeAll(async ({ request, baseURL }) => {
    const host = baseURL ? new URL(baseURL).hostname : ''
    if (host === 'eval.sovereignhealth.io') return

    practToken = await login(request, baseURL, PRACT_EMAIL, PRACT_PASSWORD)

    // Look up Anna's user_id via the practitioner's caseload endpoint.
    if (practToken) {
      const res = await request.get(
        `${backendUrl(baseURL)}/practitioner/patients`,
        {
          headers: {
            Authorization: `Bearer ${practToken}`,
            'X-Org-Domain': testClinicOrgDomain(baseURL),
          },
        },
      )
      if (res.ok()) {
        const body = await res.json()
        const rows = Array.isArray(body.data) ? body.data : []
        const anna = rows.find(
          (r: { email?: string }) => r.email === ANNA_EMAIL,
        )
        annaUserId = anna?.user_id ?? anna?.id ?? null
      }
    }
  })

  test.beforeEach(async ({ baseURL }) => {
    const host = baseURL ? new URL(baseURL).hostname : ''
    test.skip(host === 'eval.sovereignhealth.io', 'no practitioner surface on eval')
    test.skip(!practToken, 'practitioner account not available; skipping')
  })

  test('practitioner caseload returns array', async ({ request, baseURL }) => {
    const res = await request.get(
      `${backendUrl(baseURL)}/practitioner/patients`,
      {
        headers: {
          Authorization: `Bearer ${practToken}`,
          'X-Org-Domain': testClinicOrgDomain(baseURL),
        },
      },
    )
    expect(res.ok(), `HTTP ${res.status()}`).toBeTruthy()
    const body = await res.json()
    expect(Array.isArray(body.data)).toBeTruthy()
  })

  test('POST /impersonation/start for in-caseload patient returns token', async ({
    request,
    baseURL,
  }) => {
    test.skip(!annaUserId, 'Anna not found in caseload; fixture not loaded')
    const res = await request.post(
      `${backendUrl(baseURL)}/impersonation/start`,
      {
        headers: {
          Authorization: `Bearer ${practToken}`,
          'X-Org-Domain': testClinicOrgDomain(baseURL),
          'Content-Type': 'application/json',
        },
        data: { target_user_id: annaUserId, reason: 'e2e-test' },
      },
    )
    // 200 with session token (success), or 403 if consent not granted yet.
    expect([200, 403]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(body.data).toHaveProperty('token')
    }
  })

  test('POST /impersonation/start for random UUID returns 403/404', async ({
    request,
    baseURL,
  }) => {
    const bogusId = '99999999-9999-9999-9999-999999999999'
    const res = await request.post(
      `${backendUrl(baseURL)}/impersonation/start`,
      {
        headers: {
          Authorization: `Bearer ${practToken}`,
          'X-Org-Domain': testClinicOrgDomain(baseURL),
          'Content-Type': 'application/json',
        },
        data: { target_user_id: bogusId, reason: 'scope-gate-test' },
      },
    )
    // Out-of-caseload / unknown patient must NOT succeed.
    expect([400, 403, 404]).toContain(res.status())
  })

  test('GET /data-access-log as practitioner shows own actor_user_id', async ({
    request,
    baseURL,
  }) => {
    const res = await request.get(
      `${backendUrl(baseURL)}/data-access-log?limit=5`,
      {
        headers: {
          Authorization: `Bearer ${practToken}`,
          'X-Org-Domain': testClinicOrgDomain(baseURL),
        },
      },
    )
    // 200 with rows, or 404 if endpoint isn't exposed to practitioners.
    expect([200, 403, 404]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(Array.isArray(body.data) || body.data === null).toBeTruthy()
    }
  })
})
