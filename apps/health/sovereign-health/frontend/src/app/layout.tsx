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
import { RefreshBanner } from '@/components/refresh-banner'
import { ImpersonationBanner } from '@/components/impersonation-banner'
import { SyncProvider } from '@/lib/sync-context'
import { PushProvider } from '@/lib/push-context'
import { OrgContextProvider } from '@/lib/org-context'
import { PlaneGate } from '@/components/plane-gate'
import { AuthGate } from '@/components/auth-gate'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#09090b',
}

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.sovereignhealth.io'

// Sprint 046 hotfix 2026-04-20 (post-v0.43.0-ship): `generateMetadata`
// reads the request host so tab title + favicon adapt per plane.
// On `*.brickos.io` -> "BrickOS Platform" + cube favicon.
// On `*.sovereignhealth.io` (default) -> APP_NAME + SHI favicon.
// Before this, every page on brickos.io still showed "X | Sovereign Health"
// and the SHI favicon, because `metadata` was a static object evaluated
// at build time.
export async function generateMetadata(): Promise<Metadata> {
  const { headers } = await import('next/headers')
  const h = await headers()
  const host = (h.get('host') || '').toLowerCase()
  const isBrickOS = host.endsWith('.brickos.io') || host === 'brickos.io'

  const brandName = isBrickOS ? 'BrickOS Platform' : APP_NAME
  const brandTemplate = isBrickOS ? '%s | BrickOS' : '%s | Sovereign Health'
  const brandDescription = isBrickOS
    ? 'BrickOS -- build, operate, and own your apps. Platform admin and org management.'
    : 'Privacy-first metabolic health tracking. Monitor biomarkers, track trends, and optimize your health with protocol-aware reference ranges.'

  const brandIcons = isBrickOS
    ? {
        icon: [{ url: '/brickos-favicon-32.png', sizes: '32x32', type: 'image/png' }],
        apple: '/brickos-favicon-32.png',
      }
    : {
        icon: [
          { url: '/favicon.ico', sizes: '32x32 16x16' },
          { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
          { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        ],
        apple: '/apple-touch-icon.png',
      }

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: brandName,
      template: brandTemplate,
    },
    description: brandDescription,
    keywords: ['health tracking', 'biomarkers', 'metabolic health', 'blood work', 'health optimization', 'glucose', 'ketones', 'cholesterol', 'privacy-first'],
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: brandName,
    },
    icons: brandIcons,
    openGraph: {
      type: 'website',
      siteName: brandName,
      title: brandName,
      description: brandDescription,
      url: SITE_URL,
      images: [{ url: '/og-image.png', width: 1200, height: 627, alt: `${brandName} -- Privacy-first metabolic health tracking` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: brandName,
      description: brandDescription,
      images: ['/og-image.png'],
    },
    other: {
      'robots': 'noai, noimageai',
      'rights': `(c) ${brandName}. All rights reserved.`,
    },
  }
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
                    <RefreshBanner />
                    <ImpersonationBanner />
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
                    <AuthGate />
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
