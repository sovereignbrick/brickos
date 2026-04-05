'use client'

import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { useContent } from '@/lib/content-context'

interface FeatureCard {
  titleKey: string
  descKey: string
  screenshotEN: string
  screenshotDE: string
}

const CATEGORIES: { labelKey: string; cards: FeatureCard[] }[] = [
  {
    labelKey: 'categoryDashboard',
    cards: [
      {
        titleKey: 'dashboard',
        descKey: 'dashboardDesc',
        screenshotEN: '/screenshots/dashboard_EN.png',
        screenshotDE: '/screenshots/dashboard_DE.png',
      },
    ],
  },
  {
    labelKey: 'categoryMarkers',
    cards: [
      {
        titleKey: 'markerDetail',
        descKey: 'markerDetailDesc',
        screenshotEN: '/screenshots/marker_glucose_EN.png',
        screenshotDE: '/screenshots/marker_glucose_DE.png',
      },
      {
        titleKey: 'zones',
        descKey: 'zonesDesc',
        screenshotEN: '/screenshots/zones_metabolic_EN.png',
        screenshotDE: '/screenshots/zones_metabolic_DE.png',
      },
    ],
  },
  {
    labelKey: 'categorySearch',
    cards: [
      {
        titleKey: 'search',
        descKey: 'searchDesc',
        screenshotEN: '/screenshots/search_EN.png',
        screenshotDE: '/screenshots/search_DE.png',
      },
    ],
  },
  {
    labelKey: 'categoryMeasurements',
    cards: [
      {
        titleKey: 'measurements',
        descKey: 'measurementsDesc',
        screenshotEN: '/screenshots/measurements_EN.png',
        screenshotDE: '/screenshots/measurements_DE.png',
      },
      {
        titleKey: 'trends',
        descKey: 'trendsDesc',
        screenshotEN: '/screenshots/trends_EN.png',
        screenshotDE: '/screenshots/trends_DE.png',
      },
    ],
  },
]

export default function LearnPage() {
  const t = useTranslations('learn')
  const { locale } = useContent()
  const isDE = locale === 'de'

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
            {t('title')}
          </h1>
          <p className="mt-2 text-lg text-zinc-400">
            {t('subtitle')}
          </p>
        </div>

        {/* Feature categories */}
        {CATEGORIES.map((category) => (
          <section key={category.labelKey} className="mb-12">
            <h2 className="mb-6 text-xl font-semibold text-zinc-200">
              {t(category.labelKey)}
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {category.cards.map((card) => (
                <div
                  key={card.titleKey}
                  className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 transition-colors hover:border-zinc-700"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-950">
                    <Image
                      src={isDE ? card.screenshotDE : card.screenshotEN}
                      alt={t(card.titleKey)}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-semibold text-zinc-100">
                      {t(card.titleKey)}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                      {t(card.descKey)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Video section placeholder */}
        <section className="mb-12">
          <h2 className="mb-6 text-xl font-semibold text-zinc-200">
            {t('videosTitle')}
          </h2>
          <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 py-16">
            <p className="text-zinc-500">{t('videosComingSoon')}</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
