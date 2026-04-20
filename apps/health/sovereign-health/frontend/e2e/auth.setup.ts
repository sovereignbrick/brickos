import { test as setup } from '@playwright/test'
import { loginViaUI, pickCredentialForBaseURL } from './helpers/auth'

const AUTH_FILE = 'e2e/.auth/session.json'

/**
 * Sprint 044 #542: Global auth setup. Logs in once, saves browser state
 * (cookies + localStorage) so subsequent tests skip login -- prevents
 * rate limiter cascade when running 10+ tests.
 *
 * Sprint 047 #578: Picks the right credential based on E2E_BASE_URL.
 * On org subdomains (test-clinic.*) -> TEST_CLINIC_OWNER (Sprint 044's
 * login handler returns 403 for non-members on an org subdomain, so a
 * plain DEMO_ADMIN login would fail). On platform hosts -> DEMO_ADMIN.
 */
setup('authenticate as admin', async ({ page, baseURL }) => {
  const cred = pickCredentialForBaseURL(baseURL)
  await loginViaUI(page, cred.email, cred.password)
  await page.context().storageState({ path: AUTH_FILE })
})
