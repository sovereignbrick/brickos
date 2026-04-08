import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js Middleware -- runs server-side before page rendering.
 * Sets x-brand-context header based on hostname so pages can render
 * the correct branding without client-side flash.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const host = request.headers.get('host') || ''

  // Determine brand context from hostname
  let brand = 'shi' // default
  if (host.endsWith('.brickos.io') || host === 'brickos.io') {
    brand = 'brickos'
  }

  // Set header that pages can read via headers() in server components
  // or via cookie for client components
  response.headers.set('x-brand-context', brand)

  // Also set a cookie so client components can read it
  response.cookies.set('brand_context', brand, {
    path: '/',
    sameSite: 'lax',
    secure: host.includes('.io'),
    maxAge: 86400, // 24h
  })

  return response
}

export const config = {
  // Run on auth pages and platform pages
  matcher: ['/login/:path*', '/signup/:path*', '/forgot-password/:path*', '/verify-email/:path*', '/reset-password/:path*', '/platform/:path*'],
}
