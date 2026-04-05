import { chromium } from '@playwright/test'
import path from 'path'

const BASE = process.env.SCREENSHOT_URL || 'https://app.sovereignhealth.io'
const OUTPUT = path.join(__dirname, '../public/screenshots')

const PAGES = [
  { name: 'dashboard', path: '/dashboard?demo=true&profile=optimized' },
  { name: 'marker_glucose', path: '/markers/glucose?demo=true&profile=optimized' },
  { name: 'zones_metabolic', path: '/zones/energy_metabolic?demo=true&profile=optimized' },
  { name: 'trends', path: '/trends?demo=true&profile=optimized' },
  { name: 'measurements', path: '/measurements?demo=true&profile=optimized' },
  { name: 'search', path: '/search?q=glucose' },
]

async function main() {
  const browser = await chromium.launch({ headless: true })

  for (const locale of ['en', 'de']) {
    const suffix = locale === 'de' ? '_DE' : '_EN'
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: locale,
      extraHTTPHeaders: { 'Accept-Language': locale },
    })

    // Set locale cookie
    await context.addCookies([{
      name: 'locale',
      value: locale,
      domain: new URL(BASE).hostname,
      path: '/',
    }])

    const page = await context.newPage()

    for (const { name, path: pagePath } of PAGES) {
      try {
        await page.goto(`${BASE}${pagePath}`, { waitUntil: 'networkidle', timeout: 30000 })
        await page.waitForTimeout(2000) // Wait for animations/data loading
        await page.screenshot({
          path: `${OUTPUT}/${name}${suffix}.png`,
          fullPage: false,
        })
        console.log(`Captured: ${name}${suffix}.png`)
      } catch (err) {
        console.error(`Failed: ${name}${suffix} - ${err}`)
      }
    }

    await context.close()
  }

  await browser.close()
}

main()
