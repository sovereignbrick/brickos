import { defineConfig } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL || 'https://app.sovereignhealth.io'
const isBrickosStaging = BASE_URL.includes('demo.brickos.io')

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    // Basic auth for demo.brickos.io (staging behind nginx basic auth)
    ...(isBrickosStaging ? {
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
