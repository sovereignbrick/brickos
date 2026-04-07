'use client'

import { UsersTab } from '@/components/admin/users-tab'
import { useTranslations } from 'next-intl'

export default function PlatformUsersPage() {
  const t = useTranslations('platform')

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('nav.users')}</h1>
      <UsersTab />
    </div>
  )
}
