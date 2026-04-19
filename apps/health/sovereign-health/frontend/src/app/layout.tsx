// ============================================================================
//  SOVEREIGN HEALTH INTELLIGENCE
//
//  BLOOD · BIOMARKERS · INSIGHT
//
//  Privacy-first platform for collecting, analyzing, and understanding
//  blood markers and laboratory data.
//
//  Your body is the operating system of your life.
//  Blood is its diagnostic interface.
//
//  Bitcoin introduced Proof of Work.
//  Health needs Proof of Blood.
//
//  Inspired by the principles of sovereignty, self-custody,
//  and the ideas explored in "Brick by Brick":
//  https://www.amazon.de/-/en/Brick-Building-Sovereign-Life-Bitcoin/dp/B0FR42K8R1
//
//  Own your data. Understand your biology. Build health sovereignty.
//
//  https://sovereignhealth.io/
//  AGPL-3.0 -- https://github.com/sovereignbrick/brickos
// ============================================================================

import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { ContentProvider } from '@/lib/content-context'
import { DemoProfileProvider } from '@/lib/demo-profile-context'
import { ThemeProvider } from '@/lib/theme-context'
import { CanonicalMeta } from '@/components/canonical-meta'
import { Toaster } from 'sonner'
import { APP_NAME } from '@/lib/mode'
import { OnboardingTracker } from '@/components/onboarding-tracker'
import { ReferralTracker } from '@/components/referral-tracker'
import { InstallProvider } from '@/lib/install-context'
import { OfflineProvider } from '@/lib/offline-context'
import { OfflineBanner } from '@/components/offline-banner'
import { GraceBanner } from '@/components/grace-banner'
import { SyncProvider } from '@/lib/sync-context'
import { PushProvider } from '@/lib/push-context'
import { OrgContextProvider } from '@/lib/org-context'
import { PlaneGate } from '@/components/plane-gate'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#09090b',
}

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.sovereignhealth.io'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: APP_NAME,
    template: '%s | Sovereign Health',
  },
  description: 'Privacy-first metabolic health tracking. Monitor biomarkers, track trends, and optimize your health with protocol-aware reference ranges.',
  keywords: ['health tracking', 'biomarkers', 'metabolic health', 'blood work', 'health optimization', 'glucose', 'ketones', 'cholesterol', 'privacy-first'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sovereign Health',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32 16x16' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: APP_NAME,
    description: 'Privacy-first metabolic health tracking. Monitor biomarkers, track trends, and optimize your health.',
    url: SITE_URL,
    images: [{ url: '/og-image.png', width: 1200, height: 627, alt: 'Sovereign Health Intelligence — Privacy-first metabolic health tracking' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_NAME,
    description: 'Privacy-first metabolic health tracking. Monitor biomarkers, track trends, and optimize your health.',
    images: ['/og-image.png'],
  },
  other: {
    'robots': 'noai, noimageai',
    'rights': `(c) ${APP_NAME}. All rights reserved.`,
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head>
        {/* Brand detection script -- runs BEFORE React hydration to prevent logo flash.
            Reads brand_context cookie set by middleware and adds class to <html>. */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){var m=document.cookie.match(/brand_context=([^;]+)/);
          if(m&&m[1]==='brickos')document.documentElement.classList.add('brand-brickos');})();
        ` }} />
        <Suspense>
          <CanonicalMeta />
        </Suspense>
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <a href="#main-content" className="skip-to-content">Skip to content</a>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <OrgContextProvider>
            <AuthProvider>
              <InstallProvider>
              <OfflineProvider>
              <SyncProvider>
              <PushProvider>
              <ContentProvider initialLocale={locale}>
                <Suspense>
                  <DemoProfileProvider>
                    <OfflineBanner />
                    <GraceBanner />
                    {process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' && (
                      <div className="fixed top-0 left-0 z-[9999] pointer-events-none">
                        <div className="bg-orange-500 text-black text-[10px] font-bold px-8 py-0.5 -rotate-45 -translate-x-[30%] translate-y-[40%]">
                          STAGING
                        </div>
                      </div>
                    )}
                    <OnboardingTracker />
                    <ReferralTracker />
                    <PlaneGate />
                    <div id="main-content">{children}</div>
                    <Toaster position="top-center" richColors offset="16px" duration={2500} visibleToasts={2} />
                  </DemoProfileProvider>
                </Suspense>
              </ContentProvider>
              </PushProvider>
              </SyncProvider>
              </OfflineProvider>
              </InstallProvider>
            </AuthProvider>
            </OrgContextProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
