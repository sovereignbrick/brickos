/**
 * Centralized website configuration.
 * All environment-dependent values should be read here.
 */
export const SITE_CONFIG = {
  // Product
  productName: process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Sovereign Health Intelligence',
  productNameShort: process.env.NEXT_PUBLIC_PRODUCT_NAME_SHORT || 'Sovereign Health',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'sovereignhealthintelligence@proton.me',
  contactUrl: '/contact',

  // URLs
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://sovereignhealth.io',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://app.sovereignhealth.io',
  demoUrl: process.env.NEXT_PUBLIC_DEMO_URL || 'https://demo.sovereignhealth.io',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api.sovereignhealth.io',
  githubUrl: process.env.NEXT_PUBLIC_GITHUB_URL || 'https://github.com/sovereignbrick/brickos',
  githubRepoUrl: process.env.NEXT_PUBLIC_GITHUB_REPO_URL || 'https://github.com/sovereignbrick/brickos',
} as const;
