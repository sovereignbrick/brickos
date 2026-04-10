'use client'

import Link from 'next/link'
import { UsersTab } from '@/components/admin/users-tab'
import { useTranslations } from 'next-intl'

export default function PlatformUsersPage() {
  const t = useTranslations('platform')
  const td = useTranslations('platform.dormantUsers')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('nav.users')}</h1>
        <Link
          href="/platform/users/dormant"
          className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
        >
          {td('title')} →
        </Link>
      </div>
      <UsersTab />
    </div>
  )
}
