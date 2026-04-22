import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'

/**
 * Root landing page.
 *
 * Sprint 051 hotfix 2026-04-23: previously this was a blind
 * `redirect('/sovereign-health/dashboard')`, which meant every unauthed
 * visitor to https://app.sovereignhealth.io/ bounced straight to
 * /login. That's the wrong first impression for external links /
 * marketing traffic / social-media bookmarks -- they expect to see the
 * 3-profile demo, not a login form.
 *
 * Routing table:
 *   authed (any host)                  -> /sovereign-health/dashboard
 *   unauthed, eval.sovereignhealth.io  -> /sovereign-health/dashboard
 *                                         (eval surface, shows demo picker)
 *   unauthed, *.sovereignhealth.io     -> eval.sovereignhealth.io/
 *                                         (cross-plane, Design 029 demo)
 *   unauthed, brickos.io / localhost   -> /login
 *                                         (admin plane has no public demo)
 */
export default async function Home() {
  const h = await headers()
  const c = await cookies()
  const host = (h.get('host') ?? '').toLowerCase().split(':')[0]
  const hasAuthCookie = c.has('auth_token')

  if (hasAuthCookie) {
    redirect('/sovereign-health/dashboard')
  }

  // eval.sovereignhealth.io is the dedicated demo host; its dashboard
  // route renders the profile picker, so staying on-plane is correct.
  if (host === 'eval.sovereignhealth.io') {
    redirect('/sovereign-health/dashboard')
  }

  // Any other *.sovereignhealth.io host (app, {slug}, demo, www, apex)
  // is consumer-plane. Unauthed visitors go to the public demo.
  if (host === 'sovereignhealth.io' || host.endsWith('.sovereignhealth.io')) {
    redirect('https://eval.sovereignhealth.io/')
  }

  // brickos.io admin plane, localhost dev, and anything else -> login.
  redirect('/login')
}
