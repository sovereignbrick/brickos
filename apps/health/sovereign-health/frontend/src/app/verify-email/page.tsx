'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, useRef, Suspense } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import Image from 'next/image'
import { useBrand } from '@/lib/brand'
import { useTranslations } from 'next-intl'
import { useContent } from '@/lib/content-context'
import { locales, localeNames } from '@/i18n/config'

function VerifyEmailContent() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const { brand, mounted } = useBrand()
  const tVE = useTranslations('auth.verifyEmail')
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState<'loading' | 'success' | 'expired' | 'invalid'>('loading')
  const { locale: contentLocale, setLocale: setContentLocale } = useContent()
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLocaleSwitch = (newLocale: string) => {
    setContentLocale(newLocale)
    setLangOpen(false)
    router.refresh()
  }

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      return
    }

    api.auth.verify(token).then(res => {
      if (res.data?.verified || res.data?.already_verified) {
        setStatus('success')
        setTimeout(() => router.push('/login?verified=true'), 2000)
      } else if (res.error?.code === 'TOKEN_EXPIRED') {
        setStatus('expired')
      } else {
        setStatus('invalid')
      }
    }).catch(() => {
      setStatus('invalid')
    })
  }, [token, router])

  const languageSelector = (
    <div className="absolute top-4 right-4" ref={langRef}>
      <button
        onClick={() => setLangOpen(o => !o)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
        aria-label={tCommon('changeLanguage')}
      >
        {contentLocale.toUpperCase()}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {langOpen && (
        <div className="absolute right-0 top-8 w-32 rounded-xl border bg-zinc-900 shadow-xl py-1 z-50">
          {locales.map(loc => (
            <button
              key={loc}
              onClick={() => handleLocaleSwitch(loc)}
              className={`block w-full text-left px-3 py-2 text-sm transition-colors ${
                contentLocale === loc
                  ? 'text-foreground bg-white/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              {localeNames[loc]}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative">
      {languageSelector}
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-lg brand-logo" data-brand={brand.logo.includes("brickos") ? "brickos" : "shi"} />
          <h1 className="text-2xl font-bold">{t('brandName')}</h1>
        </div>

        {status === 'loading' && (
          <div className="rounded-2xl border p-8 space-y-4">
            <h2 className="text-lg font-semibold">{tVE('verifying')}</h2>
            <p className="text-muted-foreground text-sm">{tVE('pleaseWait')}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="rounded-2xl border border-green-800/50 bg-green-900/20 p-8 space-y-4">
            <div className="text-4xl">&#10003;</div>
            <h2 className="text-lg font-semibold text-green-400">{tVE('verified')}</h2>
            <p className="text-muted-foreground text-sm">
              {tCommon('redirecting')}
            </p>
          </div>
        )}

        {status === 'expired' && (
          <div className="rounded-2xl border p-8 space-y-4">
            <h2 className="text-lg font-semibold">{tVE('expired')}</h2>
            <p className="text-muted-foreground text-sm">
              {tVE('expiredMessage')}
            </p>
            <Link
              href="/signup"
              className="text-sm text-blue-400 hover:text-blue-300 font-medium inline-block"
            >
              {tVE('requestNew')}
            </Link>
          </div>
        )}

        {status === 'invalid' && (
          <div className="rounded-2xl border p-8 space-y-4">
            <h2 className="text-lg font-semibold">{tVE('invalid')}</h2>
            <p className="text-muted-foreground text-sm">
              {tVE('invalidMessage')}
            </p>
            <Link
              href="/login"
              className="text-sm text-blue-400 hover:text-blue-300 font-medium inline-block"
            >
              {tVE('goToLogin')}
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  )
}
