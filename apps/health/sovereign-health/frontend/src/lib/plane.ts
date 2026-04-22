// Sprint 045 #564 -- Plane detection and cross-plane routing.
//
// Each tenant is reachable on two parent domains:
//   - *.brickos.io         = admin plane (org admin UI)
//   - *.sovereignhealth.io = end-user plane (SHI app)
//
// Routes are categorised; visiting a route on the "wrong" plane
// triggers a redirect to the same path on the matching plane.

export type Plane = 'admin' | 'end-user' | 'unknown'

/** Determine the plane from a hostname. */
export function getPlane(host: string): Plane {
  if (host.endsWith('.brickos.io') || host === 'brickos.io') return 'admin'
  if (host.endsWith('.sovereignhealth.io') || host === 'sovereignhealth.io') return 'end-user'
  return 'unknown'
}

/** Routes that MUST render on the admin plane (brickos.io).
 *
 * Sprint 046 #570: /org/* folded into /platform/org/*, so the single
 * /platform prefix now gates all admin surfaces. /admin is pending
 * removal in #572 but kept here in the meantime so the redirect can fire.
 */
const ADMIN_ONLY_PREFIXES = ['/platform', '/admin']

/** Routes that MUST render on the end-user plane (sovereignhealth.io).
 *
 * Sprint 046 hotfix: /settings removed. The page renders on both planes and
 * filters its tab list by plane instead (admin plane shows account/security/
 * data-privacy; end-user plane shows those PLUS the SHI extension tabs
 * -- health profile, devices, thresholds, medications).
 *
 * Sprint 047 #577 Phase A: all SHI end-user routes now live under the single
 * `/sovereign-health/` prefix (/sovereign-health/dashboard, /sovereign-health/
 * measurements, /sovereign-health/markers, /sovereign-health/trends,
 * /sovereign-health/zones, /sovereign-health/doctor-chat,
 * /sovereign-health/practitioner). The seven separate entries collapse to one.
 */
const END_USER_ONLY_PREFIXES = [
  '/sovereign-health',
  '/billing',
  '/donate',
  '/checkout',
  '/affiliate',
]

function matchesAnyPrefix(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`))
}

/** True if the path is admin-only (must go to brickos.io). */
export function isAdminOnlyPath(path: string): boolean {
  return matchesAnyPrefix(path, ADMIN_ONLY_PREFIXES)
}

/** True if the path is end-user-only (must go to sovereignhealth.io). */
export function isEndUserOnlyPath(path: string): boolean {
  return matchesAnyPrefix(path, END_USER_ONLY_PREFIXES)
}

/** Swap the parent domain on the current host to the other plane.
 *
 *   test-clinic.brickos.io         <-> test-clinic.sovereignhealth.io
 *   app.brickos.io                 <-> app.sovereignhealth.io
 *   test-clinic.demo.brickos.io    <-> test-clinic.demo.sovereignhealth.io
 *
 *  Returns null if the host isn't recognisable (custom domains etc.),
 *  in which case the caller should not redirect.
 *
 *  Sprint 048 RC fix: `demo.brickos.io` (staging platform admin) and
 *  `demo.sovereignhealth.io` (prod public anonymous demo) have no
 *  legitimate cross-plane sibling. The naive .brickos.io <-> .sovereignhealth.io
 *  swap would map them to each other, which crosses the staging/prod
 *  boundary and lands the user on the wrong environment's cookie jar.
 *  Both are explicitly excluded below -- the caller treats null as
 *  "stay on the current host."
 */
export function swapPlaneHost(host: string, target: Plane): string | null {
  // Demo hosts are single-plane by design. No sibling exists on the
  // other plane that shares the same environment (staging vs prod).
  //
  // Sprint 049 #049-08 (Design 029 v0.3): eval.sovereignhealth.io is
  // a single-plane anonymous-demo surface. No admin-plane counterpart
  // exists. Sign-up from eval uses a hardcoded cross-plane link to
  // app.sovereignhealth.io/signup, not via this function.
  if (
    host === 'demo.brickos.io' ||
    host === 'demo.sovereignhealth.io' ||
    host === 'eval.sovereignhealth.io'
  ) {
    return null
  }

  if (target === 'admin') {
    if (host.endsWith('.demo.sovereignhealth.io')) {
      return host.replace(/\.demo\.sovereignhealth\.io$/, '.demo.brickos.io')
    }
    if (host.endsWith('.sovereignhealth.io')) {
      return host.replace(/\.sovereignhealth\.io$/, '.brickos.io')
    }
    if (host === 'sovereignhealth.io') return 'brickos.io'
    return null
  }
  if (target === 'end-user') {
    if (host.endsWith('.demo.brickos.io')) {
      return host.replace(/\.demo\.brickos\.io$/, '.demo.sovereignhealth.io')
    }
    if (host.endsWith('.brickos.io')) {
      return host.replace(/\.brickos\.io$/, '.sovereignhealth.io')
    }
    if (host === 'brickos.io') return 'sovereignhealth.io'
    return null
  }
  return null
}

/** Given the current plane, path, and host, decide whether to redirect.
 *  Returns the absolute target URL or null if we should stay put.
 */
export function planeRedirectTarget(
  plane: Plane,
  path: string,
  host: string,
  protocol = 'https:',
): string | null {
  if (plane === 'admin' && isEndUserOnlyPath(path)) {
    const newHost = swapPlaneHost(host, 'end-user')
    return newHost ? `${protocol}//${newHost}${path}` : null
  }
  if (plane === 'end-user' && isAdminOnlyPath(path)) {
    const newHost = swapPlaneHost(host, 'admin')
    return newHost ? `${protocol}//${newHost}${path}` : null
  }
  return null
}
