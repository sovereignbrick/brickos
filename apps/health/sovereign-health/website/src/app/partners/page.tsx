"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { SITE_CONFIG } from "@/lib/config";

const affiliateHighlights = [
  { key: "commission", icon: "\ud83d\udcb0" },
  { key: "bitcoin", icon: "\u20bf" },
  { key: "cookie", icon: "\ud83d\udd17" },
  { key: "dashboard", icon: "\ud83d\udcca" },
];

export default function PartnersPage() {
  const { t } = useI18n();

  const partnerTypes = [
    {
      key: "healthPractitioners",
      title: t("partners.types.healthPractitioners.title"),
      color: "#ef4444",
      description: t("partners.types.healthPractitioners.description"),
    },
    {
      key: "deviceManufacturers",
      title: t("partners.types.deviceManufacturers.title"),
      color: "#3b82f6",
      description: t("partners.types.deviceManufacturers.description"),
    },
    {
      key: "contentContributors",
      title: t("partners.types.contentContributors.title"),
      color: "#10b981",
      description: t("partners.types.contentContributors.description"),
    },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="px-6 py-14 text-center">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t("partners.hero.title")}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg font-medium text-[var(--zone-hormonal)]">
            {t("partners.hero.tagline")}
          </p>
        </div>
      </section>

      {/* Affiliate Highlight */}
      <section className="px-6 pb-10">
        <div className="mx-auto max-w-7xl">
          <div
            className="rounded-xl border-2 bg-[var(--card)] p-6 sm:p-8"
            style={{ borderColor: "#f59e0b60" }}
          >
            <div className="flex flex-col lg:flex-row lg:items-start lg:gap-8">
              <div className="flex-1">
                <h2 className="text-2xl font-bold" style={{ color: "#f59e0b" }}>
                  {t("partners.affiliate.title")}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                  {t("partners.affiliate.description")}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {affiliateHighlights.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2"
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-xs font-medium text-[var(--foreground)]">
                        {t(`partners.affiliate.highlights.${item.key}`)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-3 lg:mt-0 lg:shrink-0">
                <a
                  href={`${SITE_CONFIG.appUrl}/affiliate`}
                  className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
                >
                  {t("partners.affiliate.cta")}
                </a>
                <Link
                  href="/referral-program/"
                  className="text-center text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                >
                  {t("partners.affiliate.learnMore")} &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Types */}
      <section className="px-6 pb-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {partnerTypes.map((partner) => (
              <div
                key={partner.key}
                className="rounded-xl border bg-[var(--card)] p-6"
                style={{ borderColor: partner.color + "40" }}
              >
                <h3 className="text-lg font-semibold" style={{ color: partner.color }}>
                  {partner.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                  {partner.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-10 text-center">
        <div className="mx-auto max-w-3xl">
          <p className="text-lg text-[var(--muted)]">
            {t("partners.cta.prefix")}{" "}
            <Link
              href="/contact"
              className="text-[var(--accent)] underline transition-colors hover:text-[var(--accent-hover)]"
            >
              {t("partners.cta.linkText")}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
