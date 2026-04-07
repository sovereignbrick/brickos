'use client'

import { useAdminContext } from './layout'
import { useTranslations } from 'next-intl'

export default function PlatformHomePage() {
  const ctx = useAdminContext()
  const t = useTranslations('platform')

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        {ctx.orgName ? `${ctx.orgName} - ${t('dashboard')}` : t('dashboard')}
      </h1>
      <p className="text-zinc-400 text-sm">
        {t('dashboardDescription') ?? 'Platform dashboard will be implemented in Day 7.'}
      </p>
    </div>
  )
}
