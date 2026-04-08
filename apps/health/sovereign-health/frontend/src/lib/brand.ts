/**
 * Domain-aware branding configuration.
 *
 * Detects the hostname and returns the correct logo, app name, and
 * feature flags for auth pages (login, register, forgot-password, etc.).
 *
 * Each app served via brickos.io gets its own branding based on the
 * return URL or hostname pattern.
 */

export interface BrandConfig {
  logo: string
  logoAlt: string
  appName: string
  subtitle: string
  showDemo: boolean
  showRegister: boolean
}

const BRICKOS_BRAND: BrandConfig = {
  logo: '/brickos-cube.png',
  logoAlt: 'BrickOS Platform',
  appName: 'BrickOS Platform',
  subtitle: 'Sign in to your platform account',
  showDemo: false,
  showRegister: false,
}

const SHI_BRAND: BrandConfig = {
  logo: '/logo.png',
  logoAlt: 'Sovereign Health Intelligence',
  appName: 'Sovereign Health Intelligence',
  subtitle: 'Sign in to your account',
  showDemo: true,
  showRegister: true,
}

/**
 * Get the brand config based on hostname and/or return URL.
 * Call this on the client side only (needs window.location).
 */
export function getBrandConfig(): BrandConfig {
  if (typeof window === 'undefined') return SHI_BRAND

  const host = window.location.hostname
  const params = new URLSearchParams(window.location.search)
  const returnUrl = params.get('return') || ''

  // If on brickos.io domain, use BrickOS branding
  if (host.endsWith('.brickos.io')) {
    // Check if the return URL points to a specific app
    if (returnUrl.startsWith('/sovereignhealth')) return SHI_BRAND
    // Default: BrickOS platform branding
    return BRICKOS_BRAND
  }

  // On sovereignhealth.io domain, use SHI branding
  return SHI_BRAND
}
