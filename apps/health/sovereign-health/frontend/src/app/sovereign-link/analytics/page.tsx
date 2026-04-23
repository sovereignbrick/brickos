'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Navbar } from '@/components/layout/navbar'

/**
 * Sprint 051 #0587: analytics placeholder.
 * Deferred: per-link click breakdown by day is tracked in
 * apps/technology/sovereign-link and not yet surfaced in the SHI
 * frontend. For now we link out to the platform admin view which has
 * the summary rollups.
 */
export default function SovereignLinkAnalytics() {
  const t = useTranslations('sovereignLink')
  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/sovereign-link" className="text-sm text-blue-400 hover:underline">
            &larr; {t('backToList')}
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-2">{t('analyticsTitle')}</h1>
        <p className="text-muted-foreground">{t('analyticsPlaceholder')}</p>
        <div className="mt-6 border rounded-lg p-6 bg-muted/10">
          <p className="text-sm">{t('analyticsComingSoon')}</p>
          <Link
            href="/platform/links"
            className="inline-block mt-3 text-sm text-blue-400 hover:underline"
          >
            {t('analyticsSeeAdmin')} &rarr;
          </Link>
        </div>
      </main>
    </>
  )
}
