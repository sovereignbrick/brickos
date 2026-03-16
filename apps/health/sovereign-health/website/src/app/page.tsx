"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/config";
import { useI18n } from "@/lib/i18n";
import markersData from "../../data/markers.json";

const featureKeys = [
  { key: "healthMarkers", color: "#f59e0b" },
  { key: "healthCoach", color: "#8b5cf6" },
  { key: "encrypted", color: "#ef4444" },
  { key: "dataExport", color: "#3b82f6" },
  { key: "medication", color: "#10b981" },
  { key: "openSource", color: "#84cc16" },
];

const stepKeys = [
  { number: 1, key: "step1", color: "#f59e0b" },
  { number: 2, key: "step2", color: "#3b82f6" },
  { number: 3, key: "step3", color: "#10b981" },
];

const zones = [
  { slug: "energy_metabolic", i18nKey: "energyMetabolic", icon: "\u26a1", color: "#f59e0b" },
  { slug: "structural", i18nKey: "structural", icon: "\ud83d\udcaa", color: "#8b5cf6" },
  { slug: "cardiovascular", i18nKey: "cardiovascular", icon: "\ud83e\udec0", color: "#ef4444" },
  { slug: "cognitive", i18nKey: "cognitive", icon: "\ud83e\udde0", color: "#3b82f6" },
  { slug: "immune", i18nKey: "immune", icon: "\ud83d\udee1\ufe0f", color: "#10b981" },
  { slug: "nutritional", i18nKey: "nutritional", icon: "\ud83c\udf31", color: "#22d3ee" },
  { slug: "hormonal", i18nKey: "hormonal", icon: "\ud83e\uddec", color: "#a855f7" },
  { slug: "detoxification", i18nKey: "detoxification", icon: "\ud83e\udea8", color: "#14b8a6" },
];

const highlightMarkerSlugs = [
  "glucose",
  "bp_systolic",
  "vitamin_d",
  "testosterone",
  "wbc",
  "alt",
];
const highlightMarkers = highlightMarkerSlugs
  .map((slug) => markersData.find((m) => m.slug === slug))
  .filter(Boolean) as (typeof markersData)[number][];

const securityTiles = [
  { key: "aes256", icon: "\ud83d\udd10", color: "#ef4444" },
  { key: "zeroKnowledge", icon: "\ud83d\udc41\ufe0f", color: "#8b5cf6" },
  { key: "gdpr", icon: "\ud83c\uddef\ud83c\uddfa", color: "#3b82f6" },
  { key: "noTracking", icon: "\ud83d\udeab", color: "#10b981" },
  { key: "openSource", icon: "\ud83d\udcdc", color: "#84cc16" },
  { key: "tls13", icon: "\ud83d\udd12", color: "#f59e0b" },
];

const tierKeys = [
  { key: "glimpse", highlighted: false },
  { key: "focus", highlighted: true },
  { key: "insight", highlighted: false },
  { key: "clarity", highlighted: false },
  { key: "horizon", highlighted: false },
];

interface StatsData {
  total_markers: number;
  total_zones: number;
  total_features: number;
}

export default function Home() {
  const { t, locale } = useI18n();
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    fetch(`${SITE_CONFIG.apiUrl}/api/features/stats`)
      .then((r) => r.json())
      .then((d) => { if (d.data) setStats(d.data); })
      .catch(() => {});
  }, []);

  const markerCount = stats?.total_markers ?? "85+";
  const zoneCount = stats?.total_zones ?? 8;
  const featureCount = stats?.total_features ?? "26";

  return (
    <div>
      {/* Hero */}
      <section className="px-6 py-14 text-center">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {t('home.hero.title')}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg font-medium text-[var(--accent)]">
            {t('home.hero.tagline')}
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-[var(--muted)]">
            {t('home.hero.subtitle')}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={SITE_CONFIG.appUrl}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              {t('home.hero.tryTheApp')}
            </a>
            <a
              href="/open-source/"
              className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] px-6 py-3 font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--card)]"
            >
              {t('home.hero.selfHostForFree')}
            </a>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="px-6 py-6">
        <div className="mx-auto max-w-3xl grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-[var(--accent)]">{markerCount}</p>
            <p className="text-sm text-[var(--muted)]">{t('home.stats.markers')}</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-[var(--accent)]">{zoneCount}</p>
            <p className="text-sm text-[var(--muted)]">{t('home.stats.zones')}</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-[var(--accent)]">{featureCount}</p>
            <p className="text-sm text-[var(--muted)]">{t('home.stats.features')}</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold">{t('home.howItWorks.heading')}</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {stepKeys.map((step) => (
              <div key={step.number} className="text-center">
                <div
                  className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{ backgroundColor: step.color }}
                >
                  {step.number}
                </div>
                <h3 className="mt-3 text-xl font-semibold">{t(`home.howItWorks.${step.key}.title`)}</h3>
                <p className="mt-2 text-[var(--muted)]">{t(`home.howItWorks.${step.key}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold">{t('home.features.heading')}</h2>
            <Link href="/features/" className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
              {t('home.sections.viewAll')}
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featureKeys.map((feature) => (
              <div
                key={feature.key}
                className="rounded-xl border bg-[var(--card)] p-5"
                style={{ borderColor: feature.color + "30" }}
              >
                <h3 className="text-lg font-semibold" style={{ color: feature.color }}>
                  {t(`home.features.${feature.key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  {t(`home.features.${feature.key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Health Zones Highlight */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold">{t('home.sections.healthZones')}</h2>
            <Link href="/health-zones/" className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
              {t('home.sections.viewAll')}
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {zones.map((zone) => {
              const count = markersData.filter((m) => m.zone_slug === zone.slug).length;
              return (
                <Link
                  key={zone.slug}
                  href={`/markers/?zone=${zone.slug}`}
                  className="group flex items-center gap-4 rounded-xl border bg-[var(--card)] p-5 transition-colors hover:bg-[var(--card-hover)]"
                  style={{ borderColor: zone.color + "30" }}
                >
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-2xl"
                    style={{ backgroundColor: zone.color + "20" }}
                  >
                    {zone.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold group-hover:text-foreground" style={{ color: zone.color }}>
                      {t(`healthZones.zones.${zone.i18nKey}.name`)}
                    </h3>
                    <p className="text-sm text-[var(--muted)] truncate">
                      {count} {t('home.sections.markersInZone')}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Markers Highlight */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold">{t('home.sections.markers')}</h2>
            <Link href="/markers/" className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
              {t('home.sections.viewAll')}
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {highlightMarkers.map((marker) => {
              const zoneInfo = zones.find((z) => z.slug === marker.zone_slug);
              return (
                <Link
                  key={marker.slug}
                  href={`/markers/${marker.slug}/`}
                  className="group rounded-xl border bg-[var(--card)] p-5 transition-colors hover:bg-[var(--card-hover)]"
                  style={{ borderColor: (zoneInfo?.color ?? "#666") + "30" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {zoneInfo && <span className="text-lg">{zoneInfo.icon}</span>}
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-blue-400 transition-colors">
                      {marker.display_name || marker.name}
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--muted)] mb-2">{marker.zone_name} &middot; {marker.unit}</p>
                  <p className="text-sm leading-relaxed text-[var(--muted)] line-clamp-2">
                    {marker.description?.split("\n")[0]}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Security & Privacy */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">{t('home.sections.securityPrivacy')}</h2>
            <Link href="/security/" className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
              {t('home.sections.learnMore')}
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {securityTiles.map((tile) => (
              <div
                key={tile.key}
                className="rounded-xl border bg-[var(--card)] p-5"
                style={{ borderColor: tile.color + "30" }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{tile.icon}</span>
                  <h3 className="text-lg font-semibold" style={{ color: tile.color }}>
                    {t(`home.trustBadges.${tile.key}`)}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-[var(--muted)]">
                  {t(`home.securityDescriptions.${tile.key}`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Preview */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold">{t('home.demo.heading')}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-[var(--muted)]">
            {t('home.demo.description')}
          </p>
          <div className="mt-6">
            <a
              href={SITE_CONFIG.demoUrl}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              {t('home.demo.openTheApp')}
            </a>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex h-48 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)]"
              >
                <span className="text-sm text-[var(--muted)]">{t('home.demo.screenshotPlaceholder')}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Summary */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold">{t('home.pricing.heading')}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {tierKeys.map((tier) => (
              <div
                key={tier.key}
                className={`rounded-xl border p-5 text-center ${
                  tier.highlighted
                    ? "border-blue-600 bg-[var(--card)]"
                    : "border-[var(--border)] bg-[var(--card)]"
                }`}
              >
                <h3 className="text-lg font-semibold">{t(`home.pricing.tiers.${tier.key}.name`)}</h3>
                <p className="mt-2 text-xl font-bold">{t(`home.pricing.tiers.${tier.key}.price`)}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{t(`home.pricing.tiers.${tier.key}.tagline`)}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <a
              href="/pricing/"
              className="text-sm font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]"
            >
              {t('home.pricing.seeFullComparison')}
            </a>
          </div>
        </div>
      </section>

      {/* Founder Quote */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-3xl text-center">
          <blockquote className="text-lg italic leading-relaxed text-[var(--muted)]">
            &ldquo;{t('home.founderQuote.quote')}&rdquo;
          </blockquote>
          <p className="mt-4 font-semibold">{t('home.founderQuote.attribution')}</p>
        </div>
      </section>
    </div>
  );
}
