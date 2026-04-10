// Sprint 040 localhost smoke E2E.
//
// Injects a pre-signed JWT cookie (requires JWT_SECRET from api/.env) and
// walks through the 6 Sprint 040 admin screens, asserting each one renders
// its key strings without runtime errors. This is the browser equivalent
// of the curl-based backend smoke test -- the goal is to catch any
// client-side bugs (bad type contract, missing i18n key, broken import,
// hydration mismatch) that tsc + pnpm build don't.

import { test, expect, type Page } from '@playwright/test'
import * as crypto from 'node:crypto'

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3001'
const JWT_SECRET = process.env.JWT_SECRET!
const USER_ID = process.env.E2E_USER_ID || '00000000-0000-0000-0000-000000000002'

test.skip(!JWT_SECRET, 'JWT_SECRET env var required')

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
    Buffer.from(JSON.stringify(o))
      .toString('base64url')
      .replace(/=+$/, '')
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

test.describe('Sprint 040 admin smoke', () => {
  test.beforeEach(async ({ page }) => {
    await setAuth(page)
  })

  test('#477 Orgs list view renders', async ({ page }) => {
    await page.goto(`${BASE}/platform/orgs`)
    // Loading state clears, table header appears
    await expect(page.getByRole('heading', { name: /Organizations|Organisationen/ })).toBeVisible({
      timeout: 10000,
    })
    // Filters present
    await expect(page.getByPlaceholder(/Search by name|Suche nach Name/)).toBeVisible()
  })

  test('#478/#479/#480/#481 Org detail loads with all 5 tab labels', async ({
    page,
    request,
  }) => {
    // Get the first org id from the API
    const token = mintJwt()
    const res = await request.get(`http://localhost:8080/admin/organizations?page=1&per_page=1`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    const orgId = json.data?.[0]?.id
    test.skip(!orgId, 'no orgs in local DB')

    await page.goto(`${BASE}/platform/orgs/${orgId}`)
    // Each of the 5 functional tabs from Sprint 040 should be clickable
    for (const label of ['Overview', 'Members', 'License', 'Branding', 'Invoices']) {
      await expect(
        page.getByRole('button', { name: new RegExp(label, 'i') }).first(),
      ).toBeVisible({ timeout: 10000 })
    }
  })

  test('#483 /platform/licensing tier config page renders', async ({ page }) => {
    await page.goto(`${BASE}/platform/licensing`)
    await expect(
      page.getByRole('heading', { name: /Tier configuration|Tarif-Konfiguration/ }),
    ).toBeVisible({ timeout: 10000 })
  })

  test('#483 /platform/features feature registry page renders', async ({ page }) => {
    await page.goto(`${BASE}/platform/features`)
    await expect(
      page.getByRole('heading', { name: /Feature registry|Feature-Registry/ }),
    ).toBeVisible({ timeout: 10000 })
    // The page should render at least one app namespace group
    // (41 features expected from the SQL smoke test)
    await expect(page.locator('text=sovereign-health').first()).toBeVisible()
  })

  test('#483 /platform/licensing/revocations renders', async ({ page }) => {
    await page.goto(`${BASE}/platform/licensing/revocations`)
    await expect(
      page.getByRole('heading', { name: /Revocation list|Widerrufsliste/ }),
    ).toBeVisible({ timeout: 10000 })
  })

  test('#482 /platform/users/dormant renders', async ({ page }) => {
    await page.goto(`${BASE}/platform/users/dormant`)
    await expect(
      page.getByRole('heading', { name: /Dormant accounts|Inaktive Konten/ }),
    ).toBeVisible({ timeout: 10000 })
  })

  test('no console errors on /platform/orgs', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        // Ignore known-harmless extension/warn noise
        if (!text.includes('Extension') && !text.includes('DevTools')) {
          errors.push(text)
        }
      }
    })
    await page.goto(`${BASE}/platform/orgs`)
    await page.waitForTimeout(2000)
    expect(errors, `console errors: ${errors.join('\n')}`).toEqual([])
  })
})
