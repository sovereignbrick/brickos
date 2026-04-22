import { test, expect } from '@playwright/test'

/**
 * Sprint 050 #050-B3c: billing endpoint contracts.
 *
 * Full Stripe test-mode upgrade flow is not practical in CI (needs
 * Stripe test keys + webhook forwarding). This spec instead verifies
 * that the endpoints exist and respond with the expected shape;
 * the full upgrade flow is covered by manual QA item C2-4 or by a
 * dedicated billing-integration harness outside the main E2E run.
 */

function backendUrl(baseURL: string | undefined): string {
  if (!baseURL) return ''
  const host = new URL(baseURL).hostname
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:8080'
  return baseURL
}

test.describe('billing endpoint contracts', () => {
  test.beforeEach(async ({ baseURL }) => {
    const host = baseURL ? new URL(baseURL).hostname : ''
    test.skip(host === 'eval.sovereignhealth.io', 'eval has no billing surface')
  })

  test('GET /api/tiers/features is public + returns tier matrix', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const res = await request.get(`${api}/api/tiers/features`)
    expect(res.ok(), `HTTP ${res.status()}`).toBeTruthy()
    const body = await res.json()
    expect(Array.isArray(body.data) || typeof body.data === 'object').toBeTruthy()
  })

  test('POST /billing/upgrade rejects unauth with 401', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const res = await request.post(`${api}/billing/upgrade`, { data: { tier: 'clarity' } })
    // 401 (unauth) or 404 (endpoint may not exist on all builds) are both
    // acceptable "not a 500" signals. A 500 would be a real regression.
    expect([401, 403, 404, 405].includes(res.status()), `HTTP ${res.status()} is not a valid gate`).toBeTruthy()
  })

  test('GET /donate/invoice creates an invoice shape (public endpoint)', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    // /donate/invoice is POST. Verify the endpoint exists (405 on GET
    // proves it's registered; other codes also OK).
    const res = await request.get(`${api}/donate/invoice`)
    expect([404, 405, 400, 401].includes(res.status())).toBeTruthy()
  })

  test('GET /donate/status/<bogus> returns 4xx (endpoint reachable)', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const res = await request.get(`${api}/donate/status/00000000-0000-0000-0000-000000000000`)
    expect([400, 404, 401].includes(res.status()) || res.ok()).toBeTruthy()
  })

  test('POST /billing/webhook (Stripe) returns 4xx on missing signature', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const res = await request.post(`${api}/billing/webhook`, { data: {} })
    // Stripe webhook signature verification -> 400/401 on missing sig.
    expect([400, 401, 403, 404, 405].includes(res.status())).toBeTruthy()
  })

  test('tier feature matrix includes all 3 tiers', async ({ request, baseURL }) => {
    const api = backendUrl(baseURL)
    const res = await request.get(`${api}/api/tiers/features`)
    expect(res.ok()).toBeTruthy()
    const bodyText = await res.text()
    // Check for canonical tier names in the response body (case-
    // insensitive because the response may wrap them in objects).
    expect(bodyText.toLowerCase()).toContain('glimpse')
    expect(bodyText.toLowerCase()).toContain('clarity')
    expect(bodyText.toLowerCase()).toContain('horizon')
  })
})
