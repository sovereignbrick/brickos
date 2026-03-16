"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

const principles = [
  { key: "dataSovereignty", icon: "\ud83c\udfe0", color: "#3b82f6" },
  { key: "openSource", icon: "\ud83d\udcdc", color: "#84cc16" },
  { key: "privacyByDesign", icon: "\ud83d\udee1\ufe0f", color: "#8b5cf6" },
  { key: "minimalData", icon: "\ud83c\udfaf", color: "#f59e0b" },
];

const technicalSecurity = [
  { key: "aes256", icon: "\ud83d\udd10", color: "#ef4444" },
  { key: "tls13", icon: "\ud83d\udd12", color: "#f59e0b" },
  { key: "zeroKnowledge", icon: "\ud83d\udc41\ufe0f", color: "#8b5cf6" },
  { key: "noAnalytics", icon: "\ud83d\udeab", color: "#10b981" },
  { key: "docker", icon: "\ud83d\udce6", color: "#2496ed" },
  { key: "securityUpdates", icon: "\ud83d\udd04", color: "#22d3ee" },
];

const compliance = [
  { key: "gdpr", icon: "\ud83c\uddef\ud83c\uddfa", color: "#3b82f6" },
  { key: "austrianEcg", icon: "\u2696\ufe0f", color: "#8b5cf6" },
  { key: "ageRequirement", icon: "\ud83d\uddd3\ufe0f", color: "#f59e0b" },
  { key: "refundPolicy", icon: "\ud83d\udcb0", color: "#10b981" },
  { key: "dataExport", icon: "\ud83d\udce4", color: "#22d3ee" },
  { key: "dataDeletion", icon: "\ud83d\uddd1\ufe0f", color: "#ef4444" },
];

const paymentSecurity = [
  { key: "stripe", icon: "\ud83d\udcb3", color: "#635bff" },
  { key: "btcpay", icon: "\u20bf", color: "#f59e0b" },
  { key: "noPaymentData", icon: "\ud83d\udd12", color: "#10b981" },
  { key: "bitcoinDiscount", icon: "\ud83d\udcb0", color: "#84cc16" },
];

const aiHealthData = [
  { key: "aiAssisted", icon: "\ud83e\udde0", color: "#8b5cf6" },
  { key: "noMedicalAdvice", icon: "\u2695\ufe0f", color: "#ef4444" },
  { key: "noAiTraining", icon: "\ud83d\udeab", color: "#f59e0b" },
  { key: "noDataSharing", icon: "\ud83d\udd12", color: "#10b981" },
];

interface TileProps {
  icon: string;
  title: string;
  description: string;
  color: string;
}

function Tile({ icon, title, description, color }: TileProps) {
  return (
    <div
      className="rounded-xl border bg-[var(--card)] p-5"
      style={{ borderColor: color + "30" }}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-lg font-semibold" style={{ color }}>
          {title}
        </h3>
      </div>
      <p className="text-sm leading-relaxed text-[var(--muted)]">{description}</p>
    </div>
  );
}

export default function SecurityPage() {
  const { t } = useI18n();

  return (
    <div>
      {/* Hero */}
      <section className="px-6 py-14 text-center">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t("security.hero.title")}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg font-medium text-[#1e3a5f]" style={{ color: "#4a7ab5" }}>
            {t("security.hero.tagline")}
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="px-6 pb-8">
        <div className="mx-auto max-w-3xl space-y-4 text-lg leading-relaxed text-[var(--muted)]">
          <p>{t("security.intro.paragraph1")}</p>
          <p>{t("security.intro.paragraph2")}</p>
          <p>{t("security.intro.paragraph3")}</p>
        </div>
      </section>

      {/* Our Security Principles */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold mb-8">
            {t("security.principles.heading")}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {principles.map((p) => (
              <Tile
                key={p.key}
                icon={p.icon}
                title={t(`security.principles.${p.key}.title`)}
                description={t(`security.principles.${p.key}.description`)}
                color={p.color}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Technical Security */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold mb-8">
            {t("security.technical.heading")}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {technicalSecurity.map((item) => (
              <Tile
                key={item.key}
                icon={item.icon}
                title={t(`security.technical.${item.key}.title`)}
                description={t(`security.technical.${item.key}.description`)}
                color={item.color}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold mb-8">
            {t("security.compliance.heading")}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {compliance.map((item) => (
              <Tile
                key={item.key}
                icon={item.icon}
                title={t(`security.compliance.${item.key}.title`)}
                description={t(`security.compliance.${item.key}.description`)}
                color={item.color}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Payment Security */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold mb-8">
            {t("security.payment.heading")}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {paymentSecurity.map((item) => (
              <Tile
                key={item.key}
                icon={item.icon}
                title={t(`security.payment.${item.key}.title`)}
                description={t(`security.payment.${item.key}.description`)}
                color={item.color}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Open Source Commitment */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold mb-8">
            {t("security.openSource.heading")}
          </h2>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-lg leading-relaxed text-[var(--muted)] mb-6">
              {t("security.openSource.description")}
            </p>
            <Link
              href="/open-source/"
              className="inline-flex items-center gap-2 text-[var(--accent)] font-medium hover:text-[var(--accent-hover)] transition-colors"
            >
              {t("security.openSource.link")} &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* AI & Health Data */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold mb-8">
            {t("security.ai.heading")}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {aiHealthData.map((item) => (
              <Tile
                key={item.key}
                icon={item.icon}
                title={t(`security.ai.${item.key}.title`)}
                description={t(`security.ai.${item.key}.description`)}
                color={item.color}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold mb-3">{t("security.contact.heading")}</h2>
          <p className="text-[var(--muted)] mb-4">
            {t("security.contact.description")}
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {t("security.contact.cta")}
          </Link>
        </div>
      </section>
    </div>
  );
}
