"use client";

import { useI18n } from "@/lib/i18n";

export default function AboutPage() {
  const { t } = useI18n();

  const values = [
    {
      title: t("about.values.sovereignty.title"),
      description: t("about.values.sovereignty.description"),
      color: "#f59e0b",
    },
    {
      title: t("about.values.verification.title"),
      description: t("about.values.verification.description"),
      color: "#10b981",
    },
    {
      title: t("about.values.simplicity.title"),
      description: t("about.values.simplicity.description"),
      color: "#3b82f6",
    },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="px-6 py-14 text-center">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t("about.hero.title")}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg font-medium text-[var(--zone-cognitive)]">
            Privacy-first health intelligence, built in Austria.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="px-6 pb-8">
        <div className="mx-auto max-w-3xl space-y-5 text-lg leading-relaxed text-[var(--muted)]">
          <p>{t("about.story.paragraph1")}</p>
          <p>{t("about.story.paragraph2")}</p>
          <p>{t("about.story.paragraph3")}</p>
          <p>{t("about.story.paragraph4")}</p>
          <p>
            {t("about.story.paragraph5")}{" "}
            <a
              href="https://amzn.to/4blwLl1"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] underline transition-colors hover:text-[var(--accent-hover)]"
            >
              https://amzn.to/4blwLl1
            </a>
          </p>
          <p>{t("about.story.paragraph6")}</p>
          <p>{t("about.story.paragraph7")}</p>
          <p>{t("about.story.paragraph8")}</p>
        </div>
      </section>

      {/* Value Tiles */}
      <section className="px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 sm:grid-cols-3">
            {values.map((value) => (
              <div
                key={value.title}
                className="rounded-xl border bg-[var(--card)] p-6"
                style={{ borderColor: value.color + "40" }}
              >
                <h3 className="text-lg font-semibold" style={{ color: value.color }}>
                  {value.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Book CTA */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">{t("about.book.heading")}</h2>
          <p className="mt-3 text-[var(--muted)]">
            {t("about.book.description")}
          </p>
          <div className="mt-6">
            <a
              href="https://amzn.to/4blwLl1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              {t("about.book.cta")}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
