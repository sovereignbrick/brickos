"use client";

import { useI18n } from "@/lib/i18n";
import { SITE_CONFIG } from "@/lib/config";

const GITHUB_REPO = SITE_CONFIG.githubRepoUrl;

const principleKeys = [
  { key: "dataSovereignty", icon: "\u{1F3E0}", color: "#3b82f6" },
  { key: "fullTransparency", icon: "\u{1F50D}", color: "#10b981" },
  { key: "zeroTrust", icon: "\u{1F512}", color: "#8b5cf6" },
  { key: "communityDriven", icon: "\u{1F91D}", color: "#f59e0b" },
] as const;

const comparisonRowKeys = [
  { key: "selfHosted" },
  { key: "dataLocation" },
  { key: "tierLimits" },
  { key: "drAlexAi" },
  { key: "labResultImport", saasOnly: true },
  { key: "medicationImport", saasOnly: true },
  { key: "pdfHealthReports", saasOnly: true },
  { key: "cohortComparison", saasOnly: true },
  { key: "aiDashboardInsights", saasOnly: true },
  { key: "prioritySupport", saasOnly: true },
  { key: "price" },
] as const;

const techStackKeys = [
  { key: "rust", color: "#f59e0b" },
  { key: "nextjs", color: "#3b82f6" },
  { key: "postgresql", color: "#8b5cf6" },
  { key: "redis", color: "#ef4444" },
  { key: "docker", color: "#2496ed" },
  { key: "nginx", color: "#009639" },
] as const;

export default function OpenSourcePage() {
  const { t } = useI18n();

  return (
    <div>
      {/* Hero */}
      <section className="px-6 py-14 text-center">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t('openSource.hero.title')}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg font-medium text-[var(--zone-immune)]">
            Transparency you can verify. Freedom you can trust.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-[var(--muted)]">
            {t('openSource.hero.subtitle')}
          </p>
        </div>
      </section>

      {/* Why Open Source */}
      <section className="px-6 pb-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-center text-2xl font-bold">{t('openSource.whyOpenSource.heading')}</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {principleKeys.map((p) => (
              <div
                key={p.key}
                className="rounded-xl border border-[var(--border)] border-l-2 bg-[var(--card)] p-5"
                style={{ borderLeftColor: p.color }}
              >
                <div className="mb-2 text-2xl">{p.icon}</div>
                <h3 className="font-semibold text-[var(--accent)]">{t(`openSource.whyOpenSource.${p.key}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{t(`openSource.whyOpenSource.${p.key}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Donate with Bitcoin */}
      <section className="px-6 pb-10">
        <div className="mx-auto max-w-2xl text-center">
          <div className="rounded-2xl border border-[#f7931a]/20 bg-[#f7931a]/5 px-8 py-8">
            <div className="mb-3 text-3xl">&#9889;</div>
            <h2 className="mb-3 text-xl font-bold">{t('openSource.donate.heading')}</h2>
            <p className="mx-auto mb-5 max-w-lg text-sm leading-relaxed text-[var(--muted)]">
              {t('openSource.donate.description')}
            </p>
            <a
              href={`${SITE_CONFIG.appUrl}/donate`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#f7931a] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e8850f]"
            >
              <span>&#9889;</span>
              {t('openSource.donate.button')}
            </a>
            <p className="mt-3 text-xs text-[var(--muted)]">
              {t('openSource.donate.lightningNote')}
            </p>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="px-6 pb-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-center text-2xl font-bold">{t('openSource.quickStart.heading')}</h2>
          <p className="mb-4 text-center text-sm text-[var(--muted)]">
            {t('openSource.quickStart.subtitle')}
          </p>
          <div className="overflow-x-auto rounded-lg bg-[var(--card)] p-6">
            <pre className="text-sm leading-relaxed text-[var(--foreground)]">
              <code>{`git clone ${GITHUB_REPO}.git
cd core-backend
cp .env.example .env
docker compose up -d`}</code>
            </pre>
          </div>
          <p className="mt-3 text-center text-xs text-[var(--muted)]">
            {t('openSource.quickStart.dockerNote')}
          </p>
        </div>
      </section>

      {/* What You Get */}
      <section className="px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-center text-2xl font-bold">{t('openSource.whatYouGet.heading')}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {(Array.isArray(t('openSource.whatYouGet.features')) ? t('openSource.whatYouGet.features') as unknown as string[] : []).map((feature: string) => (
              <li
                key={feature}
                className="flex items-start gap-3 text-[var(--muted)]"
              >
                <span className="mt-1 block h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* OSS vs SaaS */}
      <section className="px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-center text-2xl font-bold">{t('openSource.ossVsSaas.heading')}</h2>
          <p className="mb-6 text-center text-sm text-[var(--muted)]">
            {t('openSource.ossVsSaas.subtitle')}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="py-3 pr-4 font-medium text-[var(--muted)]" />
                  <th className="py-3 pr-4 font-semibold">{t('openSource.ossVsSaas.columnOss')}</th>
                  <th className="py-3 font-semibold">{t('openSource.ossVsSaas.columnSaas')}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRowKeys.map((row, idx) => {
                  const oss = t(`openSource.ossVsSaas.rows.${row.key}.oss`);
                  return (
                    <tr
                      key={row.key}
                      className={`border-b border-[var(--border)] ${idx % 2 === 1 ? "bg-white/[0.02]" : ""}`}
                    >
                      <td className="py-3 pr-4 font-medium">
                        {t(`openSource.ossVsSaas.rows.${row.key}.label`)}
                        {'saasOnly' in row && row.saasOnly && (
                          <span className="ml-1.5 inline-block rounded bg-blue-900/40 px-1.5 py-0.5 text-[10px] font-medium text-blue-400 leading-tight align-middle">
                            {t('openSource.ossVsSaas.saasOnly')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-[var(--muted)]">
                        {oss === "-" ? <span className="opacity-40">&mdash;</span> : oss}
                      </td>
                      <td className="py-3 text-[var(--muted)]">{t(`openSource.ossVsSaas.rows.${row.key}.saas`)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-center text-2xl font-bold">{t('openSource.builtWith.heading')}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {techStackKeys.map((item) => (
              <div
                key={item.key}
                className="rounded-lg border border-[var(--border)] border-t-2 bg-[var(--card)] px-4 py-3 text-center"
                style={{ borderTopColor: item.color }}
              >
                <p className="font-semibold text-[var(--foreground)]">{t(`openSource.builtWith.${item.key}.name`)}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{t(`openSource.builtWith.${item.key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contribute CTA */}
      <section className="px-6 py-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold">{t('openSource.contribute.heading')}</h2>
          <p className="mt-3 text-[var(--muted)]">
            {t('openSource.contribute.description')}
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              {t('openSource.contribute.viewOnGitlab')}
            </a>
            <a
              href={`${GITHUB_REPO}/-/blob/main/CONTRIBUTING.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] px-6 py-3 font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--card)]"
            >
              {t('openSource.contribute.contributingGuide')}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
