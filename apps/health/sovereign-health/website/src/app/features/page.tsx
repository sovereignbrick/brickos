"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { SITE_CONFIG } from "@/lib/config";

// ── API types ────────────────────────────────────────────────────────────────

interface ApiTierInfo {
  included: boolean;
  limit_value: number | null;
  limit_label: string | null;
}

interface ApiFeature {
  feature_key: string;
  name: string;
  description: string | null;
  tooltip: string | null;
  category: string;
  status: string;
  icon: string | null;
  tiers: Record<string, ApiTierInfo>;
}

interface ApiFeaturesResponse {
  data: {
    features: ApiFeature[];
    categories: string[];
  };
}

// ── Tier display names ───────────────────────────────────────────────────────

const SAAS_TIERS = ["glimpse", "focus", "insight", "clarity", "horizon"] as const;

const tierDisplayNames: Record<string, string> = {
  glimpse: "Glimpse",
  focus: "Focus",
  insight: "Insight",
  clarity: "Clarity",
  horizon: "Horizon",
};

// ── Map page feature keys to backend feature_keys ────────────────────────────

const featureKeyMap: Record<string, string> = {
  // Track Your Health
  "measurementTemplates": "measurement_templates",
  "calculatedHealthScores": "calculated_markers",
  "bodyComposition": "body_composition",
  "labResultImport": "lab_import",
  "medicationImport": "med_import",
  // See Your Progress
  "trendCharts": "history",
  "compareProtocols": "protocol_comparison",
  "aiDashboardInsights": "ai_dashboard_insights",
  "communityComparison": "cohort_comparison",
  // Dr. Alex AI
  "generalHealthQA": "chat_general",
  "trendAnalysis": "chat_trends",
  "labResultExplanation": "chat_labs",
  "personalizedNutrition": "chat_diet",
  "supplementReview": "chat_supplements",
  "protocolComparison": "chat_protocols",
  // Medications & Supplements
  "trackWhatYouTake": "medications",
  "impactOnYourMarkers": "supplement_marker_impact",
  // Your Data, Your Control
  "fullDataExport": "csv_export",
  "pdfHealthReport": "pdf_reports",
  // Security
  "twoFactorAuth": "mfa_totp",
};

// ── Badge generation ─────────────────────────────────────────────────────────

type TierBadge =
  | { type: "all" }
  | { type: "tier"; label: string }
  | { type: "coming-soon" };

function isGenericLabel(label: string | null | undefined): boolean {
  if (!label) return true;
  const l = label.trim().toLowerCase();
  return l === "" || l === "yes" || l === "ja" || l === "unlimited" || l === "unbegrenzt"
    || l === "all" || l === "alle";
}

function buildBadgeFromApi(
  featurePageKey: string,
  apiFeatures: Map<string, ApiFeature>,
  _allPlansLabel: string,
): TierBadge | null {
  const backendKey = featureKeyMap[featurePageKey];
  if (!backendKey) return null;

  const feature = apiFeatures.get(backendKey);
  if (!feature) return null;

  // Collect included SaaS tiers with their labels
  const included: { key: string; label: string | null }[] = [];

  for (const tierKey of SAAS_TIERS) {
    const tier = feature.tiers[tierKey];
    if (tier && tier.included) {
      included.push({ key: tierKey, label: tier.limit_label });
    }
  }

  // No SaaS tiers included — core-only, show as "All Plans" (it's open source)
  if (included.length === 0) {
    return { type: "all" };
  }

  // All SaaS tiers included with generic/unlimited labels → "All Plans"
  if (included.length === SAAS_TIERS.length && included.every((t) => isGenericLabel(t.label))) {
    return { type: "all" };
  }

  // Build per-tier label string using "TierName: limit" format
  // Group consecutive included tiers with the same label using "TierName+: limit"
  const parts: string[] = [];
  let i = 0;
  while (i < SAAS_TIERS.length) {
    const tierKey = SAAS_TIERS[i];
    const tier = feature.tiers[tierKey];

    if (!tier || !tier.included) {
      i++;
      continue;
    }

    const label = tier.limit_label;
    const displayName = tierDisplayNames[tierKey];

    // Check if all remaining SaaS tiers (from this one onward) are included
    // and share the same label — if so, collapse them with "+"
    const remaining = SAAS_TIERS.slice(i);
    const allRemainingIncluded = remaining.every((tk) => {
      const t = feature.tiers[tk];
      return t && t.included;
    });
    const allRemainingSameLabel = remaining.every((tk) => {
      const t = feature.tiers[tk];
      return t && t.included && normLabel(t.limit_label) === normLabel(label);
    });

    if (allRemainingIncluded && allRemainingSameLabel && remaining.length > 1) {
      if (isGenericLabel(label)) {
        parts.push(`${displayName}+`);
      } else {
        parts.push(`${displayName}+: ${label}`);
      }
      break;
    }

    // Individual tier entry
    if (isGenericLabel(label)) {
      parts.push(displayName);
    } else {
      parts.push(`${displayName}: ${label}`);
    }

    i++;
  }

  if (parts.length === 0) {
    return { type: "all" };
  }

  return { type: "tier", label: parts.join(", ") };
}

function normLabel(label: string | null | undefined): string {
  if (!label) return "";
  return label.trim().toLowerCase();
}

// ── Badge component ──────────────────────────────────────────────────────────

function Badge({ badge, t }: { badge: TierBadge; t: (key: string) => string }) {
  if (badge.type === "all") {
    return (
      <span className="inline-block rounded-full bg-emerald-900/50 px-3 py-1 text-xs font-medium text-emerald-400">
        {t("features.badges.allPlans")}
      </span>
    );
  }
  if (badge.type === "coming-soon") {
    return (
      <span className="inline-block rounded-full bg-amber-900/50 px-3 py-1 text-xs font-medium text-amber-400">
        {t("features.badges.comingSoon")}
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-blue-900/50 px-3 py-1 text-xs font-medium text-blue-400">
      {badge.label}
    </span>
  );
}

// ── Feature definition ───────────────────────────────────────────────────────

interface Feature {
  pageKey: string;
  nameKey: string;
  descKey: string;
  defaultBadge: TierBadge;
}

interface FeatureCategory {
  headingKey: string;
  color: string;
  features: Feature[];
}

// ── Page component ───────────────────────────────────────────────────────────

export default function FeaturesPage() {
  const { t, locale } = useI18n();
  const [apiFeatures, setApiFeatures] = useState<Map<string, ApiFeature>>(new Map());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const lang = locale === "de" ? "de" : "en";
    fetch(`${SITE_CONFIG.apiUrl}/api/features?lang=${lang}`)
      .then((res) => res.json())
      .then((data: ApiFeaturesResponse) => {
        if (data?.data?.features) {
          const map = new Map<string, ApiFeature>();
          for (const f of data.data.features) {
            map.set(f.feature_key, f);
          }
          setApiFeatures(map);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [locale]);

  const allPlansLabel = t("features.badges.allPlans");

  const categories: FeatureCategory[] = [
    {
      headingKey: "features.categories.trackYourHealth.heading",
      color: "#f59e0b",
      features: [
        { pageKey: "recordDailyMeasurements", nameKey: "features.categories.trackYourHealth.recordDailyMeasurements.name", descKey: "features.categories.trackYourHealth.recordDailyMeasurements.description", defaultBadge: { type: "all" } },
        { pageKey: "supportedDevices", nameKey: "features.categories.trackYourHealth.supportedDevices.name", descKey: "features.categories.trackYourHealth.supportedDevices.description", defaultBadge: { type: "all" } },
        { pageKey: "measurementTemplates", nameKey: "features.categories.trackYourHealth.measurementTemplates.name", descKey: "features.categories.trackYourHealth.measurementTemplates.description", defaultBadge: { type: "tier", label: "Glimpse: 1, Focus: 3, Insight+: Unlimited" } },
        { pageKey: "calculatedHealthScores", nameKey: "features.categories.trackYourHealth.calculatedHealthScores.name", descKey: "features.categories.trackYourHealth.calculatedHealthScores.description", defaultBadge: { type: "tier", label: "Glimpse: 3, Focus+: All 22+" } },
        { pageKey: "bodyComposition", nameKey: "features.categories.trackYourHealth.bodyComposition.name", descKey: "features.categories.trackYourHealth.bodyComposition.description", defaultBadge: { type: "tier", label: "Focus+" } },
        { pageKey: "editAndCorrect", nameKey: "features.categories.trackYourHealth.editAndCorrect.name", descKey: "features.categories.trackYourHealth.editAndCorrect.description", defaultBadge: { type: "all" } },
        { pageKey: "labResultImport", nameKey: "features.categories.trackYourHealth.labResultImport.name", descKey: "features.categories.trackYourHealth.labResultImport.description", defaultBadge: { type: "tier", label: "Insight: 3/mo, Clarity+: Unlimited" } },
        { pageKey: "medicationImport", nameKey: "features.categories.trackYourHealth.medicationImport.name", descKey: "features.categories.trackYourHealth.medicationImport.description", defaultBadge: { type: "tier", label: "Insight: 1/mo, Clarity+: Unlimited" } },
      ],
    },
    {
      headingKey: "features.categories.understandYourNumbers.heading",
      color: "#3b82f6",
      features: [
        { pageKey: "markerDetailPages", nameKey: "features.categories.understandYourNumbers.markerDetailPages.name", descKey: "features.categories.understandYourNumbers.markerDetailPages.description", defaultBadge: { type: "all" } },
        { pageKey: "foodRecommendations", nameKey: "features.categories.understandYourNumbers.foodRecommendations.name", descKey: "features.categories.understandYourNumbers.foodRecommendations.description", defaultBadge: { type: "all" } },
        { pageKey: "supplementGuidance", nameKey: "features.categories.understandYourNumbers.supplementGuidance.name", descKey: "features.categories.understandYourNumbers.supplementGuidance.description", defaultBadge: { type: "all" } },
        { pageKey: "fastingImpact", nameKey: "features.categories.understandYourNumbers.fastingImpact.name", descKey: "features.categories.understandYourNumbers.fastingImpact.description", defaultBadge: { type: "all" } },
        { pageKey: "markerRelationships", nameKey: "features.categories.understandYourNumbers.markerRelationships.name", descKey: "features.categories.understandYourNumbers.markerRelationships.description", defaultBadge: { type: "all" } },
        { pageKey: "protocolGuides", nameKey: "features.categories.understandYourNumbers.protocolGuides.name", descKey: "features.categories.understandYourNumbers.protocolGuides.description", defaultBadge: { type: "all" } },
      ],
    },
    {
      headingKey: "features.categories.seeYourProgress.heading",
      color: "#10b981",
      features: [
        { pageKey: "trendCharts", nameKey: "features.categories.seeYourProgress.trendCharts.name", descKey: "features.categories.seeYourProgress.trendCharts.description", defaultBadge: { type: "tier", label: "Glimpse: 90 days, Focus+" } },
        { pageKey: "compareProtocols", nameKey: "features.categories.seeYourProgress.compareProtocols.name", descKey: "features.categories.seeYourProgress.compareProtocols.description", defaultBadge: { type: "tier", label: "Focus+" } },
        { pageKey: "aiDashboardInsights", nameKey: "features.categories.seeYourProgress.aiDashboardInsights.name", descKey: "features.categories.seeYourProgress.aiDashboardInsights.description", defaultBadge: { type: "tier", label: "Insight+" } },
        { pageKey: "communityComparison", nameKey: "features.categories.seeYourProgress.communityComparison.name", descKey: "features.categories.seeYourProgress.communityComparison.description", defaultBadge: { type: "tier", label: "Clarity+" } },
      ],
    },
    {
      headingKey: "features.categories.drAlexAi.heading",
      color: "#8b5cf6",
      features: [
        { pageKey: "generalHealthQA", nameKey: "features.categories.drAlexAi.generalHealthQA.name", descKey: "features.categories.drAlexAi.generalHealthQA.description", defaultBadge: { type: "tier", label: "Glimpse: 3/mo, Focus: 10/mo, Insight: 30/mo, Clarity+" } },
        { pageKey: "trendAnalysis", nameKey: "features.categories.drAlexAi.trendAnalysis.name", descKey: "features.categories.drAlexAi.trendAnalysis.description", defaultBadge: { type: "tier", label: "Glimpse: 1/mo, Focus: 3/mo, Insight: 10/mo, Clarity+" } },
        { pageKey: "labResultExplanation", nameKey: "features.categories.drAlexAi.labResultExplanation.name", descKey: "features.categories.drAlexAi.labResultExplanation.description", defaultBadge: { type: "tier", label: "Glimpse: 1/mo, Focus: 3/mo, Insight: 10/mo, Clarity+" } },
        { pageKey: "personalizedNutrition", nameKey: "features.categories.drAlexAi.personalizedNutrition.name", descKey: "features.categories.drAlexAi.personalizedNutrition.description", defaultBadge: { type: "tier", label: "Focus: 3/mo, Insight: 10/mo, Clarity+" } },
        { pageKey: "supplementReview", nameKey: "features.categories.drAlexAi.supplementReview.name", descKey: "features.categories.drAlexAi.supplementReview.description", defaultBadge: { type: "tier", label: "Focus: 3/mo, Insight: 10/mo, Clarity+" } },
        { pageKey: "protocolComparison", nameKey: "features.categories.drAlexAi.protocolComparison.name", descKey: "features.categories.drAlexAi.protocolComparison.description", defaultBadge: { type: "tier", label: "Insight: 5/mo, Clarity+" } },
      ],
    },
    {
      headingKey: "features.categories.medicationsAndSupplements.heading",
      color: "#22d3ee",
      features: [
        { pageKey: "trackWhatYouTake", nameKey: "features.categories.medicationsAndSupplements.trackWhatYouTake.name", descKey: "features.categories.medicationsAndSupplements.trackWhatYouTake.description", defaultBadge: { type: "tier", label: "Glimpse: 5, Focus: 10, Insight+" } },
        { pageKey: "interactionWarnings", nameKey: "features.categories.medicationsAndSupplements.interactionWarnings.name", descKey: "features.categories.medicationsAndSupplements.interactionWarnings.description", defaultBadge: { type: "tier", label: "Glimpse: Basic, Focus+: Full" } },
        { pageKey: "impactOnYourMarkers", nameKey: "features.categories.medicationsAndSupplements.impactOnYourMarkers.name", descKey: "features.categories.medicationsAndSupplements.impactOnYourMarkers.description", defaultBadge: { type: "tier", label: "Focus+" } },
      ],
    },
    {
      headingKey: "features.categories.yourDataYourControl.heading",
      color: "#84cc16",
      features: [
        { pageKey: "fullDataExport", nameKey: "features.categories.yourDataYourControl.fullDataExport.name", descKey: "features.categories.yourDataYourControl.fullDataExport.description", defaultBadge: { type: "tier", label: "Focus+" } },
        { pageKey: "accountDeletion", nameKey: "features.categories.yourDataYourControl.accountDeletion.name", descKey: "features.categories.yourDataYourControl.accountDeletion.description", defaultBadge: { type: "all" } },
        { pageKey: "pdfHealthReport", nameKey: "features.categories.yourDataYourControl.pdfHealthReport.name", descKey: "features.categories.yourDataYourControl.pdfHealthReport.description", defaultBadge: { type: "tier", label: "Insight: 1/mo, Clarity: 2/mo, Horizon: Unlimited" } },
      ],
    },
    {
      headingKey: "features.categories.securityAndPrivacy.heading",
      color: "#ef4444",
      features: [
        { pageKey: "encryptionAtRest", nameKey: "features.categories.securityAndPrivacy.encryptionAtRest.name", descKey: "features.categories.securityAndPrivacy.encryptionAtRest.description", defaultBadge: { type: "all" } },
        { pageKey: "encryptionInTransit", nameKey: "features.categories.securityAndPrivacy.encryptionInTransit.name", descKey: "features.categories.securityAndPrivacy.encryptionInTransit.description", defaultBadge: { type: "all" } },
        { pageKey: "zeroKnowledgeDesign", nameKey: "features.categories.securityAndPrivacy.zeroKnowledgeDesign.name", descKey: "features.categories.securityAndPrivacy.zeroKnowledgeDesign.description", defaultBadge: { type: "all" } },
        { pageKey: "twoFactorAuth", nameKey: "features.categories.securityAndPrivacy.twoFactorAuth.name", descKey: "features.categories.securityAndPrivacy.twoFactorAuth.description", defaultBadge: { type: "tier", label: "Focus+" } },
        { pageKey: "anonymousAi", nameKey: "features.categories.securityAndPrivacy.anonymousAi.name", descKey: "features.categories.securityAndPrivacy.anonymousAi.description", defaultBadge: { type: "all" } },
        { pageKey: "noTracking", nameKey: "features.categories.securityAndPrivacy.noTracking.name", descKey: "features.categories.securityAndPrivacy.noTracking.description", defaultBadge: { type: "all" } },
        { pageKey: "gdprEprivacy", nameKey: "features.categories.securityAndPrivacy.gdprEprivacy.name", descKey: "features.categories.securityAndPrivacy.gdprEprivacy.description", defaultBadge: { type: "all" } },
        { pageKey: "openSourceAuditable", nameKey: "features.categories.securityAndPrivacy.openSourceAuditable.name", descKey: "features.categories.securityAndPrivacy.openSourceAuditable.description", defaultBadge: { type: "all" } },
      ],
    },
    {
      headingKey: "features.categories.comingSoon.heading",
      color: "#ec4899",
      features: [
        { pageKey: "symptomJournal", nameKey: "features.categories.comingSoon.symptomJournal.name", descKey: "features.categories.comingSoon.symptomJournal.description", defaultBadge: { type: "coming-soon" } },
        { pageKey: "foodIntelligence", nameKey: "features.categories.comingSoon.foodIntelligence.name", descKey: "features.categories.comingSoon.foodIntelligence.description", defaultBadge: { type: "coming-soon" } },
        { pageKey: "allergySensitivityTracker", nameKey: "features.categories.comingSoon.allergySensitivityTracker.name", descKey: "features.categories.comingSoon.allergySensitivityTracker.description", defaultBadge: { type: "coming-soon" } },
        { pageKey: "mealAnalysis", nameKey: "features.categories.comingSoon.mealAnalysis.name", descKey: "features.categories.comingSoon.mealAnalysis.description", defaultBadge: { type: "coming-soon" } },
      ],
    },
  ];

  function resolveBadge(feature: Feature): TierBadge {
    if (!loaded || apiFeatures.size === 0) {
      return feature.defaultBadge;
    }
    const apiBadge = buildBadgeFromApi(feature.pageKey, apiFeatures, allPlansLabel);
    return apiBadge ?? feature.defaultBadge;
  }

  const comingSoonHeading = t("features.categories.comingSoon.heading");

  return (
    <div>
      {/* Hero */}
      <section className="px-6 py-14 text-center">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t("features.hero.title")}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg font-medium text-[var(--zone-structural)]">
            Built for people who take their health seriously.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-[var(--muted)]">
            {t("features.hero.subtitle")}
          </p>
        </div>
      </section>

      {/* Feature Categories */}
      {categories.map((category) => {
        const heading = t(category.headingKey);
        return (
          <section key={category.headingKey} className="px-6 py-8">
            <div className="mx-auto max-w-7xl">
              <h2 className="text-2xl font-bold" style={{ color: category.color }}>
                {heading}
              </h2>
              <div className={`mt-6 grid gap-5 sm:grid-cols-2 ${heading === comingSoonHeading ? "" : "lg:grid-cols-3"}`}>
                {category.features.map((feature) => (
                  <div
                    key={feature.pageKey}
                    className="rounded-xl border bg-[var(--card)] p-5"
                    style={{ borderColor: category.color + "25" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-semibold">{t(feature.nameKey)}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                      {t(feature.descKey)}
                    </p>
                    <div className="mt-3">
                      <Badge badge={resolveBadge(feature)} t={t} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* Full feature comparison link */}
      <div className="text-center mt-4 mb-8">
        <a href="/feature-details/" className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
          {t("pricing.viewFullFeatureList")}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>
      </div>

      {/* CTA */}
      <section className="px-6 py-14 text-center">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold">{t("features.cta.title")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-[var(--muted)]">
            {t("features.cta.description")}
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/pricing/"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              {t("features.cta.getEarlyAccess")}
            </a>
            <a
              href="/pricing/"
              className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] px-6 py-3 font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--card)]"
            >
              {t("features.cta.seePricing")}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
