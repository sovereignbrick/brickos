'use client'

// Sprint 040 #483 -- read-only Tier configuration screen.
//
// Surfaces brickos.license_tiers + brickos.tier_features so the operator can
// see what's in each tier without poking around the database. Editing tiers
// requires super_admin + an explicit confirmation flow that's deferred to a
// follow-up sprint, so this view is intentionally read-only.
//
// design 022 §7.2 Screen 5.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { api } from '@/lib/api'

interface Tier {
  slug: string
  name: string
  description: string | null
  app_key: string | null
  sort_order: number
}

interface FeatureRow {
  slug: string
  app_slug: string
  category: string
  name_en: string
  name_de: string
}

export default function LicensingPage() {
  const t = useTranslations('platform.licensingScreens')
  const locale = useLocale()
  const [tiers, setTiers] = useState<Tier[]>([])
  const [features, setFeatures] = useState<FeatureRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.admin.listLicensingTiers().catch(() => ({ data: [] })),
      api.admin.listFeatureRegistry().catch(() => ({ data: [] })),
    ])
      .then(([tiersRes, featuresRes]) => {
        setTiers(tiersRes.data)
        setFeatures(featuresRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const featuresByApp = useMemo(() => {
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('tiers.title')}</h1>
          <div className="flex items-center gap-3 text-xs">
            <Link href="/platform/features" className="text-zinc-400 hover:text-zinc-200">
              {t('features.title')} →
            </Link>
            <Link
              href="/platform/licensing/revocations"
              className="text-zinc-400 hover:text-zinc-200"
            >
              {t('revocations.title')} →
            </Link>
          </div>
        </div>
        <p className="text-sm text-zinc-500">{t('tiers.description')}</p>
      </div>

      {loading && <div className="text-zinc-500 text-sm">Loading...</div>}

      {!loading && tiers.length === 0 && (
        <p className="text-sm text-zinc-500">{t('tiers.noTiers')}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tiers.map((tier) => (
          <div key={tier.slug} className="rounded-2xl border border-zinc-800 p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">{tier.name}</h2>
                <p className="text-xs text-zinc-500 font-mono">{tier.slug}</p>
              </div>
              {tier.app_key && (
                <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full font-mono">
                  {tier.app_key}
                </span>
              )}
            </div>
            {tier.description && (
              <p className="text-sm text-zinc-400">{tier.description}</p>
            )}
            <p className="text-[10px] text-zinc-600">{t('tiers.featuresHint')}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-800 p-5 space-y-3">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          {t('features.byApp')}
        </h2>
        {featuresByApp.length === 0 ? (
          <p className="text-sm text-zinc-500">{t('features.empty')}</p>
        ) : (
          featuresByApp.map(([app, items]) => (
            <div key={app} className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">
                {app} ({items.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {items.map((f) => (
                  <span
                    key={f.slug}
                    className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded-full font-mono"
                    title={locale === 'de' ? f.name_de : f.name_en}
                  >
                    {f.slug}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
