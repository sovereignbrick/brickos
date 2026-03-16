"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { SITE_CONFIG } from "@/lib/config";
import { useLocalizedMarkers } from "@/lib/use-localized-content";
import referenceRanges from "../../../../data/reference-ranges.json";
import fastingRanges from "../../../../data/fasting-ranges.json";
import foodsData from "../../../../data/foods.json";
import supplementsData from "../../../../data/supplements.json";
import relationsData from "../../../../data/marker-relations.json";

const ZONE_INFO: Record<string, { icon: string; i18nKey: string }> = {
  energy_metabolic: { icon: "\u26a1", i18nKey: "energyMetabolic" },
  structural: { icon: "\uD83D\uDCAA", i18nKey: "structural" },
  cardiovascular: { icon: "\uD83E\uDEC0", i18nKey: "cardiovascular" },
  cognitive: { icon: "\uD83E\uDDE0", i18nKey: "cognitive" },
  immune: { icon: "\uD83D\uDEE1\uFE0F", i18nKey: "immune" },
  nutritional: { icon: "\uD83C\uDF31", i18nKey: "nutritional" },
  hormonal: { icon: "\uD83C\uDFAF", i18nKey: "hormonal" },
  detoxification: { icon: "\uD83D\uDD04", i18nKey: "detoxification" },
};

const FOOD_CATEGORY_EMOJI: Record<string, string> = {
  vegetable: "\uD83E\uDD66",
  fruit: "\uD83C\uDF53",
  fish: "\uD83D\uDC1F",
  seafood: "\uD83E\uDD90",
  meat: "\uD83E\uDD69",
  poultry: "\uD83C\uDF57",
  organ_meat: "\uD83E\uDEB4",
  egg: "\uD83E\uDD5A",
  dairy: "\uD83E\uDDC0",
  legume: "\uD83E\uDED8",
  grain: "\uD83C\uDF3E",
  nut_seed: "\uD83E\uDD5C",
  herb_spice: "\uD83C\uDF3F",
  oil_fat: "\uD83E\uDED2",
  fermented: "\uD83E\uDD62",
  beverage: "\uD83C\uDF75",
  other: "\uD83C\uDF7D\uFE0F",
};

const SUPPLEMENT_EMOJI = "\uD83D\uDC8A";

const COLLAPSE_THRESHOLD = 6;

function RangeBar({
  range,
  label,
  lowLabel,
  optimalLabel,
  highLabel,
}: {
  range: (typeof referenceRanges)[number];
  label: string;
  lowLabel: string;
  optimalLabel: string;
  highLabel: string;
}) {
  return (
    <div className="mb-4">
      <p className="text-sm font-medium mb-2">{label}</p>
      <div className="flex h-8 rounded-lg overflow-hidden text-xs font-medium">
        {range.red_low_max != null && (
          <div className="bg-red-500/30 text-red-300 flex items-center justify-center px-2 min-w-[40px]">
            &lt;{range.red_low_max}
          </div>
        )}
        {range.yellow_low_min != null && range.yellow_low_max != null && (
          <div className="bg-yellow-500/30 text-yellow-300 flex items-center justify-center px-2 min-w-[40px]">
            {range.yellow_low_min}-{range.yellow_low_max}
          </div>
        )}
        <div className="bg-emerald-500/30 text-emerald-300 flex items-center justify-center px-2 flex-1">
          {range.green_min}-{range.green_max} {range.unit}
        </div>
        {range.yellow_high_min != null && range.yellow_high_max != null && (
          <div className="bg-yellow-500/30 text-yellow-300 flex items-center justify-center px-2 min-w-[40px]">
            {range.yellow_high_min}-{range.yellow_high_max}
          </div>
        )}
        {range.red_high_min != null && (
          <div className="bg-red-500/30 text-red-300 flex items-center justify-center px-2 min-w-[40px]">
            &gt;{range.red_high_min}
          </div>
        )}
      </div>
      <div className="flex justify-between mt-1 text-xs text-muted">
        <span>{lowLabel}</span>
        <span>{optimalLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

function PersonalizedCallout({ t }: { t: (key: string, vars?: Record<string, string | number>) => string }) {
  const appUrl = SITE_CONFIG.appUrl;
  const appName = t("markers.detail.sovereignHealthApp");
  const rawText = t("markers.detail.personalizedCallout", { appLink: "___APP_LINK___" });
  const parts = rawText.split("___APP_LINK___");

  return (
    <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-800/40 bg-amber-950/20 px-4 py-3">
      <svg
        className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M10 2a1 1 0 01.894.553l1.618 3.28 3.62.526a1 1 0 01.554 1.706l-2.62 2.553.618 3.604a1 1 0 01-1.45 1.054L10 13.347l-3.234 1.7a1 1 0 01-1.45-1.054l.618-3.604-2.62-2.553a1 1 0 01.554-1.706l3.62-.527 1.618-3.279A1 1 0 0110 2z" />
      </svg>
      <p className="text-xs text-amber-200/80 leading-relaxed">
        {parts[0]}
        <a
          href={appUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-amber-300 underline underline-offset-2 hover:text-amber-200 transition-colors"
        >
          {appName}
        </a>
        {parts[1]}
      </p>
    </div>
  );
}

function ExpandButton({
  totalCount,
  expanded,
  onToggle,
  t,
}: {
  totalCount: number;
  expanded: boolean;
  onToggle: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  if (totalCount <= COLLAPSE_THRESHOLD) return null;
  return (
    <button
      onClick={onToggle}
      className="mt-3 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
    >
      {expanded
        ? t("markers.detail.showLess")
        : t("markers.detail.showAll", { count: String(totalCount) })}
    </button>
  );
}

export default function MarkerPage() {
  const { t } = useI18n();
  const params = useParams();
  const slug = params.slug as string;
  const localizedMarkers = useLocalizedMarkers();
  const marker = localizedMarkers.find((m) => m.slug === slug);

  const [foodsExpanded, setFoodsExpanded] = useState(false);
  const [suppsExpanded, setSuppsExpanded] = useState(false);

  if (!marker) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">{t("markers.detail.notFoundTitle")}</h1>
        <Link href="/markers/" className="text-blue-400 hover:underline">
          {t("markers.detail.backToDirectory")}
        </Link>
      </div>
    );
  }

  const stdRange = referenceRanges.find(
    (r) => r.marker_slug === marker.slug && r.protocol === "standard"
  );
  const fastRange = fastingRanges.find(
    (r) => r.marker_slug === marker.slug
  );
  const foods = (foodsData as Record<string, Array<{ food_name: string; food_category: string; display_order: number }>>)[marker.slug] || [];
  const supplements = (supplementsData as Record<string, Array<{ supplement_name: string; typical_dose: string; notes: string; display_order: number }>>)[marker.slug] || [];
  type Relation = { related_marker_slug: string; related_marker_name: string; relationship_type: string; description: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const relRaw = (relationsData as any)[marker.slug] || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const relations: Relation[] = relRaw.map((r: any) => ({
    related_marker_slug: r.related_marker_slug || r.related_marker || "",
    related_marker_name: r.related_marker_name || r.related_marker || "",
    relationship_type: r.relationship_type || r.direction || "",
    description: r.description || r.clinical_significance || "",
  }));

  const markerName = marker.display_name || marker.name;

  const visibleFoods = foodsExpanded ? foods : foods.slice(0, COLLAPSE_THRESHOLD);
  const visibleSupps = suppsExpanded ? supplements : supplements.slice(0, COLLAPSE_THRESHOLD);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted mb-8">
        <Link href="/markers/" className="hover:text-foreground transition-colors">
          {t("markers.detail.breadcrumbMarkers")}
        </Link>
        <span>/</span>
        <span className="text-foreground">
          {markerName}
        </span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">
            {markerName}
          </h1>
          <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-muted">
            {marker.unit}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          {marker.zone_slug && ZONE_INFO[marker.zone_slug] && (
            <span>
              {ZONE_INFO[marker.zone_slug].icon} {t(`healthZones.zones.${ZONE_INFO[marker.zone_slug].i18nKey}.name`)}
            </span>
          )}
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5">
            {marker.is_calculated
              ? t("markers.types.calculated")
              : marker.source_type === "home"
                ? t("markers.types.homeDevice")
                : t("markers.types.lab")}
          </span>
        </div>
      </div>

      {/* Description */}
      {marker.description && (
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-3">{t("markers.detail.aboutThisMarker")}</h2>
          <div className="text-muted leading-relaxed space-y-3">
            {marker.description.split("\n").filter(Boolean).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      )}

      {/* Reference Ranges */}
      {stdRange && (
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4">{t("markers.detail.referenceRanges")}</h2>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
            <RangeBar
              range={stdRange}
              label={t("markers.detail.standardRange")}
              lowLabel={t("markers.detail.rangeLow")}
              optimalLabel={t("markers.detail.rangeOptimal")}
              highLabel={t("markers.detail.rangeHigh")}
            />
            {fastRange && (
              <RangeBar
                range={fastRange}
                label={t("markers.detail.fastingRange")}
                lowLabel={t("markers.detail.rangeLow")}
                optimalLabel={t("markers.detail.rangeOptimal")}
                highLabel={t("markers.detail.rangeHigh")}
              />
            )}
          </div>
        </div>
      )}

      {/* Foods — Green theme */}
      {foods.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="w-1 h-6 rounded-full bg-green-500" />
            <span className="text-green-300">
              {t("markers.detail.topFoods", { name: markerName })}
            </span>
          </h2>
          <div className="rounded-xl border border-green-800/50 bg-green-950/30 p-5">
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleFoods.map((food, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 rounded-lg border border-green-800/30 bg-green-950/40 px-3 py-2.5"
                >
                  <span className="text-lg flex-shrink-0">
                    {FOOD_CATEGORY_EMOJI[food.food_category] || FOOD_CATEGORY_EMOJI.other}
                  </span>
                  <span className="font-medium text-sm text-green-100 truncate">
                    {food.food_name}
                  </span>
                </div>
              ))}
            </div>
            <ExpandButton
              totalCount={foods.length}
              expanded={foodsExpanded}
              onToggle={() => setFoodsExpanded(!foodsExpanded)}
              t={t}
            />
            <PersonalizedCallout t={t} />
          </div>
        </div>
      )}

      {/* Supplements — Purple theme */}
      {supplements.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="w-1 h-6 rounded-full bg-purple-500" />
            <span className="text-purple-300">
              {t("markers.detail.supplements", { name: markerName })}
            </span>
          </h2>
          <div className="rounded-xl border border-purple-800/50 bg-purple-950/30 p-5">
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleSupps.map((supp, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 rounded-lg border border-purple-800/30 bg-purple-950/40 px-3 py-2.5"
                >
                  <span className="text-lg flex-shrink-0">{SUPPLEMENT_EMOJI}</span>
                  <span className="font-medium text-sm text-purple-100 truncate">
                    {supp.supplement_name}
                  </span>
                </div>
              ))}
            </div>
            <ExpandButton
              totalCount={supplements.length}
              expanded={suppsExpanded}
              onToggle={() => setSuppsExpanded(!suppsExpanded)}
              t={t}
            />
            <PersonalizedCallout t={t} />
          </div>
        </div>
      )}

      {/* Related Markers — Blue theme */}
      {relations.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="w-1 h-6 rounded-full bg-blue-500" />
            <span className="text-blue-300">
              {t("markers.detail.relatedMarkers")}
            </span>
          </h2>
          <div className="rounded-xl border border-blue-800/50 bg-blue-950/30 p-5">
            <div className="flex flex-wrap gap-2">
              {relations.map((rel, i) => (
                <Link
                  key={i}
                  href={`/markers/${rel.related_marker_slug}/`}
                  className="rounded-lg border border-blue-800/30 bg-blue-950/40 px-4 py-2 text-sm hover:bg-blue-900/40 transition-colors"
                >
                  <span className="font-medium text-blue-100">{rel.related_marker_name}</span>
                  <span className="text-xs text-blue-300/60 ml-2 capitalize">
                    {rel.relationship_type === 'correlated' ? t('markers.detail.relationCorrelated')
                      : rel.relationship_type === 'inverse' ? t('markers.detail.relationInverse')
                      : rel.relationship_type === 'contextual' ? t('markers.detail.relationContextual')
                      : rel.relationship_type?.replace(/_/g, " ")}
                  </span>
                </Link>
              ))}
            </div>
            <PersonalizedCallout t={t} />
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <h2 className="text-xl font-bold mb-2">
          {t("markers.detail.ctaTitle", { name: markerName })}
        </h2>
        <p className="text-muted mb-6 text-sm">
          {t("markers.detail.ctaDescription")}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href={SITE_CONFIG.appUrl}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            {t("markers.detail.tryTheApp")}
          </a>
          <Link
            href="/open-source/"
            className="rounded-lg border border-[var(--border)] px-6 py-3 text-sm font-medium text-foreground hover:bg-white/5 transition-colors"
          >
            {t("markers.detail.selfHostForFree")}
          </Link>
        </div>
      </div>
    </div>
  );
}
