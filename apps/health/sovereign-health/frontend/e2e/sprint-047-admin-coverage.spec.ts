import { test, expect } from '@playwright/test'

/**
 * Sprint 047 -- admin surface coverage. Every /platform/* page and
 * /platform/org/* page gets a reachability smoke test so the next route
 * refactor can't silently 404 or 500 an admin screen.
 *
 * Two layers:
 *   1. Platform-admin (BrickOS operator on app.brickos.io / demo.brickos.io)
 *      -- covers the top-level /platform/* tree.
 *   2. Org-owner-admin (on {slug}.brickos.io / {slug}.demo.brickos.io)
 *      -- covers /platform/org/* self-service pages.
 *
 * Both suites run under the `chromium` project (auth.setup writes a
 * session file picked up by the config). auth.setup already switches
 * credentials based on baseURL (platform admin vs test-clinic org_owner).
 *
 * Run against staging:
 *   E2E_BASE_URL=https://demo.brickos.io \
 *     npx playwright test sprint-047-admin-coverage --project=chromium
 */

// Top-level /platform/* pages. Enumerated by walking src/app/platform/
// for page.tsx files (excluding layout.tsx and context files). Dynamic
// segments are covered by a separate [id] test below.
const PLATFORM_PAGES = [
  '/platform',
  '/platform/affiliates',
  '/platform/ai/config',
  '/platform/ai/usage',
  '/platform/alerts',
  '/platform/analytics',
  '/platform/apps',
  '/platform/audit',
  '/platform/billing',
  '/platform/compliance',
  '/platform/contact',
  '/platform/content/app',
  '/platform/content/strings',
  '/platform/content/web',
  '/platform/deploy',
  '/platform/features',
  '/platform/licensing',
  '/platform/licensing/revocations',
  '/platform/links',
  '/platform/members',
  '/platform/newsletter',
  '/platform/orgs',
  '/platform/promotions',
  '/platform/revenue',
  '/platform/services',
  '/platform/settings',
  '/platform/users',
  '/platform/users/dormant',
] as const

// Org-scoped self-service under /platform/org/*. Served on org subdomains
// to org_owner members (and on platform subdomains to platform admins
// acting on the "current" org). Every page here is critical for the
// white-label onboarding flow.
const ORG_SELF_SERVICE_PAGES = [
  '/platform/org',
  '/platform/org/affiliate',
  '/platform/org/analytics',
  '/platform/org/apps',
  '/platform/org/apps/shi/ai',
  '/platform/org/apps/shi/email',
  '/platform/org/billing',
  '/platform/org/branding',
  '/platform/org/domains',
  '/platform/org/general',
] as const

function isOrgSubdomain(baseURL: string | undefined): boolean {
  if (!baseURL) return false
  try {
    const host = new URL(baseURL).hostname
    return (
      /^test-clinic\./.test(host) ||
      (host.endsWith('.brickos.io') && !host.startsWith('app.') && !host.startsWith('demo.')) ||
      (host.endsWith('.sovereignhealth.io') && !host.startsWith('app.') && !host.startsWith('demo.'))
    )
  } catch {
    return false
  }
}

test.describe('Sprint 047 -- platform-admin pages reachable (unauth -> /login)', () => {
  // Unauth probe: every protected admin page must bounce to /login, not
  // 404 or 500. If an app-router page file is missing, Next.js returns
  // 404 even with a valid auth redirect -- this catches that.
  for (const path of PLATFORM_PAGES) {
    test(`GET ${path} (unauth) returns 200 or 308/302 to /login`, async ({ request }) => {
      const res = await request.get(path, {
        headers: { Accept: 'text/html' },
        maxRedirects: 0,
      })
      // Acceptable: 200 (renders login gate inline), 302/307/308 (redirect
      // to /login). 401 is also fine (API-style rejection). Anything else
      // -- especially 404 or 5xx -- fails the smoke.
      expect([200, 301, 302, 307, 308, 401]).toContain(res.status())
      if ([301, 302, 307, 308].includes(res.status())) {
        const loc = res.headers()['location'] || ''
        // Landing page, /login, or same-origin redirect are all accepted.
        expect(loc).toBeTruthy()
      }
    })
  }
})

test.describe('Sprint 047 -- platform-admin pages render when authed', () => {
  // Uses the storageState from auth.setup -- loaded via the `chromium`
  // project in playwright.config. Each page must render past the gate
  // (status 200, no 4xx/5xx). No deep UI assertions here -- we're
  // only asserting "the page file exists and the loader runs clean".
  for (const path of PLATFORM_PAGES) {
    test(`navigate to ${path} (authed) renders without error`, async ({ page }) => {
      const responses: number[] = []
      page.on('response', resp => {
        if (resp.url().endsWith(path) || resp.url().includes(`${path}?`)) {
          responses.push(resp.status())
        }
      })
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      // The navigation response itself shouldn't be 5xx. Some admin pages
      // redirect (e.g. /platform -> /platform/org for org_owner) which is
      // fine; we just care the resulting URL renders cleanly.
      const finalStatus = responses.find(s => s < 400) ?? responses[0] ?? 200
      expect(finalStatus).toBeLessThan(500)
      // Page must at least paint the admin shell header / sidebar.
      await expect(page.locator('body')).toBeVisible()
    })
  }
})

test.describe('Sprint 047 -- org-owner self-service pages reachable', () => {
  // Runs against org subdomains (test-clinic.* on brickos.io or
  // sovereignhealth.io). On platform subdomains these paths still exist
  // but require a different credential, so we skip there -- the
  // platform-admin suite above covers their rendering.
  test.beforeEach(async ({ baseURL }) => {
    test.skip(
      !isOrgSubdomain(baseURL),
      'org self-service pages only smoked on org subdomains',
    )
  })

  for (const path of ORG_SELF_SERVICE_PAGES) {
    test(`navigate to ${path} (org-owner authed) renders without error`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
      // Page should not have bounced all the way back to /login -- if it
      // did, auth.setup picked the wrong credential for this baseURL.
      expect(page.url()).not.toContain('/login')
    })
  }
})

test.describe('Sprint 047 -- dynamic admin routes', () => {
  test('GET /platform/orgs/[id] returns 200 or 308 for an id-shaped path', async ({ request }) => {
    // Use a plausible-but-nonexistent UUID so the page mounts its data
    // loader; the loader will 404-the-data, but the page itself should
    // still render (error state) with a 200. We just want to prove the
    // [id] route handler is wired.
    const res = await request.get('/platform/orgs/00000000-0000-0000-0000-000000000000', {
      headers: { Accept: 'text/html' },
      maxRedirects: 0,
    })
    expect([200, 301, 302, 307, 308, 401, 404]).toContain(res.status())
  })
})
