'use client'

import { useTranslations } from 'next-intl'
import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  const t = useTranslations('offline')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-6 px-4 max-w-md">
        <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mx-auto">
          <WifiOff className="h-10 w-10 text-zinc-500" />
        </div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-left text-sm space-y-2">
          <p className="font-medium text-zinc-300">{t('whatWorks')}</p>
          <ul className="text-muted-foreground space-y-1 text-xs">
            <li>- {t('cachedDashboard')}</li>
            <li>- {t('cachedMarkers')}</li>
            <li>- {t('cachedMeasurements')}</li>
          </ul>
          <p className="font-medium text-zinc-300 pt-1">{t('needsNetwork')}</p>
          <ul className="text-muted-foreground space-y-1 text-xs">
            <li>- {t('newMeasurements')}</li>
            <li>- {t('drAlex')}</li>
            <li>- {t('labImport')}</li>
          </ul>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-500 px-6 py-2.5 text-sm font-medium text-white transition-colors"
        >
          {t('retry')}
        </button>
      </div>
    </div>
  )
}
