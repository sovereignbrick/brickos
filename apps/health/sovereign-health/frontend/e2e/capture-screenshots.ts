import { chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const APP_URL = process.env.SCREENSHOT_URL || 'https://demo.sovereignhealth.io'
const EMAIL = 'optimized@sovereignhealth.io'
const PASSWORD = 'SovereignOptimal2026!'
const OUTPUT = path.join(__dirname, '../public/screenshots')
const WEBSITE_OUTPUT = path.join(__dirname, '../../../website/public/screenshots')

async function main() {
  for (const dir of [OUTPUT, WEBSITE_OUTPUT]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  }

  const browser = await chromium.launch({ headless: true })

  for (const locale of ['en', 'de'] as const) {
    const suffix = locale === 'de' ? '_DE' : '_EN'
    console.log(`\n=== ${locale.toUpperCase()} ===`)

    // Wait between sessions to avoid rate limiting
    if (locale === 'de') {
      console.log('Waiting 10s to avoid rate limit...')
      await new Promise(r => setTimeout(r, 10000))
    }

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    })
    const page = await context.newPage()

    // LOGIN via UI
    console.log('Logging in...')
    await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForSelector('input[type="email"]', { timeout: 10000 })
    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    await page.waitForTimeout(500)
    await page.click('button[type="submit"]')
    try {
      await page.waitForURL('**/dashboard', { timeout: 15000 })
      console.log('Logged in')
    } catch {
      console.error('Login failed')
      await context.close()
      continue
    }

    // Now set locale cookie for this session
    await context.addCookies([{
      name: 'locale', value: locale,
      domain: new URL(APP_URL).hostname, path: '/',
    }])
    await page.waitForTimeout(2000)

    // Helper: capture + copy
    async function capture(name: string) {
      const file = path.join(OUTPUT, `${name}.png`)
      await page.screenshot({ path: file, fullPage: false })
      fs.copyFileSync(file, path.join(WEBSITE_OUTPUT, `${name}.png`))
      console.log(`  ${name}.png (${Math.round(fs.statSync(file).size / 1024)}KB)`)
    }

    // GROUP 1: Dashboard & Overview
    await page.goto(`${APP_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForTimeout(3000)
    await capture(`dashboard_zones${suffix}`)

    await page.goto(`${APP_URL}/zones/energy_metabolic`, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForTimeout(3000)
    await capture(`dashboard_zone_energy${suffix}`)

    await page.evaluate(() => window.scrollBy(0, 600))
    await page.waitForTimeout(1000)
    await capture(`dashboard_zone_scroll${suffix}`)

    // GROUP 2: Markers & Health Zones
    await page.goto(`${APP_URL}/markers/glucose`, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForTimeout(3000)
    await capture(`marker_glucose${suffix}`)

    await page.evaluate(() => window.scrollBy(0, 800))
    await page.waitForTimeout(1000)
    await capture(`marker_glucose_scroll1${suffix}`)

    await page.evaluate(() => window.scrollBy(0, 800))
    await page.waitForTimeout(1000)
    await capture(`marker_glucose_scroll2${suffix}`)

    // GROUP 3: Dr. Alex & Search
    await page.goto(`${APP_URL}/doctor-chat`, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForTimeout(3000)
    await capture(`dr_alex_main${suffix}`)

    // Try clicking first conversation for chat view
    try {
      const conv = page.locator('.truncate, [class*="conversation"]').first()
      if (await conv.isVisible({ timeout: 2000 })) {
        await conv.click()
        await page.waitForTimeout(2000)
      }
    } catch { /* no conversations */ }
    await capture(`dr_alex_chat${suffix}`)

    await page.goto(`${APP_URL}/search?q=glucose`, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForTimeout(3000)
    await capture(`search_results${suffix}`)

    // GROUP 4: Measurements & Trends
    await page.goto(`${APP_URL}/measurements`, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForTimeout(3000)
    await capture(`measurements_history${suffix}`)

    await page.goto(`${APP_URL}/trends`, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForTimeout(3000)
    await capture(`trends_chart${suffix}`)

    await page.goto(`${APP_URL}/measurements/new`, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForTimeout(2000)
    await capture(`measurements_new${suffix}`)

    // GROUP 5: Settings
    await page.goto(`${APP_URL}/settings`, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForTimeout(3000)
    await capture(`settings_profile${suffix}`)

    // Click Devices tab
    try {
      const devTab = page.locator('button').filter({ hasText: /Devices|Geräte/i }).first()
      if (await devTab.isVisible({ timeout: 2000 })) {
        await devTab.click()
        await page.waitForTimeout(2000)
      }
    } catch { /* */ }
    await capture(`settings_devices${suffix}`)

    // Click Thresholds/Privacy tab for variety
    try {
      const tab = page.locator('button').filter({ hasText: /Thresholds|Schwellenwerte|Privacy|Datenschutz/i }).first()
      if (await tab.isVisible({ timeout: 2000 })) {
        await tab.click()
        await page.waitForTimeout(2000)
      }
    } catch { /* */ }
    await capture(`settings_lifestyle${suffix}`)

    await context.close()
  }

  await browser.close()
  console.log('\nDone!')
}

main().catch(console.error)
