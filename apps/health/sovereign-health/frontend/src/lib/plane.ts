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

/** Routes that MUST render on the admin plane (brickos.io). */
const ADMIN_ONLY_PREFIXES = ['/org', '/platform', '/admin']

/** Routes that MUST render on the end-user plane (sovereignhealth.io). */
const END_USER_ONLY_PREFIXES = [
  '/dashboard',
  '/measurements',
  '/markers',
  '/trends',
  '/zones',
  '/doctor-chat',
  '/practitioner',
  '/settings',
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
 */
export function swapPlaneHost(host: string, target: Plane): string | null {
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
