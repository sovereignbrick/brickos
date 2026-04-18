import { defineConfig } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL || 'https://app.sovereignhealth.io'
const isStaging = BASE_URL.includes('demo.brickos.io') || BASE_URL.includes('demo.sovereignhealth.io')

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    // Basic auth for staging domains (behind nginx basic auth)
    ...(isStaging ? {
      httpCredentials: {
        username: 'helmut',
        password: 'JM8Lv97Ax3LiRDLMgYfXdw==',
      },
    } : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
})
