'use client'

// Sprint 040 #483 -- read-only Feature registry screen.
//
// All entries from brickos.feature_registry, grouped by app namespace.
// design 022 §7.2 Screen 6.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { api } from '@/lib/api'

interface FeatureRow {
  slug: string
  app_slug: string
  category: string
  name_en: string
  name_de: string
  description_en: string | null
  description_de: string | null
  is_active: boolean
}

export default function FeaturesPage() {
  const t = useTranslations('platform.licensingScreens.features')
  const locale = useLocale()
  const [features, setFeatures] = useState<FeatureRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.admin
      .listFeatureRegistry()
      .then((res) => setFeatures(res.data))
      .catch(() => setFeatures([]))
      .finally(() => setLoading(false))
  }, [])

  const grouped = useMemo(() => {
    const map = new Map<string, FeatureRow[]>()
    for (const f of features) {
      const list = map.get(f.app_slug) ?? []
      list.push(f)
      map.set(f.app_slug, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [features])

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/platform/licensing" className="text-xs text-zinc-400 hover:text-zinc-200">
          ← Tier configuration
        </Link>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-zinc-500">{t('description')}</p>
      </div>

      {loading && <div className="text-zinc-500 text-sm">Loading...</div>}

      {!loading &&
        grouped.map(([app, items]) => (
          <div key={app} className="space-y-2">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
              {app} ({items.length})
            </h2>
            <div className="rounded-2xl border border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2 px-3">
                      {t('col.slug')}
                    </th>
                    <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2 px-3">
                      {t('col.category')}
                    </th>
                    <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-left py-2 px-3">
                      {t('col.name')}
                    </th>
                    <th className="text-xs text-zinc-400 font-medium uppercase tracking-wider text-center py-2 px-3">
                      {t('col.active')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((f) => (
                    <tr key={f.slug} className="border-b border-zinc-800/40">
                      <td className="py-2 px-3 font-mono text-xs">{f.slug}</td>
                      <td className="py-2 px-3 text-zinc-400 text-xs">{f.category}</td>
                      <td className="py-2 px-3 text-zinc-300">
                        {locale === 'de' ? f.name_de : f.name_en}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {f.is_active ? (
                          <span className="text-green-400">●</span>
                        ) : (
                          <span className="text-zinc-700">×</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </div>
  )
}
