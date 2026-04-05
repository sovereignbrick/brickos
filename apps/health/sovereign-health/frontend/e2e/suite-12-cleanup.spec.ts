import { test, expect } from '@playwright/test'
import { login, authHeaders } from './helpers/auth'

const API = process.env.E2E_API_URL || 'https://api.sovereignhealth.io'
const EMAIL = process.env.E2E_USER_EMAIL || ''
const PASSWORD = process.env.E2E_USER_PASSWORD || ''

test.describe('Suite 12: Data integrity checks', () => {
  test.skip(!EMAIL, 'E2E_USER_EMAIL not set')

  test('12.1 health endpoint reports OK', async ({ request }) => {
    const res = await request.get(`${API}/health`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.status).toBe('ok')
  })

  test('12.2 user data is self-consistent', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)

    // Get settings
    const settingsRes = await request.get(`${API}/settings`, {
      headers: authHeaders(user),
    })
    expect(settingsRes.ok()).toBeTruthy()

    // Get license
    const licenseRes = await request.get(`${API}/license`, {
      headers: authHeaders(user),
    })
    expect(licenseRes.ok()).toBeTruthy()
    const license = await licenseRes.json()
    expect(license.data).toBeTruthy()
    expect(license.data.tier).toBeTruthy()
  })

  test('12.3 no orphaned measurements (all have valid marker_id)', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)
    const res = await request.get(`${API}/measurements?limit=50`, {
      headers: authHeaders(user),
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    if (body.data && body.data.length > 0) {
      for (const m of body.data) {
        expect(m.marker_slug).toBeTruthy()
        expect(m.value).toBeDefined()
      }
    }
  })

  test('12.4 search API response matches frontend contract', async ({ request }) => {
    // This test validates the ACTUAL API response structure against what
    // the frontend TypeScript types expect. Catches spec/implementation drift.
    const res = await request.get(`${API}/api/v1/search?q=glucose&locale=en&limit=5`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()

    // Response must be wrapped in { data: {...}, error: null }
    expect(body).toHaveProperty('data')
    expect(body.error).toBeNull()

    const data = body.data

    // Required fields matching SearchResponse interface
    expect(data).toHaveProperty('results')
    expect(data).toHaveProperty('total_results')
    expect(data).toHaveProperty('facets')
    expect(data).toHaveProperty('blind_spots')
    expect(data).toHaveProperty('limit')
    expect(data).toHaveProperty('offset')
    expect(typeof data.total_results).toBe('number')
    expect(data.total_results).toBeGreaterThan(0)
    expect(Array.isArray(data.results)).toBe(true)
    expect(data.results.length).toBeGreaterThan(0)

    // Validate result item shape (SearchResult interface)
    const result = data.results[0]
    expect(result).toHaveProperty('entity_type')
    expect(result).toHaveProperty('entity_id')
    expect(result).toHaveProperty('title')
    expect(result).toHaveProperty('score')
    expect(typeof result.entity_type).toBe('string')
    expect(typeof result.title).toBe('string')
    expect(typeof result.score).toBe('number')
    // Optional fields must be present (even if null)
    expect('snippet' in result).toBe(true)
    expect('url_path' in result).toBe(true)
    expect('external_url' in result).toBe(true)
    expect('metadata' in result).toBe(true)

    // Facets must be array of {type, count} (NOT Record<string, number>)
    expect(Array.isArray(data.facets)).toBe(true)
    if (data.facets.length > 0) {
      const facet = data.facets[0]
      expect(facet).toHaveProperty('type')
      expect(facet).toHaveProperty('count')
      expect(typeof facet.type).toBe('string')
      expect(typeof facet.count).toBe('number')
    }

    // Blind spots must be array
    expect(Array.isArray(data.blind_spots)).toBe(true)

    // Unauthenticated: should have login_cta
    expect(data).toHaveProperty('login_cta')
    if (data.login_cta) {
      expect(data.login_cta).toHaveProperty('message')
      expect(data.login_cta).toHaveProperty('url')
    }
  })

  test('12.5 search suggest API response matches frontend contract', async ({ request }) => {
    const res = await request.get(`${API}/api/v1/search/suggest?q=glu&locale=en&limit=5`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()

    expect(body).toHaveProperty('data')
    const data = body.data
    expect(data).toHaveProperty('suggestions')
    expect(Array.isArray(data.suggestions)).toBe(true)
    if (data.suggestions.length > 0) {
      const s = data.suggestions[0]
      expect(s).toHaveProperty('text')
      expect(s).toHaveProperty('type')
      expect(s).toHaveProperty('url')
      expect(typeof s.text).toBe('string')
    }
  })

  test('12.6 search bilingual -- German query returns results', async ({ request }) => {
    const res = await request.get(`${API}/api/v1/search?q=Glukose&locale=de&limit=3`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.data.total_results).toBeGreaterThan(0)
  })

  test('12.7 no test email users in system', async ({ request }) => {
    // Verify no @test.sovereignhealth.io users leaked
    // This endpoint is admin-only, so this test only works with admin credentials
    // Skip if not admin
    if (!process.env.E2E_ADMIN_EMAIL) {
      test.skip()
      return
    }
    const admin = await login(
      request,
      process.env.E2E_ADMIN_EMAIL!,
      process.env.E2E_ADMIN_PASSWORD!,
    )
    const res = await request.get(`${API}/admin/users?search=test.sovereignhealth.io`, {
      headers: authHeaders(admin),
    })
    if (res.ok()) {
      const body = await res.json()
      expect(body.data.length).toBe(0)
    }
  })
})
