'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Zone } from '@/lib/types'
import { ZoneCard } from '@/components/zone-card'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useDemoProfile, DEMO_PROFILES } from '@/lib/demo-profile-context'
import { InfoCarousel, CarouselCard } from '@/components/info-carousel'
import { UsageWidget } from '@/components/usage-widget'
import { useTranslations } from 'next-intl'

function useCarouselCards(): CarouselCard[] {
  const t = useTranslations('dashboard.carousel')
  return [
    { icon: '💬', title: t('askDoctor'), description: t('askDoctorDesc'), link: '/doctor-chat' },
    { icon: '📊', title: t('exploreTrends'), description: t('exploreTrendsDesc'), link: '/trends' },
    { icon: '➕', title: t('addMeasurement'), description: t('addMeasurementDesc'), link: '/measurements/new' },
    { icon: '🔬', title: t('healthZones'), description: t('healthZonesDesc'), link: '/zones/energy_metabolic' },
    { icon: '💡', title: t('didYouKnow'), description: t('didYouKnowDesc'), link: '/markers/iron' },
    { icon: '🎯', title: t('whatIsApoB'), description: t('whatIsApoBDesc'), link: '/markers/apob' },
    { icon: '⚡', title: t('gkiRatio'), description: t('gkiRatioDesc'), link: '/markers/gki' },
    { icon: '🛡️', title: t('privacyFirst'), description: t('privacyFirstDesc'), link: '/about' },
  ]
}

const MOCK_ZONES: Zone[] = [
  { zone_slug: 'energy_metabolic', zone_name: 'Energy & Metabolic', zone_icon: '⚡', zone_color: '#FF9500', display_order: 1, marker_count: 4, markers_with_data: 0, status_summary: { green: 0, orange: 0, red: 0 } },
  { zone_slug: 'cognitive', zone_name: 'Cognitive', zone_icon: '🧠', zone_color: '#7C4DFF', display_order: 2, marker_count: 0, markers_with_data: 0, status_summary: { green: 0, orange: 0, red: 0 } },
  { zone_slug: 'cardiovascular', zone_name: 'Cardiovascular', zone_icon: '🫀', zone_color: '#E91E63', display_order: 3, marker_count: 3, markers_with_data: 0, status_summary: { green: 0, orange: 0, red: 0 } },
  { zone_slug: 'nutritional', zone_name: 'Nutritional', zone_icon: '🌱', zone_color: '#8BC34A', display_order: 4, marker_count: 0, markers_with_data: 0, status_summary: { green: 0, orange: 0, red: 0 } },
  { zone_slug: 'structural', zone_name: 'Structural', zone_icon: '💪', zone_color: '#2196F3', display_order: 5, marker_count: 4, markers_with_data: 0, status_summary: { green: 0, orange: 0, red: 0 } },
  { zone_slug: 'hormonal', zone_name: 'Hormonal', zone_icon: '🎯', zone_color: '#AB47BC', display_order: 6, marker_count: 0, markers_with_data: 0, status_summary: { green: 0, orange: 0, red: 0 } },
  { zone_slug: 'immune', zone_name: 'Immune', zone_icon: '🛡️', zone_color: '#009688', display_order: 7, marker_count: 0, markers_with_data: 0, status_summary: { green: 0, orange: 0, red: 0 } },
  { zone_slug: 'detoxification', zone_name: 'Detoxification', zone_icon: '🔄', zone_color: '#00BCD4', display_order: 8, marker_count: 1, markers_with_data: 0, status_summary: { green: 0, orange: 0, red: 0 } },
]

const ZONE_ORDER = ['energy_metabolic', 'cognitive', 'cardiovascular', 'nutritional', 'structural', 'hormonal', 'immune', 'detoxification']

export default function DashboardPage() {
  const { user, loading, isDemo } = useAuth()
  const { profile, setProfile } = useDemoProfile()
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')
  const carouselCards = useCarouselCards()
  const [zones, setZones] = useState<Zone[]>(MOCK_ZONES)
  useEffect(() => {
    if (loading) return
    if (isDemo) {
      api.demo.zones(profile)
        .then(res => { if (res.data) setZones(res.data) })
        .catch(() => {})
    } else if (user) {
      api.zones.list()
        .then(res => { if (res.data) setZones(res.data) })
        .catch(() => {})
    }
  }, [user, loading, isDemo, profile])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{tCommon('loading')}</div>

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">{t('title')}</h1>
            {isDemo && (
              <p className="text-sm text-orange-400/80">
                {t('demoData', { profile: DEMO_PROFILES.find(p => p.slug === profile)?.name ?? 'Optimized' })}
              </p>
            )}
          </div>
          {!isDemo && (
            <Link
              href="/measurements/new"
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {t('addButton')}
            </Link>
          )}
        </div>

        {/* Welcome block + profile selector (demo only) */}
        {isDemo && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 mb-6 text-center space-y-4">
            <p className="text-base text-foreground/90 max-w-xl mx-auto leading-relaxed">
              {t('demoWelcome')}
            </p>

            <div className="grid grid-cols-3 gap-2 max-w-lg mx-auto">
              {DEMO_PROFILES.map(p => (
                <button
                  key={p.slug}
                  onClick={() => setProfile(p.slug)}
                  className={`rounded-xl border-2 p-3 text-left transition-all ${
                    profile === p.slug
                      ? 'border-current bg-white/5'
                      : 'border-zinc-800 hover:border-zinc-600'
                  }`}
                  style={{ borderColor: profile === p.slug ? p.color : undefined }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-sm font-semibold">{p.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          {t('healthZones')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...zones].sort((a, b) => ZONE_ORDER.indexOf(a.zone_slug) - ZONE_ORDER.indexOf(b.zone_slug)).map(zone => <ZoneCard key={zone.zone_slug} zone={zone} />)}
        </div>

        {/* Usage widget (authenticated, non-demo users only) */}
        {!isDemo && user && (
          <div className="mt-6">
            <UsageWidget />
          </div>
        )}

        {/* Informational Carousel */}
        <div className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            {t('explore')}
          </h2>
          <InfoCarousel cards={carouselCards} />
        </div>

        {!isDemo && zones.every(z => z.markers_with_data === 0) && (
          <div className="rounded-2xl border border-dashed p-12 text-center mt-8">
            <p className="text-muted-foreground text-sm mb-4">{tCommon('noMeasurements')}</p>
            <Link
              href="/measurements/new"
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors inline-block"
            >
              {t('recordFirst')}
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
