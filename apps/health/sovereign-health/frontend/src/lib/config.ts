/**
 * Centralized application configuration.
 * All environment-dependent values should be read here.
 */
export const APP_CONFIG = {
  // Product
  productName: process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Sovereign Health Intelligence',
  productNameShort: process.env.NEXT_PUBLIC_PRODUCT_NAME_SHORT || 'Sovereign Health',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'sovereignhealthintelligence@proton.me',

  // URLs
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://app.sovereignhealth.io',
  websiteUrl: process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://sovereignhealth.io',
  demoHostname: process.env.NEXT_PUBLIC_DEMO_HOSTNAME || 'demo.sovereignhealth.io',
  githubUrl: process.env.NEXT_PUBLIC_GITHUB_URL || 'https://github.com/sovereignbrick/brickos',

  // Session
  sessionTimeoutHours: Number(process.env.NEXT_PUBLIC_SESSION_TIMEOUT_HOURS || '2'),

  // Pagination
  defaultPageSize: Number(process.env.NEXT_PUBLIC_PAGE_SIZE || '20'),
  adminPageSize: Number(process.env.NEXT_PUBLIC_ADMIN_PAGE_SIZE || '50'),

  // Content cache TTL (milliseconds)
  contentCacheTtlMs: Number(process.env.NEXT_PUBLIC_CONTENT_CACHE_TTL_MS || String(5 * 60 * 1000)),
} as const;
