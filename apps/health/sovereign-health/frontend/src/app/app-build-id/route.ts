import { NextResponse } from 'next/server'

// Sprint 047 RC fix 2026-04-21: the RefreshBanner's build-id poll needs to
// compare the loaded client bundle against the CURRENT FRONTEND bundle,
// not the backend's /health.build. Before this, frontend-only deploys
// (common) left /health.build on the previous backend SHA while the new
// frontend had a fresh NEXT_PUBLIC_BUILD_ID, so the banner falsely
// signalled "newer version available" on every poll and reload never
// cleared it.
//
// This route is served by the Next.js runtime, so its response reflects
// whichever frontend container is handling the request. Freshly-deployed
// frontend -> new BUILD_ID. Same frontend as the loaded bundle -> match.

export const dynamic = 'force-dynamic'

export async function GET() {
  const build = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'
  return NextResponse.json(
    { build },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  )
}
