// Sprint 041 round 3: minimal health endpoint for the SHI Next.js
// frontend so the platform admin /platform/services dashboard can show
// the frontend version alongside the API version.
//
// Returns JSON `{status, service, version, build_id, timestamp}` to match
// the shape that admin_health.rs expects (it parses `.version`).
//
// The version comes from the package.json field, which Next.js inlines
// at build time via the `env.NEXT_PUBLIC_APP_VERSION` setting in
// next.config.ts. Falls back to 'unknown' if the env var isn't set.

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'sovereign-health-frontend',
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',
      build_id: process.env.BUILD_ID ?? null,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'cache-control': 'no-store, no-cache, must-revalidate',
      },
    },
  )
}
