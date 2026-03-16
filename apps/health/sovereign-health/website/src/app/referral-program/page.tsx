"use client";

import { useI18n } from "@/lib/i18n";
import { SITE_CONFIG } from "@/lib/config";

const steps = [
  { key: "signUp", icon: "\uD83D\uDE80", color: "#3b82f6" },
  { key: "getLink", icon: "\uD83D\uDD17", color: "#8b5cf6" },
  { key: "share", icon: "\uD83D\uDCE3", color: "#10b981" },
  { key: "earn", icon: "\uD83D\uDCB0", color: "#f59e0b" },
] as const;

const details = [
  { key: "commission", icon: "\uD83D\uDCB5", color: "#10b981" },
  { key: "evaluation", icon: "\u23F3", color: "#3b82f6" },
  { key: "payoutOptions", icon: "\uD83D\uDCB3", color: "#8b5cf6" },
  { key: "minimumPayout", icon: "\uD83D\uDCCA", color: "#f59e0b" },
  { key: "payoutSchedule", icon: "\uD83D\uDCC5", color: "#ef4444" },
] as const;

export default function ReferralProgramPage() {
  const { t } = useI18n();

  return (
    <div>
      {/* Hero */}
      <section className="px-6 py-14 text-center">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t("referral.hero.title")}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg font-medium text-[var(--zone-cardiovascular)]">
            {t("referral.hero.colorSubtitle")}
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-[var(--muted)]">
            {t("referral.hero.subtitle")}
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 pb-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-center text-2xl font-bold">{t("referral.howItWorks.heading")}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, idx) => (
              <div
                key={step.key}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 text-center"
                style={{ borderTopColor: step.color, borderTopWidth: '2px' }}
              >
                <div className="mb-2 text-3xl">{step.icon}</div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: step.color }}>
                  {t("referral.howItWorks.step")} {idx + 1}
                </div>
                <h3 className="font-semibold text-[var(--foreground)]">{t(`referral.howItWorks.steps.${step.key}.title`)}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{t(`referral.howItWorks.steps.${step.key}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commission Details */}
      <section className="px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-center text-2xl font-bold">{t("referral.details.heading")}</h2>
          <div className="space-y-3">
            {details.map((item) => (
              <div
                key={item.key}
                className="flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
                style={{ borderLeftColor: item.color, borderLeftWidth: '3px' }}
              >
                <span className="text-xl shrink-0">{item.icon}</span>
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{t(`referral.details.items.${item.key}.title`)}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{t(`referral.details.items.${item.key}.description`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Promo Codes Info */}
      <section className="px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-center text-2xl font-bold">{t("referral.promoCodes.heading")}</h2>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
            <ul className="space-y-3">
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[var(--muted)]">
                  <span className="mt-0.5 text-emerald-400 shrink-0">&#10003;</span>
                  <span>{t(`referral.promoCodes.items.${i}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-10 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold">{t("referral.cta.heading")}</h2>
          <p className="mt-3 text-[var(--muted)]">{t("referral.cta.description")}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={`${SITE_CONFIG.appUrl}/settings`}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              {t("referral.cta.viewDashboard")}
            </a>
            <a
              href={`${SITE_CONFIG.appUrl}/signup`}
              className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] px-6 py-3 font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--card)]"
            >
              {t("referral.cta.createAccount")}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
