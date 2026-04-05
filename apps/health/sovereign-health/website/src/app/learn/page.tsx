"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { SITE_CONFIG } from "@/lib/config";
import { ScreenshotLightbox } from "@/components/screenshot-lightbox";

interface Tutorial {
  key: string;
  icon: string;
  screenshots: { base: string; key: string }[];
  videoUrl?: string;
  videoPoster?: string;
}

const TUTORIALS: Tutorial[] = [
  {
    key: "dashboardOverview",
    icon: "📊",
    screenshots: [
      { base: "/screenshots/dashboard_zones", key: "dashboardZones" },
      { base: "/screenshots/dashboard_zone_energy", key: "dashboardZoneEnergy" },
      { base: "/screenshots/dashboard_zone_scroll", key: "dashboardZoneScroll" },
    ],
  },
  {
    key: "markersHealthZones",
    icon: "🔬",
    screenshots: [
      { base: "/screenshots/marker_glucose", key: "markerGlucose" },
      { base: "/screenshots/marker_glucose_scroll1", key: "markerGlucoseScroll1" },
      { base: "/screenshots/marker_glucose_scroll2", key: "markerGlucoseScroll2" },
    ],
  },
  {
    key: "drAlexSearch",
    icon: "💬",
    screenshots: [
      { base: "/screenshots/dr_alex_main", key: "drAlexMain" },
      { base: "/screenshots/dr_alex_chat", key: "drAlexChat" },
      { base: "/screenshots/search_results", key: "searchResults" },
    ],
  },
  {
    key: "measurementsTrends",
    icon: "📈",
    screenshots: [
      { base: "/screenshots/measurements_history", key: "measurementsHistory" },
      { base: "/screenshots/trends_chart", key: "trendsChart" },
      { base: "/screenshots/measurements_new", key: "measurementsNew" },
    ],
  },
  {
    key: "userSettings",
    icon: "⚙️",
    screenshots: [
      { base: "/screenshots/settings_profile", key: "settingsProfile" },
      { base: "/screenshots/settings_devices", key: "settingsDevices" },
      { base: "/screenshots/settings_lifestyle", key: "settingsLifestyle" },
    ],
  },
];

function screenshotSrc(base: string, locale: string): string {
  const suffix = locale === "de" ? "_DE" : "_EN";
  return `${base}${suffix}.png`;
}

export default function LearnPage() {
  const { t, locale } = useI18n();
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <div>
      {/* Hero */}
      <section className="px-6 py-14 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t("learn.hero.title")}
          </h1>
          <p className="mt-4 text-lg text-[var(--muted)]">
            {t("learn.hero.subtitle")}
          </p>
        </div>
      </section>

      {/* Tutorials */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="space-y-12">
          {TUTORIALS.map((tutorial) => {
            const title = t(`learn.tutorials.${tutorial.key}.title` as any);
            const description = t(`learn.tutorials.${tutorial.key}.description` as any);

            return (
              <div
                key={tutorial.key}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{tutorial.icon}</span>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <p className="mt-2 text-[var(--muted)] leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>

                {/* Video placeholder */}
                {tutorial.videoUrl ? (
                  <div className="mt-6">
                    <div
                      className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-black"
                      style={{ aspectRatio: "16/9" }}
                    >
                      <iframe
                        src={tutorial.videoUrl}
                        title={title}
                        className="absolute inset-0 h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-6">
                    <div
                      className="flex items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg)]/50"
                      style={{ aspectRatio: "16/9", maxHeight: "200px" }}
                    >
                      <p className="text-sm text-[var(--muted)]">
                        {t("learn.videoComingSoon")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Screenshots */}
                {tutorial.screenshots.length > 0 && (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {tutorial.screenshots.map((shot) => {
                      const src = screenshotSrc(shot.base, locale);
                      const caption = t(`learn.screenshots.${shot.key}` as any) || shot.key;
                      return (
                        <button
                          key={shot.key}
                          onClick={() => setLightbox(src)}
                          className="group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] transition-transform hover:scale-[1.02] text-left"
                        >
                          <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt={caption}
                              width={640}
                              height={400}
                              className="aspect-[8/5] w-full object-cover"
                              onError={(e) => {
                                const img = e.currentTarget;
                                const enFallback = img.src.replace(/_[A-Z]{2}\.png/, "_EN.png");
                                if (img.src !== enFallback) img.src = enFallback;
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                              <svg className="h-10 w-10 text-white opacity-0 transition-opacity group-hover:opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                              </svg>
                            </div>
                          </div>
                          <p className="px-4 py-3 text-sm text-[var(--muted)]">{caption}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Note */}
        <div className="mt-12 rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
          <p className="text-sm text-[var(--muted)]">{t("learn.note")}</p>
          <a
            href={SITE_CONFIG.appUrl}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {t("home.demo.openTheApp")}
          </a>
        </div>
      </section>

      {lightbox && (
        <ScreenshotLightbox
          src={lightbox}
          alt=""
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
