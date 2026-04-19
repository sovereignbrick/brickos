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
    expect(isAdminOnlyPath('/org')).toBe(true)
    expect(isAdminOnlyPath('/org/branding')).toBe(true)
    expect(isAdminOnlyPath('/platform/orgs')).toBe(true)
    expect(isAdminOnlyPath('/admin')).toBe(true)
    expect(isAdminOnlyPath('/dashboard')).toBe(false)
    expect(isAdminOnlyPath('/login')).toBe(false)
  })

  it('end-user-only paths', () => {
    expect(isEndUserOnlyPath('/dashboard')).toBe(true)
    expect(isEndUserOnlyPath('/measurements/new')).toBe(true)
    expect(isEndUserOnlyPath('/doctor-chat/abc-123')).toBe(true)
    expect(isEndUserOnlyPath('/settings')).toBe(true)
    expect(isEndUserOnlyPath('/org')).toBe(false)
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
})

describe('planeRedirectTarget', () => {
  it('redirects admin-plane host visiting end-user path to end-user plane', () => {
    const target = planeRedirectTarget(
      'admin',
      '/dashboard',
      'test-clinic.brickos.io',
    )
    expect(target).toBe('https://test-clinic.sovereignhealth.io/dashboard')
  })

  it('redirects end-user-plane host visiting admin path to admin plane', () => {
    const target = planeRedirectTarget(
      'end-user',
      '/org/branding',
      'test-clinic.sovereignhealth.io',
    )
    expect(target).toBe('https://test-clinic.brickos.io/org/branding')
  })

  it('does not redirect shared paths', () => {
    expect(planeRedirectTarget('admin', '/login', 'test-clinic.brickos.io')).toBeNull()
    expect(planeRedirectTarget('end-user', '/login', 'test-clinic.sovereignhealth.io')).toBeNull()
  })

  it('does not redirect on matching plane', () => {
    expect(planeRedirectTarget('admin', '/org', 'test-clinic.brickos.io')).toBeNull()
    expect(planeRedirectTarget('end-user', '/dashboard', 'test-clinic.sovereignhealth.io')).toBeNull()
  })

  it('does not redirect custom domains', () => {
    expect(planeRedirectTarget('unknown', '/dashboard', 'health.acme.com')).toBeNull()
  })

  it('preserves staging subdomain level', () => {
    const target = planeRedirectTarget(
      'admin',
      '/dashboard',
      'test-clinic.demo.brickos.io',
    )
    expect(target).toBe('https://test-clinic.demo.sovereignhealth.io/dashboard')
  })
})
