import { test as setup } from '@playwright/test'
import { loginViaUI, DEMO_ADMIN } from './helpers/auth'

const AUTH_FILE = 'e2e/.auth/session.json'

/**
 * Sprint 044 #542: Global auth setup.
 * Logs in once before all tests, saves browser state (cookies + localStorage)
 * so subsequent tests skip login entirely. Prevents rate limiter cascade
 * when running 10+ tests that each call loginAndNavigate.
 */
setup('authenticate as admin', async ({ page }) => {
  await loginViaUI(page, DEMO_ADMIN.email, DEMO_ADMIN.password)
  await page.context().storageState({ path: AUTH_FILE })
})
