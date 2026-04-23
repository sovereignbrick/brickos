import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js Middleware -- runs server-side before page rendering.
 *
 * Sprint 051 #0594: also owns the root-path cross-plane redirect so
 * unauthed visitors to https://app.sovereignhealth.io/ land on the
 * eval demo instead of the login wall.
 *
 * Matcher is an OR of every path where middleware needs to run
 * (brand cookie + root redirect).
 */
export function middleware(request: NextRequest) {
  const host = (request.headers.get('host') ?? '').toLowerCase().split(':')[0]
  const pathname = request.nextUrl.pathname

  // -----------------------------------------------------------------
  // Root-path cross-plane redirect (Sprint 051 #0594)
  // -----------------------------------------------------------------
  if (pathname === '/') {
    const hasAuthCookie = request.cookies.has('auth_token')

    // Authed: let the page.tsx redirect to /sovereign-health/dashboard.
    if (!hasAuthCookie) {
      // eval.sovereignhealth.io renders the profile picker inline at
      // /sovereign-health/dashboard; staying on-plane is correct --
      // page.tsx will handle that redirect for us.
      if (host !== 'eval.sovereignhealth.io') {
        if (host === 'sovereignhealth.io' || host.endsWith('.sovereignhealth.io')) {
          // Consumer plane unauthed -> cross-plane to the eval demo.
          return NextResponse.redirect('https://eval.sovereignhealth.io/', 307)
        }
        // brickos.io / localhost / anything else -> send to login.
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url, 307)
      }
    }
  }

  // -----------------------------------------------------------------
  // Brand-context header + cookie (original behavior)
  // -----------------------------------------------------------------
  const response = NextResponse.next()

  let brand = 'shi'
  if (host.endsWith('.brickos.io') || host === 'brickos.io') {
    brand = 'brickos'
  }

  response.headers.set('x-brand-context', brand)
  response.cookies.set('brand_context', brand, {
    path: '/',
    sameSite: 'lax',
    secure: host.includes('.io'),
    maxAge: 86400,
  })

  return response
}

export const config = {
  matcher: [
    '/',
    '/login/:path*',
    '/signup/:path*',
    '/forgot-password/:path*',
    '/verify-email/:path*',
    '/reset-password/:path*',
    '/platform/:path*',
  ],
}
