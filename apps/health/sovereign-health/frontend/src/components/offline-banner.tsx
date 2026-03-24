'use client'

import { useOffline } from '@/lib/offline-context'
import { useTranslations } from 'next-intl'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  const { isOffline } = useOffline()
  const t = useTranslations('offline')

  if (!isOffline) return null

  return (
    <div className="bg-yellow-900/80 text-yellow-200 text-xs text-center py-1.5 px-4 flex items-center justify-center gap-2">
      <WifiOff className="h-3.5 w-3.5" />
      <span>{t('banner')}</span>
    </div>
  )
}
