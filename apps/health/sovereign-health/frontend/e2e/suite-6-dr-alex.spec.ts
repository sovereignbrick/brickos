import { test, expect } from '@playwright/test'
import { login, authHeaders } from './helpers/auth'

const API = process.env.E2E_API_URL || 'https://api.sovereignhealth.io'
const EMAIL = process.env.E2E_USER_EMAIL || ''
const PASSWORD = process.env.E2E_USER_PASSWORD || ''

test.describe('Suite 6: Dr. Alex Chat', () => {
  test.skip(!EMAIL, 'E2E_USER_EMAIL not set')

  test('6.1 chat quota endpoint works', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)
    const res = await request.get(`${API}/doctor-chat/quota`, {
      headers: authHeaders(user),
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body).toHaveProperty('data')
    // Quota response includes credit usage info
    const data = body.data
    expect(data).toHaveProperty('requests_used')
    expect(data).toHaveProperty('requests_limit')
    expect(data).toHaveProperty('remaining')
    expect(data).toHaveProperty('month')
    expect(typeof data.requests_used).toBe('number')
  })

  test('6.2 conversations list endpoint works', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)
    const res = await request.get(`${API}/doctor-chat/conversations`, {
      headers: authHeaders(user),
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBe(true)
  })

  test('6.3 chat endpoint rejects empty question', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)
    const res = await request.post(`${API}/doctor-chat`, {
      headers: authHeaders(user),
      data: { question: '' },
    })
    // Should return 400 validation error
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  test('6.4 chat endpoint requires auth', async ({ request }) => {
    const res = await request.post(`${API}/doctor-chat`, {
      headers: { 'Content-Type': 'application/json' },
      data: { question: 'test' },
    })
    expect(res.status()).toBe(401)
  })

  test('6.5 conversations endpoint requires auth', async ({ request }) => {
    const res = await request.get(`${API}/doctor-chat/conversations`, {
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(401)
  })

  test('6.6 AI credit status available via license', async ({ request }) => {
    const user = await login(request, EMAIL, PASSWORD)
    const res = await request.get(`${API}/license`, {
      headers: authHeaders(user),
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body).toHaveProperty('data')

    // License response includes tier and limits
    const data = body.data
    expect(data).toHaveProperty('tier')
    expect(data.tier).toHaveProperty('slug')
    expect(data.tier).toHaveProperty('name')
    expect(data).toHaveProperty('status')
    expect(data).toHaveProperty('limits')
    // chat_quota array holds per-agent credit info
    expect(data).toHaveProperty('chat_quota')
  })
})
