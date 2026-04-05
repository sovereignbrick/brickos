import { chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const BASE = process.env.SCREENSHOT_URL || 'https://app.sovereignhealth.io'
const API = process.env.SCREENSHOT_API || 'https://api.sovereignhealth.io'
const OUTPUT = path.join(__dirname, '../public/screenshots')

const EMAIL = 'optimized@sovereignhealth.io'
const PASSWORD = 'SovereignOptimal2026!'

interface ScreenshotDef {
  name: string
  path: string
  scrollY?: number
  /** Optional: click this selector before capturing */
  click?: string
  /** Extra wait time after navigation */
  extraWait?: number
}

const SCREENSHOTS: ScreenshotDef[] = [
  // Group 1: Dashboard & Overview
  { name: 'dashboard_zones', path: '/dashboard' },
  { name: 'dashboard_zone_energy', path: '/zones/energy_metabolic' },
  { name: 'dashboard_zone_scroll', path: '/zones/energy_metabolic', scrollY: 600 },

  // Group 2: Markers & Health Zones
  { name: 'marker_glucose', path: '/markers/glucose' },
  { name: 'marker_glucose_scroll1', path: '/markers/glucose', scrollY: 600 },
  { name: 'marker_glucose_scroll2', path: '/markers/glucose', scrollY: 1200 },

  // Group 3: Dr. Alex & Search
  { name: 'dr_alex_main', path: '/doctor-chat' },
  { name: 'dr_alex_chat', path: '/doctor-chat', extraWait: 2000, click: '[data-testid="conversation-item"]:first-child, .conversation-list a:first-child, .chat-list button:first-child' },
  { name: 'search_results', path: '/search?q=glucose' },

  // Group 4: Measurements & Trends
  { name: 'measurements_history', path: '/measurements' },
  { name: 'trends_chart', path: '/trends' },
  { name: 'measurements_new', path: '/measurements/new' },

  // Group 5: User Settings
  { name: 'settings_profile', path: '/settings' },
  { name: 'settings_devices', path: '/settings?tab=devices' },
  { name: 'settings_lifestyle', path: '/settings', scrollY: 800 },
]

async function getAuthToken(): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) {
    throw new Error(`Login failed: ${res.status} ${await res.text()}`)
  }
  const body = await res.json()
  return body.data.token
}

async function main() {
  // Clean old screenshots
  if (fs.existsSync(OUTPUT)) {
    const oldFiles = fs.readdirSync(OUTPUT).filter(f => f.endsWith('.png'))
    for (const f of oldFiles) {
      fs.unlinkSync(path.join(OUTPUT, f))
      console.log(`Deleted old: ${f}`)
    }
  } else {
    fs.mkdirSync(OUTPUT, { recursive: true })
  }

  // Get auth token via API
  console.log('Logging in...')
  const token = await getAuthToken()
  console.log('Login successful')

  const browser = await chromium.launch({ headless: true })

  for (const locale of ['en', 'de'] as const) {
    const suffix = locale === 'de' ? '_DE' : '_EN'
    console.log(`\n--- Capturing ${locale.toUpperCase()} screenshots ---`)

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale,
      extraHTTPHeaders: { 'Accept-Language': locale },
    })

    const domain = new URL(BASE).hostname

    // Set auth token and locale cookies
    await context.addCookies([
      { name: 'locale', value: locale, domain, path: '/' },
      { name: 'auth_token', value: token, domain, path: '/' },
    ])

    const page = await context.newPage()

    // Navigate to dashboard first to ensure auth state is loaded
    try {
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(3000)
    } catch (err) {
      console.error(`Initial page load failed, trying UI login...`)
      // Fallback: login via UI
      await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.fill('input[type="email"]', EMAIL)
      await page.fill('input[type="password"]', PASSWORD)
      await page.click('button[type="submit"]')
      try {
        await page.waitForURL('**/dashboard', { timeout: 15000 })
      } catch {
        console.error('UI login failed, continuing anyway...')
      }
      await page.waitForTimeout(3000)
    }

    for (const shot of SCREENSHOTS) {
      try {
        // Only navigate if the URL is different from current
        const targetUrl = `${BASE}${shot.path}`
        if (page.url() !== targetUrl) {
          await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 })
        }

        await page.waitForTimeout(shot.extraWait || 3000)

        if (shot.click) {
          try {
            await page.click(shot.click, { timeout: 5000 })
            await page.waitForTimeout(2000)
          } catch {
            console.log(`    Click selector not found for ${shot.name}, using current view`)
          }
        }

        if (shot.scrollY) {
          await page.evaluate((y) => window.scrollTo(0, y), shot.scrollY)
          await page.waitForTimeout(1000)
        }

        await page.screenshot({
          path: `${OUTPUT}/${shot.name}${suffix}.png`,
          fullPage: false,
        })
        console.log(`  Captured: ${shot.name}${suffix}.png`)
      } catch (err) {
        console.error(`  Failed: ${shot.name}${suffix} - ${err}`)
        // Create a placeholder image (1x1 dark pixel PNG)
        const placeholder = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'base64'
        )
        fs.writeFileSync(`${OUTPUT}/${shot.name}${suffix}.png`, placeholder)
        console.log(`  Created placeholder: ${shot.name}${suffix}.png`)
      }
    }

    await context.close()
  }

  await browser.close()
  console.log('\nDone!')
}

main()
