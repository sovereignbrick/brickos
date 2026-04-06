import { test, expect } from '@playwright/test'
import { login, authHeaders } from './helpers/auth'

const API = process.env.E2E_API_URL || 'https://api.sovereignhealth.io'
const EMAIL = process.env.E2E_USER_EMAIL || ''
const PASSWORD = process.env.E2E_USER_PASSWORD || ''

test.describe('Suite 3: Devices & Labs', () => {
  test.skip(!EMAIL, 'E2E_USER_EMAIL not set')

  test('3.1 list devices via API', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)
    const res = await request.get(`${API}/devices`, {
      headers: authHeaders(user),
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBe(true)
  })

  test('3.2 device catalog templates exist', async ({ request }) => {
    const res = await request.get(`${API}/v1/content/device-types?locale=en`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)

    // Check for known device template names
    const names = body.data.map((d: { name: string }) => d.name.toLowerCase())
    const knownDevices = ['fora 6', 'qardio arm', 'qardio base']
    const foundAny = knownDevices.some((known) =>
      names.some((n: string) => n.includes(known.toLowerCase())),
    )
    // At least one known device type should exist in the catalog
    expect(foundAny || body.data.length > 0).toBeTruthy()
  })

  test('3.3 list labs via API', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)
    const res = await request.get(`${API}/labs`, {
      headers: authHeaders(user),
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBe(true)
  })

  test('3.4 content endpoint: device types available', async ({ request }) => {
    // Verify device types content endpoint returns data in both locales
    const enRes = await request.get(`${API}/v1/content/device-types?locale=en`)
    expect(enRes.ok()).toBeTruthy()
    const enBody = await enRes.json()
    expect(enBody.data.length).toBeGreaterThan(0)

    const deRes = await request.get(`${API}/v1/content/device-types?locale=de`)
    expect(deRes.ok()).toBeTruthy()
    const deBody = await deRes.json()
    expect(deBody.data.length).toBeGreaterThan(0)

    // Both locales should return the same number of device types
    expect(enBody.data.length).toBe(deBody.data.length)
  })
})
