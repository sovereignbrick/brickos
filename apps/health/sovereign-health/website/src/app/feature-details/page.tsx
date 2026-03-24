"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { FeatureComparisonTable, useApiFeatures } from "@/components/feature-comparison-table";

export default function FeatureDetailsPage() {
  const { t, locale } = useI18n();
  const { features, categories, loading } = useApiFeatures(locale);
  const [search, setSearch] = useState("");

  return (
    <div>
      {/* Hero */}
      <section className="px-6 pt-10 pb-0 text-center">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t("featureDetails.title")}
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-[var(--muted)] leading-relaxed">
            {t("featureDetails.subtitle", { count: features.length || "" })}
          </p>
        </div>
      </section>

      {/* Feature Comparison Table with inline search */}
      <FeatureComparisonTable
        features={features}
        categories={categories}
        loading={loading}
        locale={locale}
        t={t}
        showHeading={false}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("featureDetails.searchPlaceholder")}
      />

      {/* CTA tiles */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-4xl grid gap-5 sm:grid-cols-3">
          {/* Try the App */}
          <div className="rounded-xl border p-6 text-center" style={{ borderColor: '#3b82f640', background: 'linear-gradient(135deg, #3b82f610, transparent)' }}>
            <span className="text-3xl mb-3 block">{'\uD83D\uDE80'}</span>
            <h3 className="font-bold text-lg" style={{ color: '#3b82f6' }}>{t("featureDetails.cta.tryApp.title")}</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">{t("featureDetails.cta.tryApp.description")}</p>
            <a
              href={`https://app.sovereignhealth.io/signup${locale !== 'en' ? `?lang=${locale}` : ''}`}
              className="mt-4 inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: '#3b82f6' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2563eb')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#3b82f6')}
            >
              {t("featureDetails.cta.tryApp.button")}
            </a>
          </div>

          {/* Choose a Plan */}
          <div className="rounded-xl border p-6 text-center" style={{ borderColor: '#10b98140', background: 'linear-gradient(135deg, #10b98110, transparent)' }}>
            <span className="text-3xl mb-3 block">{'\uD83D\uDCB3'}</span>
            <h3 className="font-bold text-lg" style={{ color: '#10b981' }}>{t("featureDetails.cta.choosePlan.title")}</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">{t("featureDetails.cta.choosePlan.description")}</p>
            <a
              href={`/pricing/${locale !== 'en' ? `?lang=${locale}` : ''}`}
              className="mt-4 inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: '#10b981' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#059669')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#10b981')}
            >
              {t("featureDetails.cta.choosePlan.button")}
            </a>
          </div>

          {/* Explore Features */}
          <div className="rounded-xl border p-6 text-center" style={{ borderColor: '#8b5cf640', background: 'linear-gradient(135deg, #8b5cf610, transparent)' }}>
            <span className="text-3xl mb-3 block">{'\u2728'}</span>
            <h3 className="font-bold text-lg" style={{ color: '#8b5cf6' }}>{t("featureDetails.cta.exploreFeatures.title")}</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">{t("featureDetails.cta.exploreFeatures.description")}</p>
            <a
              href={`/features/${locale !== 'en' ? `?lang=${locale}` : ''}`}
              className="mt-4 inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: '#8b5cf6' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#7c3aed')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#8b5cf6')}
            >
              {t("featureDetails.cta.exploreFeatures.button")}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
