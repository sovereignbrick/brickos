import { describe, it, expect } from 'vitest'
import {
  getPlane,
  isAdminOnlyPath,
  isEndUserOnlyPath,
  swapPlaneHost,
  planeRedirectTarget,
} from './plane'

describe('getPlane', () => {
  it('classifies brickos.io hosts as admin', () => {
    expect(getPlane('app.brickos.io')).toBe('admin')
    expect(getPlane('test-clinic.brickos.io')).toBe('admin')
    expect(getPlane('demo.brickos.io')).toBe('admin')
    expect(getPlane('test-clinic.demo.brickos.io')).toBe('admin')
    expect(getPlane('brickos.io')).toBe('admin')
  })

  it('classifies sovereignhealth.io hosts as end-user', () => {
    expect(getPlane('app.sovereignhealth.io')).toBe('end-user')
    expect(getPlane('test-clinic.sovereignhealth.io')).toBe('end-user')
    expect(getPlane('test-clinic.demo.sovereignhealth.io')).toBe('end-user')
    expect(getPlane('sovereignhealth.io')).toBe('end-user')
  })

  it('returns unknown for everything else', () => {
    expect(getPlane('localhost')).toBe('unknown')
    expect(getPlane('health.acme.com')).toBe('unknown')
  })
})

describe('isAdminOnlyPath / isEndUserOnlyPath', () => {
  it('admin-only paths', () => {
    // Sprint 046 #570: /org/* folded into /platform/org/*
    expect(isAdminOnlyPath('/platform')).toBe(true)
    expect(isAdminOnlyPath('/platform/org')).toBe(true)
    expect(isAdminOnlyPath('/platform/org/branding')).toBe(true)
    expect(isAdminOnlyPath('/platform/orgs')).toBe(true)
    expect(isAdminOnlyPath('/admin')).toBe(true)
    expect(isAdminOnlyPath('/sovereign-health/dashboard')).toBe(false)
    expect(isAdminOnlyPath('/login')).toBe(false)
  })

  it('end-user-only paths', () => {
    // Sprint 047 #577 Phase A: SHI routes live under /sovereign-health/.
    expect(isEndUserOnlyPath('/sovereign-health/dashboard')).toBe(true)
    expect(isEndUserOnlyPath('/sovereign-health/measurements/new')).toBe(true)
    expect(isEndUserOnlyPath('/sovereign-health/doctor-chat/abc-123')).toBe(true)
    // Sprint 046 hotfix 2026-04-20: /settings renders on BOTH planes and
    // filters its own tab list by plane -- so it is not end-user-only anymore.
    expect(isEndUserOnlyPath('/settings')).toBe(false)
    expect(isEndUserOnlyPath('/platform/org')).toBe(false)
    expect(isEndUserOnlyPath('/login')).toBe(false)
  })

  it('shared paths are neither', () => {
    for (const path of ['/login', '/signup', '/verify-email', '/legal', '/privacy', '/']) {
      expect(isAdminOnlyPath(path)).toBe(false)
      expect(isEndUserOnlyPath(path)).toBe(false)
    }
  })
})

describe('swapPlaneHost', () => {
  it('admin <-> end-user for prod tenants', () => {
    expect(swapPlaneHost('test-clinic.brickos.io', 'end-user')).toBe('test-clinic.sovereignhealth.io')
    expect(swapPlaneHost('test-clinic.sovereignhealth.io', 'admin')).toBe('test-clinic.brickos.io')
  })

  it('admin <-> end-user for staging tenants', () => {
    expect(swapPlaneHost('test-clinic.demo.brickos.io', 'end-user')).toBe('test-clinic.demo.sovereignhealth.io')
    expect(swapPlaneHost('test-clinic.demo.sovereignhealth.io', 'admin')).toBe('test-clinic.demo.brickos.io')
  })

  it('app.brickos.io <-> app.sovereignhealth.io', () => {
    expect(swapPlaneHost('app.brickos.io', 'end-user')).toBe('app.sovereignhealth.io')
    expect(swapPlaneHost('app.sovereignhealth.io', 'admin')).toBe('app.brickos.io')
  })

  it('returns null for unknown hosts', () => {
    expect(swapPlaneHost('health.acme.com', 'admin')).toBeNull()
    expect(swapPlaneHost('localhost', 'end-user')).toBeNull()
  })

  it('returns null for demo hosts (no cross-plane sibling)', () => {
    // Sprint 048 RC fix: demo.brickos.io is the staging platform admin
    // playground; demo.sovereignhealth.io is the prod public anonymous
    // demo. A naive swap between them crosses the staging/prod boundary.
    expect(swapPlaneHost('demo.brickos.io', 'end-user')).toBeNull()
    expect(swapPlaneHost('demo.sovereignhealth.io', 'admin')).toBeNull()
  })

  it('returns null for eval.sovereignhealth.io (single-plane anonymous demo)', () => {
    // Sprint 049 #049-08 (Design 029 v0.3): eval.* is the anonymous demo
    // surface; no admin-plane sibling. Sign-up from eval uses a
    // hardcoded cross-plane link, not this function.
    expect(swapPlaneHost('eval.sovereignhealth.io', 'admin')).toBeNull()
    expect(swapPlaneHost('eval.sovereignhealth.io', 'end-user')).toBeNull()
  })
})

describe('planeRedirectTarget', () => {
  it('redirects admin-plane host visiting end-user path to end-user plane', () => {
    const target = planeRedirectTarget(
      'admin',
      '/sovereign-health/dashboard',
      'test-clinic.brickos.io',
    )
    expect(target).toBe('https://test-clinic.sovereignhealth.io/sovereign-health/dashboard')
  })

  it('redirects end-user-plane host visiting admin path to admin plane', () => {
    const target = planeRedirectTarget(
      'end-user',
      '/platform/org/branding',
      'test-clinic.sovereignhealth.io',
    )
    expect(target).toBe('https://test-clinic.brickos.io/platform/org/branding')
  })

  it('does not redirect shared paths', () => {
    expect(planeRedirectTarget('admin', '/login', 'test-clinic.brickos.io')).toBeNull()
    expect(planeRedirectTarget('end-user', '/login', 'test-clinic.sovereignhealth.io')).toBeNull()
  })

  it('does not redirect on matching plane', () => {
    expect(planeRedirectTarget('admin', '/platform/org', 'test-clinic.brickos.io')).toBeNull()
    expect(planeRedirectTarget('end-user', '/sovereign-health/dashboard', 'test-clinic.sovereignhealth.io')).toBeNull()
  })

  it('does not redirect custom domains', () => {
    expect(planeRedirectTarget('unknown', '/sovereign-health/dashboard', 'health.acme.com')).toBeNull()
  })

  it('preserves staging subdomain level', () => {
    const target = planeRedirectTarget(
      'admin',
      '/sovereign-health/dashboard',
      'test-clinic.demo.brickos.io',
    )
    expect(target).toBe('https://test-clinic.demo.sovereignhealth.io/sovereign-health/dashboard')
  })

  it('does not redirect demo.brickos.io to prod demo.sovereignhealth.io', () => {
    // Sprint 048 RC fix: demo hosts have no cross-plane sibling; the
    // redirect stays put instead of crossing staging/prod boundary.
    expect(
      planeRedirectTarget('admin', '/sovereign-health/dashboard', 'demo.brickos.io'),
    ).toBeNull()
    expect(
      planeRedirectTarget('end-user', '/platform/org', 'demo.sovereignhealth.io'),
    ).toBeNull()
  })
})
