import { test, expect } from '@playwright/test'

/**
 * Sprint 047 #577 -- multi-app URL routing. SHI end-user routes moved
 * under /sovereign-health/*. Old root paths 308 on brickos.io; nginx
 * rewrites sovereignhealth.io internally so the clean URL bar persists.
 * Build-ID + refresh banner (#586/#588) get smoke coverage here too.
 *
 * Run against staging:
 *   E2E_BASE_URL=https://test-clinic.demo.brickos.io \
 *     npx playwright test sprint-047-url-routing --project=unauth
 */

// The 7 path pairs defined in next.config.ts `redirects()` (legacyShiPaths).
const MOVED_PATHS = [
  'dashboard',
  'measurements',
  'doctor-chat',
  'markers',
  'trends',
  'zones',
  'practitioner',
] as const

// Representative destinations that should be reachable on the new prefix.
// Some accept an extra segment so we cover `/[slug]` and `/new` sub-paths.
const REACHABLE_NEW_PATHS: readonly string[] = [
  '/sovereign-health/dashboard',
  '/sovereign-health/measurements',
  '/sovereign-health/measurements/new',
  '/sovereign-health/doctor-chat',
  '/sovereign-health/markers/iron',
  '/sovereign-health/trends',
  '/sovereign-health/zones/energy_metabolic',
  '/sovereign-health/practitioner',
]

function isBrandedHost(baseURL: string | undefined): boolean {
  if (!baseURL) return false
  try {
    return new URL(baseURL).hostname.endsWith('sovereignhealth.io')
  } catch {
    return false
  }
}

test.describe('Sprint 047 -- /sovereign-health routes reachable', () => {
  for (const path of REACHABLE_NEW_PATHS) {
    test(`GET ${path} returns non-error (follows redirects)`, async ({ request }) => {
      // Follow redirects -- unauth traffic will bounce through /login
      // which should land 200 on the login page. What we're catching here
      // is 404 (route missing) or 5xx (server crash).
      const res = await request.get(path, {
        headers: { Accept: 'text/html' },
      })
      expect(res.status()).toBeLessThan(400)
    })
  }
})

test.describe('Sprint 047 -- 308 redirects from legacy root paths', () => {
  // Skip this whole describe block on sovereignhealth.io. There nginx
  // rewrites /dashboard internally to /sovereign-health/dashboard before
  // Next.js sees the request, so the 308 never fires (and shouldn't --
  // we want the URL bar to stay clean).
  test.skip(({ baseURL }) => isBrandedHost(baseURL), 'sovereignhealth.io rewrites internally; no 308')

  for (const p of MOVED_PATHS) {
    test(`GET /${p} -> 308 /sovereign-health/${p}`, async ({ request }) => {
      const res = await request.get(`/${p}`, {
        headers: { Accept: 'text/html' },
        maxRedirects: 0,
      })
      expect(res.status()).toBe(308)
      expect(res.headers()['location']).toContain(`/sovereign-health/${p}`)
    })

    test(`GET /${p}/sub -> 308 /sovereign-health/${p}/sub`, async ({ request }) => {
      const res = await request.get(`/${p}/sub`, {
        headers: { Accept: 'text/html' },
        maxRedirects: 0,
      })
      expect(res.status()).toBe(308)
      expect(res.headers()['location']).toContain(`/sovereign-health/${p}/sub`)
    })
  }
})

test.describe('Sprint 047 -- branded domain keeps legacy URL clean', () => {
  test('/dashboard on sovereignhealth.io renders without 308', async ({ request, baseURL }) => {
    test.skip(!isBrandedHost(baseURL), 'sovereignhealth.io only')
    // On the branded domain, nginx should rewrite /dashboard internally.
    // We expect a 200 (or at worst a 307 to /login for unauth), NOT a 308
    // to /sovereign-health/dashboard.
    const res = await request.get('/dashboard', {
      headers: { Accept: 'text/html' },
      maxRedirects: 0,
    })
    expect(res.status()).not.toBe(308)
    if (res.status() >= 300 && res.status() < 400) {
      // Any redirect here must NOT flip the URL to /sovereign-health/.
      const loc = res.headers()['location'] || ''
      expect(loc).not.toContain('/sovereign-health/dashboard')
    }
  })
})

test.describe('Sprint 047 -- build-id health contract (#586)', () => {
  test('/health returns non-empty build field', async ({ request }) => {
    const res = await request.get('/health')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(typeof body.version).toBe('string')
    expect(body.version.length).toBeGreaterThan(0)
    expect(typeof body.build).toBe('string')
    expect(body.build.length).toBeGreaterThan(0)
    // "unknown" signals the deploy script didn't pass BUILD_ID --
    // refresh-banner polling would never fire a mismatch. Flag it.
    expect(body.build).not.toBe('unknown')
  })
})

test.describe('Sprint 047 -- refresh banner code path exists in bundle (#588)', () => {
  test('shipped layout bundle contains the refresh banner user-facing string', async ({ request }) => {
    // Fetch the root layout chunk via /login (always public). The
    // RefreshBanner is rendered in the root layout, so its translated
    // string is bundled into whichever chunk carries the layout tree.
    const homeRes = await request.get('/login', { headers: { Accept: 'text/html' } })
    const html = await homeRes.text()

    // Grab every /_next/static chunk referenced by the login HTML and
    // search them all. The i18n key `refresh.message` resolves to a
    // user-visible string that survives minification.
    const chunkMatches = Array.from(
      html.matchAll(/\/_next\/static\/chunks\/[^"'\s]+\.js/g),
    ).map(m => m[0])
    expect(chunkMatches.length).toBeGreaterThan(0)

    // De-dupe.
    const uniqueChunks = Array.from(new Set(chunkMatches))

    let found = false
    for (const chunkPath of uniqueChunks) {
      const chunkRes = await request.get(chunkPath)
      if (!chunkRes.ok()) continue
      const body = await chunkRes.text()
      if (
        body.includes('A newer version of the app is available.') ||
        body.includes('controllerchange') ||
        body.includes('NEXT_PUBLIC_BUILD_ID')
      ) {
        found = true
        break
      }
    }
    expect(found, 'refresh-banner strings/handlers must be present in shipped bundle').toBe(true)
  })
})
