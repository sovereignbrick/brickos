export interface BrandConfig {
  logo: string
  logoAlt: string
  appName: string
  subtitle: string
  showDemo: boolean
  showRegister: boolean
}

const APP_BRAND: BrandConfig = {
  logo: '/logo.png',
  logoAlt: 'Sovereign CRM',
  appName: 'Sovereign CRM',
  subtitle: 'Sign in to your account',
  showDemo: true,
  showRegister: true,
}

const BRICKOS_BRAND: BrandConfig = {
  logo: '/brickos-cube.png',
  logoAlt: 'BrickOS Platform',
  appName: 'BrickOS Platform',
  subtitle: 'Sign in to your account',
  showDemo: false,
  showRegister: false,
}

export function getBrand(hostname?: string): BrandConfig {
  const host = hostname || (typeof window !== 'undefined' ? window.location.hostname : '')
  if (host.endsWith('.brickos.io') || host === 'brickos.io') return BRICKOS_BRAND
  return APP_BRAND
}
