import { test, expect } from '@playwright/test'
import { login, authHeaders } from './helpers/auth'

const API = process.env.E2E_API_URL || 'https://api.sovereignhealth.io'
const EMAIL = process.env.E2E_USER_EMAIL || ''
const PASSWORD = process.env.E2E_USER_PASSWORD || ''

test.describe('Suite 5: Smart Import', () => {
  test.skip(!EMAIL, 'E2E_USER_EMAIL not set')

  test('5.1 import history endpoint works', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)
    const res = await request.get(`${API}/import/history`, {
      headers: authHeaders(user),
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBe(true)
  })

  test('5.2 upload endpoint rejects invalid file type', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)
    const res = await request.post(`${API}/import/upload`, {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
      multipart: {
        file: {
          name: 'invalid.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('this is not a valid lab report'),
        },
      },
    })
    // Should reject with 400 or 422 -- not succeed
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })

  test('5.3 CSV upload endpoint exists', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)
    // POST with no file should return 400 (missing file), NOT 404
    const res = await request.post(`${API}/import/upload-measurements`, {
      headers: {
        Authorization: `Bearer ${user.token}`,
        'Content-Type': 'application/json',
      },
      data: {},
    })
    // 400 = endpoint exists but input invalid; 404 would mean endpoint missing
    expect(res.status()).not.toBe(404)
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('5.4 import session list has expected shape', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)
    const res = await request.get(`${API}/import/history`, {
      headers: authHeaders(user),
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)

    // If sessions exist, verify each has the required fields
    if (body.data.length > 0) {
      for (const session of body.data) {
        expect(session).toHaveProperty('id')
        expect(session).toHaveProperty('status')
        expect(session).toHaveProperty('import_type')
        expect(session).toHaveProperty('created_at')
      }
    }
  })
})
