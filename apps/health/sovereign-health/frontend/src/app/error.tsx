'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Detect locale from cookie OR URL param
  const isDE = typeof window !== 'undefined' && (
    document.cookie.includes('locale=de') ||
    new URLSearchParams(window.location.search).get('lang') === 'de'
  )

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <h2 className="text-2xl font-bold mb-4">
        {isDE ? 'Etwas ist schiefgelaufen' : 'Something went wrong'}
      </h2>
      <p className="text-zinc-400 mb-6">
        {isDE
          ? 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.'
          : 'We encountered an unexpected error. Please try again.'}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm font-medium"
        >
          {isDE ? 'Erneut versuchen' : 'Try again'}
        </button>
        <a
          href="/"
          className="px-6 py-2 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium"
        >
          {isDE ? 'Zur Startseite' : 'Back to home'}
        </a>
      </div>
    </div>
  )
}
