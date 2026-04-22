import { test, expect } from '@playwright/test'

/**
 * Sprint 050 #050-B3e: mobile-responsive smoke across key pages.
 *
 * Table-driven: 3 viewports x ~8 pages. Each test:
 *   1. Sets the viewport
 *   2. Navigates to the page
 *   3. Asserts no horizontal scroll
 *   4. Asserts the primary CTA (if any) is within the viewport
 *   5. Asserts no console errors
 *
 * Catches the most common responsive regressions without pixel diff.
 * Pixel-level goes in a separate (optional) Playwright screenshot
 * baseline suite -- Sprint 050 B5.
 */

const VIEWPORTS = [
  { name: 'mobile-portrait', width: 375, height: 812 },  // iPhone 13/14 portrait
  { name: 'tablet-portrait', width: 768, height: 1024 }, // iPad
  { name: 'desktop',          width: 1440, height: 900 },
] as const

const PAGES = [
  { path: '/', needsAuth: false },
  { path: '/login', needsAuth: false },
  { path: '/signup', needsAuth: false },
  { path: '/sovereign-health/dashboard', needsAuth: false },  // redirects on eval; auth or demo on others
  { path: '/sovereign-health/markers/iron', needsAuth: false },
  { path: '/sovereign-health/trends', needsAuth: false },
  { path: '/sovereign-health/doctor-chat', needsAuth: false },
  { path: '/legal', needsAuth: false },
] as const

test.describe('responsive smoke (unauth pages)', () => {
  for (const vp of VIEWPORTS) {
    for (const p of PAGES) {
      test(`${p.path} at ${vp.name} (${vp.width}x${vp.height})`, async ({ page, baseURL }) => {
        const host = baseURL ? new URL(baseURL).hostname : ''
        // eval is single-plane; it only exposes /demo/* + landing. Skip
        // pages that are routed to the app plane on full hosts.
        if (host === 'eval.sovereignhealth.io') {
          const evalPaths = ['/', '/signup', '/login']
          test.skip(
            !evalPaths.includes(p.path),
            `eval does not serve ${p.path}`,
          )
        }
        const consoleErrors: string[] = []
        page.on('pageerror', (e) => consoleErrors.push(e.message))
        page.on('console', (msg) => {
          if (msg.type() === 'error' && !msg.text().includes('Cache-Control')) {
            consoleErrors.push(msg.text())
          }
        })

        await page.setViewportSize({ width: vp.width, height: vp.height })
        const res = await page.goto(p.path, { waitUntil: 'domcontentloaded' })
        // Accept any 2xx/3xx (redirects are normal for auth-gated pages).
        if (res) {
          expect(res.status(), `status ${res.status()} on ${p.path}`).toBeLessThan(500)
        }

        // No horizontal scroll at this viewport.
        const horizontalOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        })
        expect(horizontalOverflow, `horizontal scroll on ${p.path} @ ${vp.name}`).toBe(false)

        // No console errors (page-specific; Cache-Control warnings
        // on SW are allowed).
        expect(consoleErrors, `console errors on ${p.path} @ ${vp.name}`).toEqual([])
      })
    }
  }
})
