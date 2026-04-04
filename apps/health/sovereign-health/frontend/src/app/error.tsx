'use client'

import { useTranslations } from 'next-intl'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // next-intl may not be available in error boundary, so use try/catch
  let t: (key: string) => string
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const trans = useTranslations()
    t = (key: string) => trans(key)
  } catch {
    // Fallback: detect locale from cookie
    const isDE = typeof window !== 'undefined' && (
      document.cookie.includes('locale=de') ||
      new URLSearchParams(window.location.search).get('lang') === 'de'
    )
    t = (key: string) => {
      const fallback: Record<string, Record<string, string>> = {
        'errors.unknown': { en: 'An unexpected error occurred. Please try again.', de: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.' },
        'errors.tryAgain': { en: 'Try again', de: 'Erneut versuchen' },
        'common.backToHome': { en: 'Back to home', de: 'Zur Startseite' },
      }
      return fallback[key]?.[isDE ? 'de' : 'en'] || key
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <h2 className="text-2xl font-bold mb-4 text-foreground">
        {t('errors.unknown')}
      </h2>
      <p className="text-muted-foreground mb-6">
        {t('errors.contactSupport')}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm font-medium"
        >
          {t('errors.tryAgain')}
        </button>
        <a
          href="/"
          className="px-6 py-2 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium"
        >
          {t('common.backToHome')}
        </a>
      </div>
    </div>
  )
}
