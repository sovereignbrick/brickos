'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Cookies from 'js-cookie'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useOrg } from '@/lib/org-context'
import { toast } from '@/lib/toast'
import { Navbar } from '@/components/layout/navbar'

interface LinkItem {
  id: string
  code: string
  target_url: string
  link_type: string
  domain: string
  title: string | null
  is_active: boolean
  total_clicks: number
  clicks_7d: number
  created_at: string
}

/**
 * Sprint 051 #0587: Sovereign Link end-user landing.
 * Lists the current org's short links with the "Copy" action + click
 * stats. Org members get a minimal view; platform admin still lives at
 * /platform/links.
 */
export default function SovereignLinkHome() {
  const t = useTranslations('sovereignLink')
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const org = useOrg()
  const [links, setLinks] = useState<LinkItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login?return=/sovereign-link')
      return
    }
    if (!org.isOrg) {
      // Public / platform plane -- no org context, nothing to list.
      setLoading(false)
      return
    }

    const token = Cookies.get('auth_token')
    fetch('/admin/links?app_key=sovereign-link', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(j => {
        setLinks(j?.data?.links ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [authLoading, user, org.isOrg, router])

  const handleCopy = async (code: string, domain: string) => {
    try {
      await navigator.clipboard.writeText(`https://${domain}/r/${code}`)
      toast.success(t('copied'))
    } catch {
      toast.error(t('copyFailed'))
    }
  }

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-64" />
            <div className="h-4 bg-muted rounded w-96" />
            <div className="space-y-2 mt-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </div>
        </main>
      </>
    )
  }

  if (!org.isOrg) {
    return (
      <>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-2">{t('title')}</h1>
          <p className="text-muted-foreground">{t('noOrgContext')}</p>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t('subtitle', { orgName: org.orgName ?? '' })}
            </p>
          </div>
          {/* Sprint 051 #0587: creation requires platform admin; org-scoped
              endpoint deferred to Sprint 052. Keep the button visible so
              the surface is discoverable but send to the read-only info
              page explaining the current limitation. */}
          <Link
            href="/sovereign-link/new"
            className="bg-[var(--brand-primary)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            {t('createNew')}
          </Link>
        </div>

        {links.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            <p>{t('empty')}</p>
            <p className="text-xs mt-3 text-muted-foreground/70">{t('createContactAdmin')}</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 px-3">{t('colShortLink')}</th>
                  <th className="py-2 px-3">{t('colTarget')}</th>
                  <th className="py-2 px-3 text-right">{t('colClicks')}</th>
                  <th className="py-2 px-3 text-right">{t('colClicks7d')}</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {links.map(l => (
                  <tr key={l.id} className="border-t border-border/50">
                    <td className="py-2 px-3 font-mono text-xs">
                      {l.domain}/r/{l.code}
                    </td>
                    <td className="py-2 px-3 truncate max-w-[280px]">
                      <a
                        href={l.target_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-blue-400 hover:underline"
                      >
                        {l.title || l.target_url}
                      </a>
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{l.total_clicks}</td>
                    <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                      {l.clicks_7d}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => handleCopy(l.code, l.domain)}
                        className="text-xs text-blue-400 hover:underline"
                      >
                        {t('copy')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 text-xs text-muted-foreground">
          <Link href="/sovereign-link/analytics" className="hover:underline">
            {t('seeAnalytics')} &rarr;
          </Link>
        </div>
      </main>
    </>
  )
}
