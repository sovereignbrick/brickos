"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { SITE_CONFIG } from "@/lib/config";

const zones = [
  {
    slug: "energy_metabolic",
    i18nKey: "energyMetabolic",
    icon: "\u26a1",
    color: "#f59e0b",
    marker_count: 13,
  },
  {
    slug: "structural",
    i18nKey: "structural",
    icon: "\ud83d\udcaa",
    color: "#8b5cf6",
    marker_count: 15,
  },
  {
    slug: "cardiovascular",
    i18nKey: "cardiovascular",
    icon: "\ud83e\udec0",
    color: "#ef4444",
    marker_count: 11,
  },
  {
    slug: "cognitive",
    i18nKey: "cognitive",
    icon: "\ud83e\udde0",
    color: "#3b82f6",
    marker_count: 8,
  },
  {
    slug: "immune",
    i18nKey: "immune",
    icon: "\ud83d\udee1\ufe0f",
    color: "#10b981",
    marker_count: 20,
  },
  {
    slug: "nutritional",
    i18nKey: "nutritional",
    icon: "\ud83c\udf31",
    color: "#22d3ee",
    marker_count: 21,
  },
  {
    slug: "hormonal",
    i18nKey: "hormonal",
    icon: "\ud83c\udfaf",
    color: "#ec4899",
    marker_count: 10,
  },
  {
    slug: "detoxification",
    i18nKey: "detoxification",
    icon: "\ud83d\udd04",
    color: "#84cc16",
    marker_count: 14,
  },
];

export default function HealthZonesPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          {t('healthZones.hero.title')}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lg font-medium text-[var(--zone-cognitive)]">
          {t('healthZones.hero.tagline')}
        </p>
        <p className="text-lg text-muted max-w-2xl mx-auto">
          {t('healthZones.hero.subtitle')}
        </p>
      </div>

      {/* Zone Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        {zones.map((zone) => {
          const sampleMarkers = t(`healthZones.zones.${zone.i18nKey}.sampleMarkers`) as unknown as string[];
          return (
            <Link
              key={zone.slug}
              href={`/markers/?zone=${zone.slug}`}
              className="group block rounded-xl border bg-[var(--card)] p-5 transition-colors hover:bg-[var(--card-hover)]"
              style={{ borderColor: zone.color + "30" }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-2xl"
                  style={{ backgroundColor: zone.color + "20" }}
                >
                  {zone.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h2
                      className="text-lg font-semibold group-hover:text-foreground"
                      style={{ color: zone.color }}
                    >
                      {t(`healthZones.zones.${zone.i18nKey}.name`)}
                    </h2>
                    <span className="text-xs text-muted bg-white/5 px-2 py-1 rounded-full">
                      {t('healthZones.markersLabel', { count: String(zone.marker_count) })}
                    </span>
                  </div>
                  <p className="text-sm text-muted leading-relaxed mb-3">
                    {t(`healthZones.zones.${zone.i18nKey}.description`)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(sampleMarkers) && sampleMarkers.map((m) => (
                      <span
                        key={m}
                        className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-muted"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mt-12 text-center">
        <h2 className="text-2xl font-bold mb-3">
          {t('healthZones.cta.heading')}
        </h2>
        <p className="text-muted mb-5">
          {t('healthZones.cta.description')}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href={SITE_CONFIG.appUrl}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            {t('healthZones.cta.tryTheApp')}
          </a>
          <Link
            href="/open-source/"
            className="rounded-lg border border-[var(--border)] px-6 py-3 text-sm font-medium text-foreground hover:bg-white/5 transition-colors"
          >
            {t('healthZones.cta.selfHostForFree')}
          </Link>
        </div>
      </div>
    </div>
  );
}
