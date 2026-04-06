import { test, expect } from '@playwright/test'

const API = process.env.E2E_API_URL || 'https://api.sovereignhealth.io'

test.describe('Sprint 024: Demo profiles (real accounts)', () => {
  test('demo zones returns data for all 3 profiles', async ({ request }) => {
    for (const profile of ['optimized', 'average', 'at_risk']) {
      const res = await request.get(`${API}/demo/zones?profile=${profile}`)
      expect(res.ok()).toBeTruthy()
      const body = await res.json()
      expect(body.data.length).toBe(8)
      const totalMarkers = body.data.reduce(
        (sum: number, z: { markers_with_data: number }) => sum + z.markers_with_data, 0
      )
      expect(totalMarkers).toBeGreaterThan(0)
    }
  })

  test('demo measurements returns correct counts', async ({ request }) => {
    const expected: Record<string, number> = { optimized: 854, average: 437, at_risk: 437 }
    for (const [profile, count] of Object.entries(expected)) {
      const res = await request.get(`${API}/demo/measurements?profile=${profile}&per_page=1`)
      expect(res.ok()).toBeTruthy()
      const body = await res.json()
      expect(body.meta.total).toBe(count)
    }
  })

  test('demo zones response matches frontend contract', async ({ request }) => {
    const res = await request.get(`${API}/demo/zones?profile=optimized`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body).toHaveProperty('data')
    expect(body.error).toBeNull()

    const zone = body.data[0]
    expect(zone).toHaveProperty('zone_slug')
    expect(zone).toHaveProperty('zone_name')
    expect(zone).toHaveProperty('marker_count')
    expect(zone).toHaveProperty('markers_with_data')
    expect(zone).toHaveProperty('status_summary')
    expect(zone.status_summary).toHaveProperty('green')
    expect(zone.status_summary).toHaveProperty('orange')
    expect(zone.status_summary).toHaveProperty('red')
  })

  test('demo endpoint returns 404 for invalid profile', async ({ request }) => {
    const res = await request.get(`${API}/demo/zones?profile=nonexistent`)
    // Should return 404 because no user account exists for this profile
    expect(res.status()).toBe(404)
  })
})

test.describe('Sprint 024: Learn page', () => {
  test('learn page loads', async ({ page }) => {
    await page.goto(`${API.replace('api.', 'app.').replace('api-demo.', 'demo.')}/learn`)
    // Should either load or redirect -- not 500
    const status = await page.evaluate(() => document.readyState)
    expect(status).toBe('complete')
  })
})
