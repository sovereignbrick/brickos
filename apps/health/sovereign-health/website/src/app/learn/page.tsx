"use client";

import { useI18n } from "@/lib/i18n";

function VideoEmbed({ url, comingSoonText, unsupportedText }: { url: string; comingSoonText: string; unsupportedText: string }) {
  if (!url) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg bg-zinc-800">
        <span className="text-sm text-[var(--muted)]">{comingSoonText}</span>
      </div>
    );
  }

  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/
  );
  if (ytMatch) {
    return (
      <div className="aspect-video rounded-lg overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          className="h-full w-full"
          allowFullScreen
          title="YouTube video"
        />
      </div>
    );
  }

  // Rumble
  const rumbleMatch = url.match(/rumble\.com\/(?:embed\/)?([a-zA-Z0-9]+)/);
  if (rumbleMatch) {
    return (
      <div className="aspect-video rounded-lg overflow-hidden">
        <iframe
          src={`https://rumble.com/embed/${rumbleMatch[1]}/`}
          className="h-full w-full"
          allowFullScreen
          title="Rumble video"
        />
      </div>
    );
  }

  return (
    <div className="flex aspect-video items-center justify-center rounded-lg bg-zinc-800">
      <span className="text-sm text-[var(--muted)]">{unsupportedText}</span>
    </div>
  );
}

export default function LearnPage() {
  const { t } = useI18n();

  const tutorials = [
    {
      title: t("learn.tutorials.gettingStarted.title"),
      description: t("learn.tutorials.gettingStarted.description"),
      videoUrl: "",
    },
    {
      title: t("learn.tutorials.healthZonesExplained.title"),
      description: t("learn.tutorials.healthZonesExplained.description"),
      videoUrl: "",
    },
    {
      title: t("learn.tutorials.usingDrAlex.title"),
      description: t("learn.tutorials.usingDrAlex.description"),
      videoUrl: "",
    },
    {
      title: t("learn.tutorials.selfHostedSetup.title"),
      description: t("learn.tutorials.selfHostedSetup.description"),
      videoUrl: "",
    },
    {
      title: t("learn.tutorials.customizingThresholds.title"),
      description: t("learn.tutorials.customizingThresholds.description"),
      videoUrl: "",
    },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="px-6 py-14 text-center">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t("learn.hero.title")}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg font-medium text-[var(--zone-energy)]">
            Master your markers. Understand your body.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-[var(--muted)]">
            {t("learn.hero.subtitle")}
          </p>
        </div>
      </section>

      {/* Tutorial Cards */}
      <section className="px-6 pb-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tutorials.map((tutorial) => (
              <div
                key={tutorial.title}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6"
              >
                <VideoEmbed
                  url={tutorial.videoUrl}
                  comingSoonText={t("learn.videoComingSoon")}
                  unsupportedText={t("learn.unsupportedProvider")}
                />
                <h3 className="mt-4 text-lg font-semibold">{tutorial.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  {tutorial.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Note */}
      <section className="px-6 pb-10">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm text-[var(--muted)]">
            {t("learn.note")}
          </p>
        </div>
      </section>
    </div>
  );
}
