import { defineConfig } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL || 'https://app.sovereignhealth.io'
const isStaging = BASE_URL.includes('demo.brickos.io') || BASE_URL.includes('demo.sovereignhealth.io')
const isLocalhost = BASE_URL.startsWith('http://localhost') || BASE_URL.startsWith('http://127.0.0.1')

// Sprint 048 #048-04: basic auth only on staging. Localhost + production
// are open (no staging gate). Keeps the same credentials file usable for
// both localhost and remote runs without leaking.
const httpCredentials = isStaging && !isLocalhost ? {
  username: 'helmut',
  password: 'JM8Lv97Ax3LiRDLMgYfXdw==',
} : undefined

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    ...(httpCredentials ? { httpCredentials } : {}),
  },
  projects: [
    // Sprint 044 #542: Auth setup runs first, saves session state.
    // All subsequent tests reuse the stored session -- no per-test login.
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: {
        ...(httpCredentials ? { httpCredentials } : {}),
      },
    },
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        // Reuse auth state from setup project
        storageState: 'e2e/.auth/session.json',
      },
      dependencies: ['setup'],
    },
    // Sprint 046 #577 fixture gap: DEMO_ADMIN (dev@sovereignhealth.io) is
    // not a member of test-clinic, so running the full 'chromium' project
    // against an org subdomain fails at auth.setup. This project skips
    // setup and is intended for redirect/status-code regression tests that
    // don't need an authed user. Track the member-fixture gap separately.
    {
      name: 'unauth',
      use: {
        browserName: 'chromium',
      },
    },
  ],
})
