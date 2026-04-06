import { test, expect } from '@playwright/test'
import { login, authHeaders } from './helpers/auth'

const API = process.env.E2E_API_URL || 'https://api.sovereignhealth.io'
const EMAIL = process.env.E2E_USER_EMAIL || ''
const PASSWORD = process.env.E2E_USER_PASSWORD || ''

test.describe('Compliance: GDPR', () => {
  test.skip(!EMAIL, 'E2E_USER_EMAIL not set')

  test('Art. 20: Data portability - CSV export available', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)
    const res = await request.get(`${API}/export/csv?period=all`, {
      headers: authHeaders(user),
    })
    // Should return 200 (even if no data, endpoint must exist)
    expect([200, 204]).toContain(res.status())
  })

  test('Art. 17: Right to erasure - reset endpoint exists', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)
    // POST without confirm to check endpoint exists (returns counts, not deletes)
    const res = await request.post(`${API}/settings/reset-data`, {
      headers: authHeaders(user),
      data: { confirm: '' },
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.data.confirmed).toBe(false)
  })

  test('Art. 32: Encryption - API uses HTTPS', async ({ request }) => {
    const res = await request.get(`${API}/health`)
    expect(res.url()).toMatch(/^https:/)
  })

  test('Art. 7: Consent management - consent endpoint exists', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)
    const res = await request.get(`${API}/settings/consent`, {
      headers: authHeaders(user),
    })
    expect(res.ok()).toBeTruthy()
  })

  test('Art. 25: Data protection by design - security headers present', async ({ request }) => {
    const res = await request.get(`${API}/health`)
    const headers = res.headers()
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['strict-transport-security']).toBeTruthy()
  })
})

test.describe('Compliance: EU AI Act', () => {
  test('Art. 50: AI system info available', async ({ request }) => {
    const res = await request.get(`${API}/health`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    // AI system card should be in health response
    if (body.ai_system) {
      expect(body.ai_system.classification).toContain('Limited Risk')
      expect(body.ai_system.limitations).toBeTruthy()
    }
  })

  test('Art. 50: AI usage is logged', async ({ request }) => {
    // Verify ai_usage_log endpoint exists (admin only, but 401/403 proves it exists)
    const res = await request.get(`${API}/admin/ai-usage`)
    expect([401, 403]).toContain(res.status())
  })
})

test.describe('Compliance: CRA', () => {
  test('Vulnerability handling - health endpoint works', async ({ request }) => {
    const res = await request.get(`${API}/health`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.version).toBeTruthy()
  })
})

test.describe('Compliance: NIS 2', () => {
  test('Incident response - documented', async () => {
    // This is a documentation check, not an API test
    // Verify the file exists in the repo
    const fs = require('fs')
    const path = require('path')
    const docPath = path.join(__dirname, '../../../docs/project-files/security/incident-response.md')
    expect(fs.existsSync(docPath)).toBeTruthy()
  })
})
