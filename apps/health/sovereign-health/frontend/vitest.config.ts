import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Sprint 049 #049-27: pin the TZ so date-format.test.ts expectations
    // (which assume CET local time) work regardless of the host machine's
    // timezone. Vitest workers don't always inherit TZ from the parent
    // shell; setting it here makes the suite TZ-independent.
    env: {
      TZ: process.env.TZ || 'Europe/Berlin',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
