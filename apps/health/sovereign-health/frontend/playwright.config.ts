import { defineConfig } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL || 'https://app.sovereignhealth.io'
const isStaging = BASE_URL.includes('demo.brickos.io') || BASE_URL.includes('demo.sovereignhealth.io')

const httpCredentials = isStaging ? {
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
  ],
})
