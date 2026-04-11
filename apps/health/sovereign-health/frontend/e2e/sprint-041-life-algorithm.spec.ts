// Sprint 041 -- Life Algorithm walkthrough E2E.
//
// Drives the Sprint 041 manual test issues #496-#511 through Playwright
// against the bootstrapped dev stack. Each test maps to one manual issue
// and verifies that the platform admin GUI feature actually works.
//
// Tests share a single Life Algorithm org that is created in the first
// test (#496) and reused/inspected by subsequent tests. The slug is
// timestamped per run so the spec is idempotent (no DELETE org endpoint
// yet -- see follow-up issue).
//
// Run:
//   E2E_BASE_URL=http://localhost:3000 \
//   JWT_SECRET=$(grep JWT_SECRET ../api/.env | cut -d= -f2) \
//   npx playwright test e2e/sprint-041-life-algorithm.spec.ts

import { test, expect, type Page } from '@playwright/test'
import * as crypto from 'node:crypto'

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000'
const API = process.env.E2E_API_URL || 'http://localhost:8080'
const JWT_SECRET = process.env.JWT_SECRET!
const USER_ID = process.env.E2E_USER_ID || '00000000-0000-0000-0000-000000000002'

// Unique per-run slug + name so the spec is idempotent across runs
// without needing a DELETE org endpoint.
const RUN_ID = `${Date.now().toString(36)}`
const ORG_NAME = `Life Algorithm ${RUN_ID}`
const ORG_SLUG = `life-algorithm-${RUN_ID}`
const BILLING_EMAIL = `billing-${RUN_ID}@life-algorithm.test`

// Shared mutable state across tests in this serial describe.
const ctx: { orgId: string | null } = { orgId: null }

test.skip(!JWT_SECRET, 'JWT_SECRET env var required')

// Run tests serially so they share the org row created in #496.
test.describe.configure({ mode: 'serial' })

function mintJwt(): string {
  const header = { typ: 'JWT', alg: 'HS256' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sub: USER_ID,
    role: 'admin',
    tier: 'insight',
    iat: now,
    exp: now + 3600,
  }
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString('base64url').replace(/=+$/, '')
  const msg = `${b64(header)}.${b64(payload)}`
  const sig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(msg)
    .digest('base64url')
    .replace(/=+$/, '')
  return `${msg}.${sig}`
}

async function setAuth(page: Page): Promise<void> {
  const token = mintJwt()
  await page.context().addCookies([
    {
      name: 'auth_token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ])
}

test.describe('Sprint 041 -- Life Algorithm walkthrough', () => {
  test.beforeEach(async ({ page }) => {
    await setAuth(page)
  })

  // ===========================================================================
  // #496 -- Create the Life Algorithm org via the GUI
  // ===========================================================================
  test('#496 create Life Algorithm org via the New Organization modal', async ({ page }) => {
    await page.goto(`${BASE}/platform/orgs`)

    // The New Organization button must be present in the header.
    const newButton = page.getByTestId('orgs-new-org-button')
    await expect(newButton).toBeVisible({ timeout: 10000 })
    await newButton.click()

    // Modal must open.
    const modal = page.getByTestId('orgs-new-org-modal')
    await expect(modal).toBeVisible()

    // Fill the form.
    await page.getByTestId('orgs-new-name').fill(ORG_NAME)

    // Slug should auto-derive from name. Override with our deterministic
    // unique slug for this run.
    const slugField = page.getByTestId('orgs-new-slug')
    await slugField.click({ clickCount: 3 })
    await slugField.fill(ORG_SLUG)

    await page.getByTestId('orgs-new-type').selectOption('clinic')
    await page.getByTestId('orgs-new-billing-email').fill(BILLING_EMAIL)

    // Submit.
    await page.getByTestId('orgs-new-submit').click()

    // Should navigate to the new org's detail page.
    await page.waitForURL(/\/platform\/orgs\/[a-f0-9-]{36}/, { timeout: 15000 })

    // Capture the org id from the URL for downstream tests.
    const url = page.url()
    const match = url.match(/\/platform\/orgs\/([a-f0-9-]{36})/)
    expect(match).not.toBeNull()
    ctx.orgId = match![1]

    // Org name must be visible on the detail page.
    await expect(page.getByRole('heading', { name: ORG_NAME })).toBeVisible({ timeout: 10000 })
  })

  // ===========================================================================
  // #496b -- Verify the new org appears in the list
  // ===========================================================================
  test('#496b new org appears in the orgs list', async ({ page }) => {
    test.skip(!ctx.orgId, 'orgId from #496 required')
    await page.goto(`${BASE}/platform/orgs`)
    // Scope the locator to the table row for this slug -- the page also
    // contains the slug in hidden form options elsewhere, so a plain text
    // locator would match the wrong element.
    const row = page.getByTestId(`orgs-row-${ORG_SLUG}`)
    await expect(row).toBeVisible({ timeout: 10000 })
    await expect(row).toContainText(ORG_NAME)
  })

  // ===========================================================================
  // #499 -- Generate a license for the org via the API + render in the License tab
  // ===========================================================================
  test('#499 generate insight license for Life Algorithm', async ({ page, request }) => {
    test.skip(!ctx.orgId, 'orgId from #496 required')

    const token = mintJwt()
    const res = await request.post(`${API}/admin/organizations/${ctx.orgId}/license`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        tier: 'insight',
        expires_days: 365,
        max_owners: 2,
        max_practitioners: 5,
        max_members: 50,
        features: [],
        aud: ['sovereign-health'],
      },
    })
    expect(res.status(), `body: ${await res.text()}`).toBe(200)
    const body = await res.json()
    expect(body.error).toBeNull()
    expect(body.data.tier_slug).toBe('insight')
    expect(body.data.jti).toBeTruthy()
    expect(body.data.license_key).toContain('eyJ')

    // Switch to the License tab on the org detail page and verify it
    // renders the new tier.
    await page.goto(`${BASE}/platform/orgs/${ctx.orgId}`)
    await page.getByRole('button', { name: /^License$/i }).click()
    await expect(page.locator('text=insight').first()).toBeVisible({ timeout: 10000 })
  })

  // ===========================================================================
  // #500 -- License history endpoint returns the issued license
  // ===========================================================================
  test('#500 license history API returns the issued license', async ({ request }) => {
    test.skip(!ctx.orgId, 'orgId from #496 required')
    const token = mintJwt()
    const res = await request.get(`${API}/admin/organizations/${ctx.orgId}/license/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)
    expect(body.data[0].tier_slug).toBe('insight')
  })

  // ===========================================================================
  // #501 -- Add an org_owner via the Members tab. The user does not exist
  // yet -- the auto-create flow should mint them in both schemas.
  // ===========================================================================
  test('#501 add org_owner with auto-create user', async ({ request }) => {
    test.skip(!ctx.orgId, 'orgId from #496 required')
    const token = mintJwt()
    const ownerEmail = `owner-${RUN_ID}@life-algorithm.test`
    const res = await request.post(`${API}/admin/organizations/${ctx.orgId}/members`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { email: ownerEmail, role: 'org_owner' },
    })
    expect(res.status(), `body: ${await res.text()}`).toBe(201)
    const body = await res.json()
    expect(body.data.added).toBe(true)
    expect(body.data.was_invited).toBe(true)
    expect(body.data.role).toBe('org_owner')

    // Adding the same email again must hit the existing user, not re-create.
    const res2 = await request.post(`${API}/admin/organizations/${ctx.orgId}/members`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { email: ownerEmail, role: 'org_owner' },
    })
    expect(res2.status()).toBe(201)
    const body2 = await res2.json()
    expect(body2.data.was_invited).toBe(false)
    expect(body2.data.user_id).toBe(body.data.user_id)
  })

  // ===========================================================================
  // #503 -- Audit log endpoint reflects every mutation done so far.
  // ===========================================================================
  test('#503 audit log endpoint returns entries for the org', async ({ request }) => {
    test.skip(!ctx.orgId, 'orgId from #496 required')
    const token = mintJwt()
    const res = await request.get(`${API}/admin/organizations/${ctx.orgId}/audit`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
    // Expect at least: license issue + member add (from #499 + #501).
    const actions = (body.data as Array<{ action: string }>).map((e) => e.action)
    expect(actions).toEqual(expect.arrayContaining(['org.license.issue', 'org.member.add']))
  })

  // ===========================================================================
  // Invoices: create draft + edit + discard via API parity tests
  // ===========================================================================
  test('#5xx invoice draft can be created and discarded', async ({ request }) => {
    test.skip(!ctx.orgId, 'orgId from #496 required')
    const token = mintJwt()

    // Create a draft invoice with one line item
    const create = await request.post(`${API}/admin/organizations/${ctx.orgId}/invoices`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        currency: 'eur',
        line_items: [
          {
            product_slug: 'shi-horizon-base',
            name: 'SHI Horizon Practice Base',
            quantity: 1,
            unit_amount_cents: 49900,
          },
        ],
        due_days: 30,
        memo: `e2e-${RUN_ID}`,
      },
    })
    expect(create.status(), `body: ${await create.text()}`).toBe(201)
    const created = await create.json()
    expect(created.error).toBeNull()
    const invoiceId = created.data.id
    expect(invoiceId).toBeTruthy()

    // Discard the draft
    const del = await request.delete(
      `${API}/admin/organizations/${ctx.orgId}/invoices/${invoiceId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    expect(del.status(), `body: ${await del.text()}`).toBe(200)
    const delBody = await del.json()
    expect(delBody.data.deleted).toBe(true)
  })

  // ===========================================================================
  // Invoices: products endpoint returns the new description + billing_period
  // fields the operator UI uses for tooltips and clarifier badges.
  // ===========================================================================
  test('invoice products list includes description and billing_period', async ({ request }) => {
    const token = mintJwt()
    const res = await request.get(`${API}/admin/invoice-products`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBe(7)
    const base = body.data.find((p: { slug: string }) => p.slug === 'shi-horizon-base')
    expect(base).toBeTruthy()
    expect(base.billing_period).toBe('monthly')
    expect(base.description).toContain('Recurring monthly')
    const onboarding = body.data.find((p: { slug: string }) => p.slug === 'shi-horizon-onboarding')
    expect(onboarding.billing_period).toBe('one-time')
  })
})
