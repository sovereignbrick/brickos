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
    url => url.pathname.startsWith(returnUrl) || url.pathname === '/dashboard',
    { timeout: 15000 },
  )
}

/** Admin credentials for E2E tests.
 * - Local dev: dev@sovereignhealth.io / SovereignDev1 (bootstrap migration)
 * - Staging:   demo@sovereignhealth.io / SovereignDemo1 (seed migration)
 * Override via E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD env vars.
 */
export const DEMO_ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL || 'dev@sovereignhealth.io',
  password: process.env.E2E_ADMIN_PASSWORD || 'SovereignDev1',
}
