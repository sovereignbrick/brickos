'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Navbar } from '@/components/layout/navbar'

/**
 * Sprint 051 #0587 skeleton: create form is deliberately a read-only
 * placeholder until the org-scoped create endpoint lands (Sprint 052+).
 *
 * Background: the existing `/admin/links/campaign` backend handler
 * gates on `AdminUser` (platform admin only) and creates PLATFORM-
 * wide short links with no org_id column, so letting an org_owner
 * POST to it would leak short links across orgs. The proper fix is a
 * new `/org-settings/links` handler with per-org scoping + a distinct
 * storage column; scoped into its own issue because it touches the
 * Sovereign Link service crate too.
 *
 * Until that lands, end-user org owners see this page instead of a
 * form that 403s. Platform admins still have `/platform/links` for
 * create + bulk management.
 */
export default function NewSovereignLink() {
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
        <h1 className="text-2xl font-bold mb-2">{t('createTitle')}</h1>
        <p className="text-muted-foreground mb-6">{t('createComingSoon')}</p>

        <div className="border rounded-lg p-6 bg-muted/10 space-y-3">
          <p className="text-sm">{t('createContactAdmin')}</p>
          <Link
            href="/platform/links"
            className="inline-block text-sm text-blue-400 hover:underline"
          >
            {t('createAdminLink')} &rarr;
          </Link>
        </div>
      </main>
    </>
  )
}
