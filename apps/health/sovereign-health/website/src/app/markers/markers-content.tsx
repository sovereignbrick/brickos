"use client";

import { useState, useMemo, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { SITE_CONFIG } from "@/lib/config";
import { useLocalizedMarkers, type LocalizedMarker } from "@/lib/use-localized-content";

const zones = [
  { slug: "energy_metabolic", i18nKey: "energyMetabolic", icon: "\u26a1", color: "#f59e0b" },
  { slug: "structural", i18nKey: "structural", icon: "\ud83d\udcaa", color: "#3b82f6" },
  { slug: "cardiovascular", i18nKey: "cardiovascular", icon: "\ud83e\udec0", color: "#ef4444" },
  { slug: "cognitive", i18nKey: "cognitive", icon: "\ud83e\udde0", color: "#8b5cf6" },
  { slug: "immune", i18nKey: "immune", icon: "\ud83d\udee1\ufe0f", color: "#10b981" },
  { slug: "nutritional", i18nKey: "nutritional", icon: "\ud83c\udf31", color: "#22c55e" },
  { slug: "hormonal", i18nKey: "hormonal", icon: "\ud83c\udfaf", color: "#ec4899" },
  { slug: "detoxification", i18nKey: "detoxification", icon: "\ud83d\udd04", color: "#06b6d4" },
];

const zoneMap = Object.fromEntries(zones.map((z) => [z.slug, z]));

function MarkerTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const gap = 8;

    // Default: position to the RIGHT of the trigger
    let top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
    let left = triggerRect.right + gap;

    // If overflows RIGHT edge, flip to LEFT
    if (left + tooltipRect.width > window.innerWidth - 8) {
      left = triggerRect.left - tooltipRect.width - gap;
    }

    // If overflows LEFT edge after flip, clamp to left edge
    if (left < 8) {
      left = 8;
    }

    // If overflows TOP, push down
    if (top < 8) {
      top = 8;
    }

    // If overflows BOTTOM, push up
    if (top + tooltipRect.height > window.innerHeight - 8) {
      top = window.innerHeight - tooltipRect.height - 8;
    }

    setPosition({ top, left });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setVisible(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    if (visible) {
      // Reposition after render so tooltipRect is measured correctly
      requestAnimationFrame(reposition);
    }
  }, [visible, reposition]);

  return (
    <span
      ref={triggerRef}
      className="relative ml-1.5 inline-flex cursor-help"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={`text-[var(--muted)] transition-opacity ${visible ? "opacity-100" : "opacity-50"}`}>
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <text x="8" y="12" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="600">i</text>
      </svg>
      {visible && (
        <span
          ref={tooltipRef}
          className="fixed z-50 rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl text-xs text-[var(--foreground)] leading-relaxed"
          style={{
            top: position.top,
            left: position.left,
            minWidth: 220,
            maxWidth: 350,
            whiteSpace: "normal",
            overflowWrap: "break-word",
            padding: "10px 14px",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

export function MarkersPageClient() {
  return (
    <Suspense>
      <MarkersContent />
    </Suspense>
  );
}

function MarkersContent() {
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const router = useRouter();
  const markersData = useLocalizedMarkers();
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");

  useEffect(() => {
    const zoneParam = searchParams.get("zone");
    if (zoneParam && zones.some((z) => z.slug === zoneParam)) {
      setZoneFilter(zoneParam);
    }
  }, [searchParams]);

  const filtered = useMemo(() => {
    let result: LocalizedMarker[] = markersData;
    if (zoneFilter) {
      result = result.filter((m) => m.zone_slug === zoneFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          m.zone_slug?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [search, zoneFilter]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          {t("markerDirectory.title")}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lg font-medium text-[var(--zone-energy)]">
          {t("markerDirectory.tagline")}
        </p>
        <p className="text-lg text-muted max-w-2xl mx-auto">
          {t("markerDirectory.description", { count: String(markersData.length) })}
        </p>
      </div>

      {/* Health Zone overview */}
      <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {zones.map((z) => {
          const count = markersData.filter((m) => m.zone_slug === z.slug).length;
          const isActive = zoneFilter === z.slug;
          return (
            <button
              key={z.slug}
              onClick={() => setZoneFilter(isActive ? "" : z.slug)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "border-blue-500 bg-blue-600/10 text-blue-400"
                  : "border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--muted)]"
              }`}
            >
              <span className="text-lg">{z.icon}</span>
              <span className="font-medium truncate">{t(`healthZones.zones.${z.i18nKey}.name`)}</span>
              <span className="ml-auto text-xs opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder={t("markerDirectory.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-blue-600"
        />
        <select
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-600 sm:hidden"
        >
          <option value="">{t("markerDirectory.allHealthZones")}</option>
          {zones.map((z) => (
            <option key={z.slug} value={z.slug}>
              {z.icon} {t(`healthZones.zones.${z.i18nKey}.name`)}
            </option>
          ))}
        </select>
      </div>

      {/* Clickable hint */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-800/40 bg-blue-950/20 px-4 py-3">
        <svg
          className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-sm text-blue-200/80 leading-relaxed">
          {(() => {
            const appUrl = SITE_CONFIG.appUrl;
            const appLabel = t("markerDirectory.theApp");
            const rawText = t("markerDirectory.clickHint", { appLink: "___APP_LINK___" });
            const parts = rawText.split("___APP_LINK___");
            return (
              <>
                {parts[0]}
                <a
                  href={appUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-300 underline underline-offset-2 hover:text-blue-200 transition-colors"
                >
                  {appLabel}
                </a>
                {parts[1]}
              </>
            );
          })()}
        </p>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted mb-4">
        {filtered.length} {filtered.length !== 1 ? t("markerDirectory.markerPlural") : t("markerDirectory.markerSingular")}
        {zoneFilter || search ? ` ${t("markerDirectory.found")}` : ""}
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--card)]">
              <th className="text-left px-4 py-3 font-medium text-muted">
                {t("markerDirectory.tableMarker")}
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted hidden sm:table-cell">
                {t("markerDirectory.tableHealthZone")}
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted hidden md:table-cell">
                {t("markerDirectory.tableUnit")}
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted hidden lg:table-cell">
                {t("markerDirectory.tableType")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((marker, idx) => {
              const zone = zoneMap[marker.zone_slug];
              const desc = marker.description?.split("\n")[0];
              return (
                <tr
                  key={marker.slug}
                  onClick={() => router.push(`/markers/${marker.slug}/`)}
                  className={`border-b border-[var(--border)] cursor-pointer hover:bg-white/[0.06] transition-colors duration-150 ${
                    idx % 2 === 1 ? "bg-white/[0.02]" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <Link
                        href={`/markers/${marker.slug}/`}
                        className="font-medium text-foreground hover:text-blue-400 transition-colors"
                      >
                        {marker.display_name || marker.name}
                      </Link>
                      {desc && <MarkerTooltip text={desc} />}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="flex items-center gap-1.5 text-sm">
                      {zone && <span className="text-base">{zone.icon}</span>}
                      <span className="text-muted">{zone ? t(`healthZones.zones.${zone.i18nKey}.name`) : marker.zone_slug}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted hidden md:table-cell">
                    {marker.unit}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        marker.is_calculated
                          ? "bg-purple-500/20 text-purple-300"
                          : marker.source_type === "home"
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {marker.is_calculated
                        ? t("markerDirectory.typeCalculated")
                        : marker.source_type === "home"
                          ? t("markerDirectory.typeHomeDevice")
                          : t("markerDirectory.typeLab")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted">
          {t("markerDirectory.noResults")}
        </div>
      )}
    </div>
  );
}
