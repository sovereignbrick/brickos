'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Cookies from 'js-cookie'
import { useTranslations } from 'next-intl'
import { toast } from '@/lib/toast'
import { Navbar } from '@/components/layout/navbar'

/**
 * Sprint 051 #0587: Sovereign Link create form.
 * Reuses the /admin/links/campaign endpoint (it already scopes to the
 * caller's org via X-Org-Domain). Backend validates + generates code.
 */
export default function NewSovereignLink() {
  const t = useTranslations('sovereignLink')
  const router = useRouter()
  const [targetUrl, setTargetUrl] = useState('')
  const [title, setTitle] = useState('')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetUrl.trim()) return
    setSubmitting(true)
    try {
      const token = Cookies.get('auth_token')
      const res = await fetch('/admin/links/campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          target_url: targetUrl.trim(),
          title: title.trim() || undefined,
          code: code.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`)
      }
      toast.success(t('created'))
      router.push('/sovereign-link')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('createFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/sovereign-link" className="text-sm text-blue-400 hover:underline">
            &larr; {t('backToList')}
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-6">{t('createTitle')}</h1>

        <form onSubmit={submit} className="space-y-4 max-w-lg">
          <div>
            <label className="text-sm font-medium block mb-1" htmlFor="target-url">
              {t('targetUrlLabel')}
            </label>
            <input
              id="target-url"
              type="url"
              required
              value={targetUrl}
              onChange={e => setTargetUrl(e.target.value)}
              className="w-full bg-white/5 border rounded-lg px-3 py-2 text-sm"
              placeholder="https://example.com/long/path/to/shorten"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1" htmlFor="title">
              {t('titleLabel')} <span className="text-xs text-muted-foreground">{t('optional')}</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-white/5 border rounded-lg px-3 py-2 text-sm"
              placeholder={t('titlePlaceholder')}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1" htmlFor="code">
              {t('codeLabel')} <span className="text-xs text-muted-foreground">{t('optional')}</span>
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full bg-white/5 border rounded-lg px-3 py-2 text-sm font-mono"
              placeholder={t('codePlaceholder')}
              pattern="[a-z0-9-]*"
            />
            <p className="text-xs text-muted-foreground mt-1">{t('codeHelp')}</p>
          </div>

          <button
            type="submit"
            disabled={submitting || !targetUrl.trim()}
            className="bg-[var(--brand-primary)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? t('creating') : t('submit')}
          </button>
        </form>
      </main>
    </>
  )
}
