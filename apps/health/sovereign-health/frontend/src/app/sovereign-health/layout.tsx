import type { Metadata } from 'next'
import { headers } from 'next/headers'

// Sprint 049 #049-13 (Design 029 v0.3): noindex deep paths on eval host.
// The eval.sovereignhealth.io landing (/) stays indexable so Google can
// surface "Sovereign Health Intelligence" for brand searches, but the
// per-profile deep pages (/sovereign-health/dashboard?profile=optimized
// etc.) should NOT clutter search results -- the real product lives
// under app.sovereignhealth.io for authed users.
//
// Server-side metadata (via headers().host) is more reliable than a
// client-injected meta tag because Googlebot sees it on the first
// render pass without waiting for JS execution.
export async function generateMetadata(): Promise<Metadata> {
  const hdrs = await headers()
  const host = hdrs.get('host') || ''
  if (host === 'eval.sovereignhealth.io') {
    return {
      robots: {
        index: false,
        follow: false,
      },
    }
  }
  return {}
}

export default function SovereignHealthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
