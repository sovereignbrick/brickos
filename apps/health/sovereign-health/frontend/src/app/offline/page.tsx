'use client'

import { useTranslations } from 'next-intl'
import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  const t = useTranslations('offline')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-6 px-4">
        <WifiOff className="h-16 w-16 mx-auto text-muted-foreground" />
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground max-w-sm">{t('description')}</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {t('retry')}
        </button>
      </div>
    </div>
  )
}
