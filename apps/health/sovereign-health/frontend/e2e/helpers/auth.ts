import { APIRequestContext } from '@playwright/test'

const API = process.env.E2E_API_URL || 'https://app.brickos.io/api'

export interface TestUser {
  email: string
  password: string
  token: string
  userId: string
}

/**
 * Login with existing credentials. Returns token + user info.
 */
export async function login(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<TestUser> {
  const res = await request.post(`${API}/auth/login`, {
    data: { email, password },
  })
  if (!res.ok()) {
    throw new Error(`Login failed: ${res.status()} ${await res.text()}`)
  }
  const body = await res.json()
  return {
    email,
    password,
    token: body.data.token,
    userId: body.data.user.id,
  }
}

/**
 * Create an authenticated request context with the user's token.
 */
export function authHeaders(user: TestUser): Record<string, string> {
  return {
    Authorization: `Bearer ${user.token}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Login via the UI (fills login form and submits).
 *
 * Sprint 046 #570: post-login landing depends on plane. End-user plane
 * lands on /dashboard; admin plane lands on /platform/org. The helper
 * waits for EITHER so it works against both BASE_URLs.
 */
export async function loginViaUI(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button:has-text("Sign in")')
  await page.waitForURL(
    url => {
      const p = typeof url === 'string' ? url : url.pathname
      return p.includes('/dashboard') || p.includes('/platform')
    },
    { timeout: 15000 },
  )
}

/**
 * Login via UI with a return URL. Waits for the return page to load.
 */
export async function loginAndNavigate(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
  returnUrl: string,
): Promise<void> {
  await page.goto(`/login?return=${encodeURIComponent(returnUrl)}`)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button:has-text("Sign in")')
  await page.waitForURL(
    url =>
      url.pathname.startsWith(returnUrl) ||
      url.pathname === '/dashboard' ||
      url.pathname === '/sovereign-health/dashboard',
    { timeout: 15000 },
  )
}

/** Platform admin credentials for E2E tests -- used when E2E_BASE_URL
 * points at `app.brickos.io`, `demo.brickos.io`, or the default SHI
 * platform host (no specific org scope).
 * - Local dev: dev@sovereignhealth.io / SovereignDev1 (bootstrap migration)
 * - Staging:   demo@sovereignhealth.io / SovereignDemo1 (seed migration)
 * Override via E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD env vars.
 */
export const DEMO_ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL || 'dev@sovereignhealth.io',
  password: process.env.E2E_ADMIN_PASSWORD || 'SovereignDev1',
}

/** Sprint 047 #578: org_owner credential for the `test-clinic` org, used
 * when E2E_BASE_URL points at `{slug}.brickos.io` / `{slug}.sovereignhealth.io`
 * org subdomains. Sprint 044's login handler returns 403 for non-members
 * on an org subdomain, so we need a real test-clinic member to exercise
 * the authed tests.
 *
 * The test-clinic org was manually created on staging for Sprint 045 RC.
 * `test-clinic-admin@clinic.com` is the canonical org_owner. For local
 * dev, there's no default seed yet -- set E2E_TEST_CLINIC_EMAIL +
 * E2E_TEST_CLINIC_PASSWORD to match your local test-clinic fixture.
 */
export const TEST_CLINIC_OWNER = {
  email: process.env.E2E_TEST_CLINIC_EMAIL || 'test-clinic-admin@clinic.com',
  password: process.env.E2E_TEST_CLINIC_PASSWORD || 'TestClinicAdmin1',
}

/** Pick the right credential based on the base URL's hostname.
 * - org subdomain -> TEST_CLINIC_OWNER (must be a member of that org)
 * - platform host / default -> DEMO_ADMIN
 */
export function pickCredentialForBaseURL(baseURL?: string): { email: string; password: string } {
  const host = baseURL ? new URL(baseURL).hostname.toLowerCase() : ''
  const isOrgSubdomain =
    /^test-clinic\./.test(host) ||
    (host.endsWith('.brickos.io') && !host.startsWith('app.') && !host.startsWith('demo.') && !host.startsWith('api')) ||
    (host.endsWith('.sovereignhealth.io') && !host.startsWith('app.') && !host.startsWith('demo.') && !host.startsWith('api'))
  return isOrgSubdomain ? TEST_CLINIC_OWNER : DEMO_ADMIN
}
