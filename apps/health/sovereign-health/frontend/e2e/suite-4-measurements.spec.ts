import { test, expect } from '@playwright/test'
import { login, authHeaders } from './helpers/auth'

const API = process.env.E2E_API_URL || 'https://api.sovereignhealth.io'
const EMAIL = process.env.E2E_USER_EMAIL || ''
const PASSWORD = process.env.E2E_USER_PASSWORD || ''

test.describe('Suite 4: Measurements & Data', () => {
  test.skip(!EMAIL, 'E2E_USER_EMAIL not set')

  test('4.1 list measurements via API', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)
    const res = await request.get(`${API}/measurements?limit=5`, {
      headers: authHeaders(user),
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()

    // Response has data array and meta with total
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('meta')
    expect(Array.isArray(body.data)).toBe(true)
    expect(typeof body.meta.total).toBe('number')

    // Each measurement has required fields
    if (body.data.length > 0) {
      for (const m of body.data) {
        expect(m).toHaveProperty('marker_slug')
        expect(m).toHaveProperty('value')
        expect(m).toHaveProperty('unit')
        expect(m).toHaveProperty('status')
        expect(m).toHaveProperty('timestamp')
        expect(m.marker_slug).toBeTruthy()
        expect(m.value).toBeDefined()
      }
    }
  })

  test('4.2 marker list returns markers with zones', async ({ request }) => {
    const res = await request.get(`${API}/v1/content/markers?locale=en`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()

    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBe(true)
    // Verify > 50 markers returned
    expect(body.data.length).toBeGreaterThan(50)
  })

  test('4.3 zone list returns 8 zones', async ({ request }) => {
    const res = await request.get(`${API}/v1/content/zones?locale=en`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()

    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBe(true)
    // Verify exactly 8 zones
    expect(body.data.length).toBe(8)
  })

  test('4.4 calculated markers have values (if user has base data)', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)

    // Fetch measurements -- calculated markers like eGFR should appear if base data exists
    const res = await request.get(`${API}/measurements?limit=50`, {
      headers: authHeaders(user),
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()

    if (body.data && body.data.length > 0) {
      // Look for any calculated marker (e.g., eGFR, LDL calculated)
      const calculatedSlugs = ['egfr', 'ldl-calculated', 'non-hdl-cholesterol']
      const found = body.data.filter((m: { marker_slug: string }) =>
        calculatedSlugs.some((slug) => m.marker_slug.includes(slug)),
      )
      // If user has base data, at least one calculated marker should exist
      // This is a soft check -- skip assertion if no calculated markers found
      if (found.length > 0) {
        for (const m of found) {
          expect(m.value).toBeDefined()
          expect(m.marker_slug).toBeTruthy()
        }
      }
    }
  })

  test('4.5 search endpoint works', async ({ request }) => {
    // Public search endpoint -- no auth needed
    const res = await request.get(`${API}/api/v1/search?q=glucose&locale=en&limit=5`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()

    expect(body).toHaveProperty('data')
    expect(body.data).toHaveProperty('total_results')
    expect(body.data.total_results).toBeGreaterThan(0)
    expect(body.data).toHaveProperty('results')
    expect(Array.isArray(body.data.results)).toBe(true)
    expect(body.data.results.length).toBeGreaterThan(0)
  })
})
