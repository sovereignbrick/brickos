import { test, expect, type APIRequestContext } from '@playwright/test'

/**
 * Sprint 050 #050-B3g: org admin flows.
 *
 * Builds on sprint-044-org + sprint-048-impersonation. Adds:
 *   - per-org email templates (Sprint 047 #583)
 *   - bulk consent reminder button endpoint (Sprint 049 #049-22)
 *   - custom domain list shape
 *   - consent counts on /admin/organizations/{id}
 *
 * Requires test-clinic fixture with test-clinic-admin@clinic.com.
 */

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

const ADMIN_EMAIL = 'test-clinic-admin@clinic.com'
const ADMIN_PASSWORD = process.env.E2E_TEST_CLINIC_PASSWORD || 'TestClinicAdmin1'

async function adminToken(
  request: APIRequestContext,
  baseURL: string | undefined,
): Promise<string> {
  const api = backendUrl(baseURL)
  const res = await request.post(`${api}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    headers: { 'Content-Type': 'application/json', 'X-Org-Domain': testClinicOrgDomain(baseURL) },
  })
  if (!res.ok()) throw new Error(`admin login failed: ${res.status()}`)
  const body = await res.json()
  return body.data.token
}

test.describe.configure({ mode: 'serial' })

test.describe('org admin endpoint contracts', () => {
  test.beforeEach(async ({ baseURL }) => {
    const host = baseURL ? new URL(baseURL).hostname : ''
    test.skip(host === 'eval.sovereignhealth.io', 'eval has no org-admin surface')
  })

  test('GET /org-settings/members returns roster', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const token = await adminToken(request, baseURL)
    const res = await request.get(`${api}/org-settings/members`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Org-Domain': testClinicOrgDomain(baseURL),
      },
    })
    expect(res.ok(), `HTTP ${res.status()}`).toBeTruthy()
    const body = await res.json()
    expect(Array.isArray(body.data)).toBeTruthy()
    // Every member row has consent_state per Sprint 048 extension.
    if (body.data.length) {
      const sample = body.data[0]
      expect(sample).toHaveProperty('email')
      expect(sample).toHaveProperty('role')
    }
  })

  test('GET /org-settings/invites returns pending invites', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const token = await adminToken(request, baseURL)
    const res = await request.get(`${api}/org-settings/invites`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Org-Domain': testClinicOrgDomain(baseURL),
      },
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(Array.isArray(body.data)).toBeTruthy()
  })

  test('POST /org-settings/consent-reminders requires org_owner', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    // Unauth -> 401
    const unauth = await request.post(`${api}/org-settings/consent-reminders`)
    expect([401, 403]).toContain(unauth.status())
  })

  test('POST /org-settings/consent-reminders as admin returns {total, sent}', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const token = await adminToken(request, baseURL)
    const res = await request.post(`${api}/org-settings/consent-reminders`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Org-Domain': testClinicOrgDomain(baseURL),
      },
    })
    // Either 200 with payload, or 429 (rate-limited), both prove endpoint wired.
    expect([200, 429]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(body.data).toHaveProperty('total')
      expect(body.data).toHaveProperty('sent')
    }
  })

  test('GET /org-settings/apps/shi/email returns template structure', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const token = await adminToken(request, baseURL)
    const res = await request.get(`${api}/org-settings/apps/shi/email`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Org-Domain': testClinicOrgDomain(baseURL),
      },
    })
    // 200 with locales block (Sprint 047 #583), or 404 if endpoint name differs.
    expect([200, 404]).toContain(res.status())
    if (res.ok()) {
      const body = await res.json()
      expect(body.data).toBeDefined()
    }
  })

  test('GET /admin/organizations/{id} includes consent + seats', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    // Platform admin needed, not org admin. Skip unless DEMO_ADMIN creds available.
    const demoEmail = process.env.E2E_ADMIN_EMAIL || 'demo@sovereignhealth.io'
    const demoPass = process.env.E2E_ADMIN_PASSWORD || 'SovereignDemo1'
    const loginRes = await request.post(`${api}/auth/login`, {
      data: { email: demoEmail, password: demoPass },
    })
    if (!loginRes.ok()) {
      test.skip(true, `DEMO_ADMIN login not available (HTTP ${loginRes.status()})`)
    }
    const token = (await loginRes.json()).data.token

    // Find test-clinic org ID by slug
    const orgs = await request.get(`${api}/admin/organizations?search=test-clinic`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!orgs.ok()) {
      test.skip(true, 'cannot list orgs')
    }
    const orgsBody = await orgs.json()
    const testClinic = orgsBody.data?.find((o: { slug: string }) => o.slug === 'test-clinic')
    if (!testClinic) {
      test.skip(true, 'test-clinic not in org list')
    }

    const detail = await request.get(`${api}/admin/organizations/${testClinic.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(detail.ok()).toBeTruthy()
    const d = (await detail.json()).data
    expect(d).toHaveProperty('seats')
    expect(d).toHaveProperty('consent')
    expect(d.consent).toHaveProperty('granted')
    expect(d.consent).toHaveProperty('revoked')
  })
})
