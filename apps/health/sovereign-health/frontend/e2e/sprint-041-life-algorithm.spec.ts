// Sprint 041 -- Life Algorithm walkthrough E2E.
//
// Drives the Sprint 041 manual test issues #496-#511 through Playwright
// against the bootstrapped dev stack. Each test maps to one manual issue
// and verifies that the platform admin GUI feature actually works.
//
// Tests share a single Life Algorithm org via module-level mutable state.
// The slug is timestamped per run so the spec is idempotent.
//
// Run:
//   E2E_BASE_URL=http://localhost:3001 \
//   JWT_SECRET=$(grep JWT_SECRET ../api/.env | cut -d= -f2) \
//   npx playwright test e2e/sprint-041-life-algorithm.spec.ts

import { test, expect, type Page } from '@playwright/test'
import * as crypto from 'node:crypto'

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3001'
const API = process.env.E2E_API_URL || 'http://localhost:8080'
const JWT_SECRET = process.env.JWT_SECRET!
const USER_ID = process.env.E2E_USER_ID || '00000000-0000-0000-0000-000000000002'

const RUN_ID = `${Date.now().toString(36)}`
const ORG_NAME = `Life Algorithm ${RUN_ID}`
const ORG_SLUG = `life-algorithm-${RUN_ID}`
const BILLING_EMAIL = `billing-${RUN_ID}@life-algorithm.test`
const ADMIN_EMAIL = `owner-${RUN_ID}@life-algorithm.test`

const ctx: { orgId: string | null } = { orgId: null }

test.skip(!JWT_SECRET, 'JWT_SECRET env var required')

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
  // #496 -- Create the Life Algorithm org via the GUI, with admin_email
  // ===========================================================================
  test('#496 create Life Algorithm org with admin_email', async ({ page }) => {
    await page.goto(`${BASE}/platform/orgs`)

    const newButton = page.getByTestId('orgs-new-org-button')
    await expect(newButton).toBeVisible({ timeout: 10000 })
    await newButton.click()

    const modal = page.getByTestId('orgs-new-org-modal')
    await expect(modal).toBeVisible()

    await page.getByTestId('orgs-new-name').fill(ORG_NAME)
    const slugField = page.getByTestId('orgs-new-slug')
    await slugField.click({ clickCount: 3 })
    await slugField.fill(ORG_SLUG)
    await page.getByTestId('orgs-new-type').selectOption('clinic')
    await page.getByTestId('orgs-new-billing-email').fill(BILLING_EMAIL)
    await page.getByTestId('orgs-new-admin-email').fill(ADMIN_EMAIL)
    await page.getByTestId('orgs-new-submit').click()

    await page.waitForURL(/\/platform\/orgs\/[a-f0-9-]{36}/, { timeout: 15000 })

    const url = page.url()
    const match = url.match(/\/platform\/orgs\/([a-f0-9-]{36})/)
    expect(match).not.toBeNull()
    ctx.orgId = match![1]

    await expect(page.getByRole('heading', { name: ORG_NAME })).toBeVisible({ timeout: 10000 })
  })

  // ===========================================================================
  // Round-2 fix: org type dropdown only shows the 3 canonical types
  // ===========================================================================
  test('org type dropdown has exactly 3 options (clinic, personal, platform)', async ({ page }) => {
    await page.goto(`${BASE}/platform/orgs`)
    await page.getByTestId('orgs-new-org-button').click()
    const select = page.getByTestId('orgs-new-type')
    const options = await select.locator('option').allTextContents()
    expect(options).toEqual(['clinic', 'personal', 'platform'])
  })

  // ===========================================================================
  // Round-2 fix: admin_email auto-creates the user AND assigns as org_owner
  // (verified by querying the API directly after the GUI create)
  // ===========================================================================
  test('admin_email auto-creates user and assigns as org_owner', async ({ request }) => {
    test.skip(!ctx.orgId, 'orgId from #496 required')
    const token = mintJwt()
    const res = await request.get(`${API}/admin/organizations/${ctx.orgId}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    const owner = (
      body.data as Array<{ email: string; role: string }>
    ).find((m) => m.email === ADMIN_EMAIL)
    expect(owner, `expected owner ${ADMIN_EMAIL} in members ${JSON.stringify(body.data)}`).toBeTruthy()
    expect(owner!.role).toBe('org_owner')
  })

  // ===========================================================================
  // #496b -- Verify the new org appears in the list (scoped via testid)
  // ===========================================================================
  test('#496b new org appears in the orgs list', async ({ page }) => {
    test.skip(!ctx.orgId, 'orgId from #496 required')
    await page.goto(`${BASE}/platform/orgs`)
    const row = page.getByTestId(`orgs-row-${ORG_SLUG}`)
    await expect(row).toBeVisible({ timeout: 10000 })
    await expect(row).toContainText(ORG_NAME)
  })

  // ===========================================================================
  // #499 -- Generate insight license + verify License tab renders
  // ===========================================================================
  test('#499 generate insight license + License tab renders form', async ({ page, request }) => {
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

    // Click into the License tab via the GUI to confirm it renders without
    // error (this is the user's "create new license do not show ... but
    // page returns an error" finding from round 2).
    await page.goto(`${BASE}/platform/orgs/${ctx.orgId}`)
    await page.getByTestId('org-tab-license').click()
    // The License tab loads the issued tier text somewhere
    await expect(page.locator('text=insight').first()).toBeVisible({ timeout: 10000 })
    // No console errors during the License tab render
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.waitForTimeout(500)
    expect(errors).toEqual([])
  })

  // ===========================================================================
  // Round-2 feature: License tab features picker has app filter dropdown
  // and the dropdown actually filters
  // ===========================================================================
  test('license features picker has app filter dropdown', async ({ page }) => {
    test.skip(!ctx.orgId, 'orgId from #496 required')
    await page.goto(`${BASE}/platform/orgs/${ctx.orgId}`)
    await page.getByTestId('org-tab-license').click()
    // Open the "Generate new license" form -- features picker is inside it.
    await page.getByTestId('license-generate-new-button').click()
    const filter = page.getByTestId('license-feature-app-filter')
    await expect(filter).toBeVisible({ timeout: 10000 })
    // Filter to sovereign-health, should remove _platform / sovereign-crm rows.
    await filter.selectOption('sovereign-health')
    await page.waitForTimeout(200)
    // shi.csv_export should still be visible, branding.custom_logo should not.
    await expect(page.getByTestId('license-feature-shi.csv_export')).toBeVisible()
    await expect(page.getByTestId('license-feature-branding.custom_logo')).toBeHidden()
  })

  // ===========================================================================
  // Round-2 feature: feature status badges render
  // ===========================================================================
  test('license features show status badges', async ({ page }) => {
    test.skip(!ctx.orgId, 'orgId from #496 required')
    await page.goto(`${BASE}/platform/orgs/${ctx.orgId}`)
    await page.getByTestId('org-tab-license').click()
    await page.getByTestId('license-generate-new-button').click()
    // Reset filter so all features show.
    await page.getByTestId('license-feature-app-filter').selectOption('')
    // shi.csv_export is 'live' per the static map.
    const csvBadge = page.getByTestId('license-feature-status-shi.csv_export')
    await expect(csvBadge).toBeVisible()
    await expect(csvBadge).toHaveText(/live/i)
    // shi.cohort_comparison is 'soon'.
    const cohortBadge = page.getByTestId('license-feature-status-shi.cohort_comparison')
    await expect(cohortBadge).toBeVisible()
    await expect(cohortBadge).toHaveText(/soon/i)
  })

  // ===========================================================================
  // Round-2 feature: feature tooltips appear on hover (CSS-only InlineTooltip)
  // ===========================================================================
  test('license feature tooltips appear on hover', async ({ page }) => {
    test.skip(!ctx.orgId, 'orgId from #496 required')
    await page.goto(`${BASE}/platform/orgs/${ctx.orgId}`)
    await page.getByTestId('org-tab-license').click()
    await page.getByTestId('license-generate-new-button').click()
    await page.getByTestId('license-feature-app-filter').selectOption('')
    // Hover the slug span which is the tooltip trigger.
    const featureRow = page.getByTestId('license-feature-shi.csv_export')
    await featureRow.locator('span.font-mono').first().hover()
    // The tooltip is hidden by default and shown on group-hover.
    const tooltip = page.getByTestId('license-feature-tooltip-shi.csv_export')
    await expect(tooltip).toBeVisible({ timeout: 2000 })
    await expect(tooltip).toContainText('shi.csv_export')
  })

  // ===========================================================================
  // #500 -- License history endpoint
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
  // #501 -- Add a member with auto-create
  // ===========================================================================
  test('#501 add member with auto-create user', async ({ request }) => {
    test.skip(!ctx.orgId, 'orgId from #496 required')
    const token = mintJwt()
    const memberEmail = `member-${RUN_ID}@life-algorithm.test`
    const res = await request.post(`${API}/admin/organizations/${ctx.orgId}/members`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { email: memberEmail, role: 'practitioner' },
    })
    expect(res.status(), `body: ${await res.text()}`).toBe(201)
    const body = await res.json()
    expect(body.data.was_invited).toBe(true)
    expect(body.data.role).toBe('practitioner')
  })

  // ===========================================================================
  // #503 -- Audit log API
  // ===========================================================================
  test('#503 audit log API returns entries', async ({ request }) => {
    test.skip(!ctx.orgId, 'orgId from #496 required')
    const token = mintJwt()
    const res = await request.get(`${API}/admin/organizations/${ctx.orgId}/audit`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
    const actions = (body.data as Array<{ action: string }>).map((e) => e.action)
    expect(actions).toEqual(expect.arrayContaining(['org.license.issue', 'org.member.add']))
  })

  // ===========================================================================
  // Round-2 fix: Audit tab in the GUI clicks and renders entries
  // (regression for "audit tab did not render")
  // ===========================================================================
  test('audit tab is clickable and renders entries', async ({ page }) => {
    test.skip(!ctx.orgId, 'orgId from #496 required')
    await page.goto(`${BASE}/platform/orgs/${ctx.orgId}`)
    // Click the Audit tab
    await page.getByTestId('org-tab-audit').click()
    // Wait for the audit log to load
    await expect(page.locator('text=Audit log').first()).toBeVisible({ timeout: 10000 })
    // We expect at least one row (org.license.issue or org.member.add from earlier tests).
    // The action column shows the action name -- look for one of them.
    await expect(
      page.locator('text=/org\\.(license\\.issue|member\\.add|create)/').first(),
    ).toBeVisible({ timeout: 10000 })
  })

  // ===========================================================================
  // Invoices API parity
  // ===========================================================================
  test('invoice draft can be created and discarded', async ({ request }) => {
    test.skip(!ctx.orgId, 'orgId from #496 required')
    const token = mintJwt()
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
    expect(create.status()).toBe(201)
    const created = await create.json()
    const invoiceId = created.data.id
    const del = await request.delete(
      `${API}/admin/organizations/${ctx.orgId}/invoices/${invoiceId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    expect(del.status()).toBe(200)
    expect((await del.json()).data.deleted).toBe(true)
  })

  test('invoice products list includes description and billing_period', async ({ request }) => {
    const token = mintJwt()
    const res = await request.get(`${API}/admin/invoice-products`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.length).toBe(7)
    const base = body.data.find((p: { slug: string }) => p.slug === 'shi-horizon-base')
    expect(base.billing_period).toBe('monthly')
    expect(base.description).toContain('Recurring monthly')
  })

  // ===========================================================================
  // Round-2 feature: DELETE org button works (hard delete in dev)
  // This test runs LAST because it deletes the shared ctx.orgId.
  // ===========================================================================
  test('zz delete org via Delete button (hard delete in dev mode)', async ({ page, request }) => {
    test.skip(!ctx.orgId, 'orgId from #496 required')
    const orgIdToDelete = ctx.orgId

    // Capture the confirm() dialog so the test doesn't hang. Set the
    // listener BEFORE navigation so it catches the first prompt.
    page.on('dialog', (dialog) => dialog.accept())

    await page.goto(`${BASE}/platform/orgs/${orgIdToDelete}`)
    const deleteBtn = page.getByTestId('org-delete-button')
    await expect(deleteBtn).toBeVisible({ timeout: 10000 })

    // Wait for the DELETE network response in parallel with the click so
    // we can prove the request fired regardless of whether the navigation
    // settles in time.
    const [delResponse] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/admin/organizations/${orgIdToDelete}`) &&
          r.request().method() === 'DELETE',
        { timeout: 15000 },
      ),
      deleteBtn.click(),
    ])
    expect(delResponse.status()).toBe(200)
    const delBody = await delResponse.json()
    expect(delBody.data.deleted).toBe(true)
    expect(delBody.data.mode).toBe('hard')

    // Verify the org is gone via the API.
    const token = mintJwt()
    const res = await request.get(`${API}/admin/organizations/${orgIdToDelete}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(404)

    // Clear ctx so subsequent tests in a re-run don't reference the dead org.
    ctx.orgId = null
  })
})
