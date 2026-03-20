#!/usr/bin/env node
// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Fetches all translatable content from the API and writes static JSON files
// used by the website at build time. Called automatically via `prebuild` in
// package.json before every `pnpm build`.
//
// Usage:
//   node scripts/fetch-content.js                     # Uses API_URL env or default
//   API_URL=https://api.sovereignhealth.io node scripts/fetch-content.js
//
// Output files:
//   src/data/content-en.json   — Full EN content (zones, markers, tiers, etc.)
//   src/data/content-de.json   — Full DE content
//   src/data/features-en.json  — Tier features matrix (EN)
//   src/data/features-de.json  — Tier features matrix (DE)
//   data/tiers.json            — Tier pricing data
//   data/zones.json            — Zone metadata

const fs = require('fs')
const path = require('path')

const API_URL = process.env.API_URL
  || process.env.NEXT_PUBLIC_API_URL
  || 'http://localhost:8080'

const LOCALES = ['en', 'de']

// Retry-capable fetch with timeout
async function apiFetch(endpoint, retries = 2) {
  const url = `${API_URL}${endpoint}`
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeout)
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      return await res.json()
    } catch (err) {
      if (attempt === retries) {
        console.warn(`  WARN: ${endpoint} failed after ${retries + 1} attempts: ${err.message}`)
        return null
      }
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
    }
  }
}

async function fetchContentForLocale(locale) {
  console.log(`  Fetching ${locale.toUpperCase()} content...`)

  const [zones, markers, tiers, dietProtocols, eatingPatterns, foodCategories, uiStrings, webContent] =
    await Promise.all([
      apiFetch(`/v1/content/zones?locale=${locale}`),
      apiFetch(`/v1/content/markers?locale=${locale}`),
      apiFetch(`/v1/content/tiers?locale=${locale}`),
      apiFetch(`/v1/content/diet-protocols?locale=${locale}`),
      apiFetch(`/v1/content/eating-patterns?locale=${locale}`),
      apiFetch(`/v1/content/food-categories?locale=${locale}`),
      apiFetch(`/v1/content/ui-strings?locale=${locale}`),
      apiFetch(`/v1/content/web?locale=${locale}`),
    ])

  return {
    locale,
    fetchedAt: new Date().toISOString(),
    zones: zones?.data ?? [],
    markers: markers?.data ?? [],
    tiers: tiers?.data ?? [],
    dietProtocols: dietProtocols?.data ?? [],
    eatingPatterns: eatingPatterns?.data ?? [],
    foodCategories: foodCategories?.data ?? [],
    uiStrings: uiStrings?.data ?? [],
    webContent: webContent?.data ?? [],
  }
}

async function fetchFeaturesForLocale(locale) {
  const res = await apiFetch(`/v1/content/tiers?locale=${locale}&include_features=true`)
  return res ?? { data: [], error: null }
}

function writeJson(filePath, data) {
  const full = path.resolve(__dirname, '..', filePath)
  const dir = path.dirname(full)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(full, JSON.stringify(data, null, 2) + '\n')
  const size = (fs.statSync(full).size / 1024).toFixed(1)
  console.log(`  OK: ${filePath} (${size} KB)`)
}

async function main() {
  console.log(`\nFetch Content — Sovereign Health Intelligence`)
  console.log(`API: ${API_URL}\n`)

  // Check API is reachable
  const health = await apiFetch('/health')
  if (!health) {
    console.warn('\n  WARNING: API not reachable. Using existing static files.\n')
    process.exit(0) // Don't fail the build — use stale files
  }
  console.log(`  API version: ${health.version}\n`)

  let success = true

  for (const locale of LOCALES) {
    try {
      // Full content bundle
      const content = await fetchContentForLocale(locale)
      writeJson(`src/data/content-${locale}.json`, content)

      // Features matrix
      const features = await fetchFeaturesForLocale(locale)
      writeJson(`src/data/features-${locale}.json`, features)
    } catch (err) {
      console.error(`  ERROR: ${locale} content fetch failed: ${err.message}`)
      success = false
    }
  }

  // Shared data files (locale-independent)
  try {
    const tiersRes = await apiFetch('/v1/content/tiers?locale=en')
    if (tiersRes?.data) {
      writeJson('data/tiers.json', tiersRes.data)
    }

    const zonesRes = await apiFetch('/v1/content/zones?locale=en')
    if (zonesRes?.data) {
      const zones = zonesRes.data.map(z => ({
        slug: z.zone_slug,
        name: z.name,
        icon: z.zone_icon,
        color: z.zone_color,
        display_order: z.display_order,
      }))
      writeJson('data/zones.json', zones)
    }
  } catch (err) {
    console.error(`  ERROR: Shared data fetch failed: ${err.message}`)
    success = false
  }

  console.log(success ? '\n  Done — all content fetched.\n' : '\n  Done with warnings.\n')
}

main().catch(err => {
  console.error(`Fatal: ${err.message}`)
  // Don't fail the build — let it use existing stale files
  process.exit(0)
})
