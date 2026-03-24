"use client";

import { useState, useEffect, useRef } from "react";
import { SITE_CONFIG } from "@/lib/config";

// ── API Feature types ───────────────────────────────────────────────────────

export interface ApiFeature {
  feature_key: string;
  name: string;
  description: string | null;
  tooltip: string | null;
  category: string;
  status: string;
  icon: string | null;
  tiers: Record<string, { included: boolean; limit_value: number | null; limit_label: string | null }>;
}

export interface ApiFeaturesResponse {
  data: {
    features: ApiFeature[];
    categories: string[];
  };
}

export const CATEGORY_ORDER = ["data", "ai", "reporting", "integrations", "security", "compliance", "support"];

export const categoryLabels: Record<string, { en: string; de: string; color: string }> = {
  data: { en: "Data & Tracking", de: "Daten & Tracking", color: "#3b82f6" },
  ai: { en: "AI & Intelligence", de: "KI & Intelligenz", color: "#8b5cf6" },
  reporting: { en: "Reporting & Export", de: "Berichte & Export", color: "#10b981" },
  integrations: { en: "Integrations", de: "Integrationen", color: "#f59e0b" },
  security: { en: "Security", de: "Sicherheit", color: "#ef4444" },
  compliance: { en: "Compliance", de: "Compliance", color: "#f97316" },
  support: { en: "Support", de: "Support", color: "#06b6d4" },
};

export const FEATURE_TOOLTIP_KEYS: Record<string, string> = {
  markers: "biomarkers",
  biomarkers: "biomarkers",
  history: "history",
  calculated_markers: "calculated",
  measurement_templates: "templates",
  medications: "medications",
  influence_factors: "medications",
  measurements: "measurements",
  ai_dashboard_insights: "ai_dashboard",
  chat_general: "ai_chats",
  chat_trends: "trends",
  chat_labs: "lab_explain",
  chat_diet: "nutrition",
  chat_supplements: "supplement",
  chat_protocols: "protocols",
  csv_export: "csv_export",
  json_export: "csv_export",
  custom_thresholds: "thresholds",
  body_composition: "body_comp",
  mfa_totp: "twofa",
  pdf_reports: "pdf_reports",
  lab_import: "lab_import",
  med_import: "med_import",
  influence_factor_import: "med_import",
  cohort_comparison: "cohort",
  supplement_marker_impact: "supplement",
  protocol_comparison: "protocols",
  api_access: "api_access",
  self_hosted_hybrid: "self_hosted",
  lifestyle_presets: "thresholds",
  decentralized_auth: "decentralized_auth",
  tor_support: "tor_support",
  start9_package: "start9_package",
  personal_onboarding: "onboarding",
  priority_support: "priority",
  standard_support: "priority",
};

export const allTierKeys = ["core", "glimpse", "focus", "insight", "clarity", "horizon"] as const;
export const highlightedTiers = new Set(["focus"]);

// ── Components ──────────────────────────────────────────────────────────────

export function CellValue({ included, label }: { included: boolean; label: string | null }) {
  if (!included) {
    return <span className="text-red-400/60">&#10005;</span>;
  }
  if (!label || label === "Yes" || label === "Ja") {
    return <span className="text-emerald-400">&#10003;</span>;
  }
  return <span>{label}</span>;
}

export function InfoTooltip({ text }: { text: string }) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [flipToBottom, setFlipToBottom] = useState(false);
  const [alignLeft, setAlignLeft] = useState(false);

  if (!text) return null;

  const handleMouseEnter = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setFlipToBottom(rect.top < 80);
    setAlignLeft(window.innerWidth - rect.left < 200);
  };

  return (
    <span
      ref={triggerRef}
      className="group relative ml-1 inline-flex cursor-help"
      onMouseEnter={handleMouseEnter}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-[var(--muted)] opacity-60 group-hover:opacity-100 transition-opacity">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <text x="8" y="12" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="600">i</text>
      </svg>
      <span
        className={`pointer-events-none absolute z-50 mb-2 rounded-lg bg-[var(--card)] border border-[var(--border)] px-4 py-3 text-xs leading-relaxed text-[var(--foreground)] opacity-0 shadow-xl transition-opacity group-hover:opacity-100 text-left ${
          flipToBottom ? "top-full mt-2" : "bottom-full"
        } ${alignLeft ? "left-0" : "left-1/2 -translate-x-1/2"}`}
        style={{ minWidth: "280px", maxWidth: "480px", whiteSpace: "normal", overflowWrap: "break-word" }}
      >
        {text}
      </span>
    </span>
  );
}

// ── Collapsible Category Row ─────────────────────────────────────────────────

export function CollapsibleCategoryGroup({
  cat,
  catFeatures,
  locale,
  t,
  defaultExpanded,
}: {
  cat: string;
  catFeatures: ApiFeature[];
  locale: string;
  t: (key: string) => string;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Auto-expand/collapse when defaultExpanded changes (e.g. search query)
  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  const catInfo = categoryLabels[cat] || { en: cat, de: cat, color: "#6b7280" };
  const catLabel = locale === "de" ? catInfo.de : catInfo.en;

  return (
    <>
      <tbody>
        <tr
          className="cursor-pointer select-none hover:bg-white/[0.04] transition-colors"
          onClick={() => setExpanded((v) => !v)}
          style={{ borderBottom: `2px solid ${catInfo.color}40` }}
        >
          <td
            colSpan={allTierKeys.length + 1}
            className="px-4 py-3"
            style={{ borderLeft: `3px solid ${catInfo.color}` }}
          >
            <span className="flex items-center gap-3">
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className={`transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
                style={{ color: catInfo.color }}
              >
                <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm font-bold uppercase tracking-wider" style={{ color: catInfo.color }}>
                {catLabel}
              </span>
              <span className="text-xs text-[var(--muted)] font-normal normal-case tracking-normal">
                {catFeatures.length} {catFeatures.length === 1 ? "feature" : "features"}
              </span>
            </span>
          </td>
        </tr>
      </tbody>
      {expanded && <tbody>
        {catFeatures.map((feature, idx) => (
          <tr
            key={feature.feature_key}
            className={`border-b border-[var(--border)] ${idx % 2 === 1 ? "bg-white/[0.02]" : ""}`}
          >
            <td className={`sticky left-0 z-10 px-4 py-3 min-w-[220px] ${idx % 2 === 1 ? "bg-[#0c0c0e]" : "bg-[var(--background)]"}`}>
              <div className="flex items-start gap-1">
                <div className="flex-1">
                  <span className="flex items-center text-[var(--foreground)] font-medium">
                    {feature.name}
                    {(() => {
                      const tip = feature.tooltip || (FEATURE_TOOLTIP_KEYS[feature.feature_key] ? t(`pricing.feature.${FEATURE_TOOLTIP_KEYS[feature.feature_key]}.tooltip`) : null);
                      return tip ? <InfoTooltip text={tip} /> : null;
                    })()}
                    {feature.status === "coming_soon" && (
                      <span className="ml-1.5 inline-block rounded bg-amber-900/40 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 leading-tight">
                        {t("pricing.soon")}
                      </span>
                    )}
                  </span>
                  {feature.description && (
                    <p className="mt-0.5 text-[11px] leading-snug text-[var(--muted)]">
                      {feature.description}
                    </p>
                  )}
                </div>
              </div>
            </td>
            {allTierKeys.map((tierKey) => {
              const tierData = feature.tiers[tierKey];
              return (
                <td key={tierKey} className="px-3 py-3 text-center whitespace-nowrap text-xs sm:text-sm">
                  <CellValue
                    included={tierData?.included ?? false}
                    label={tierData?.limit_label ?? null}
                  />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>}
    </>
  );
}

// ── Feature Comparison Table ─────────────────────────────────────────────────

export function FeatureComparisonTable({
  features,
  categories,
  loading,
  locale,
  t,
  showHeading = true,
  searchQuery = "",
  onSearchChange,
  searchPlaceholder,
}: {
  features: ApiFeature[];
  categories: string[];
  loading: boolean;
  locale: string;
  t: (key: string) => string;
  showHeading?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
}) {
  // Filter features by search query (matches name, description, tooltip, category)
  const filteredFeatures = searchQuery
    ? features.filter((f) => {
        const q = searchQuery.toLowerCase();
        const catInfo = categoryLabels[f.category];
        const catLabel = locale === "de" ? catInfo?.de : catInfo?.en;
        return (
          f.name.toLowerCase().includes(q) ||
          (f.description || "").toLowerCase().includes(q) ||
          (f.tooltip || "").toLowerCase().includes(q) ||
          f.feature_key.toLowerCase().includes(q) ||
          (catLabel || "").toLowerCase().includes(q)
        );
      })
    : features;

  return (
    <section className="px-6 py-4">
      <div className="mx-auto max-w-7xl">
        {showHeading && (
          <h2 className="text-center text-2xl font-bold">{t("pricing.comparison.heading")}</h2>
        )}
        {loading ? (
          <div className="mt-8 text-center text-[var(--muted)]">{t("pricing.loadingFeatures")}</div>
        ) : filteredFeatures.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--background)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="sticky left-0 z-20 bg-[var(--background)] px-4 py-3 text-left font-semibold min-w-[220px]">
                    {onSearchChange ? (
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={searchPlaceholder || t("pricing.comparison.featureColumn")}
                        className="w-full bg-transparent border-b border-[var(--border)] text-sm font-normal text-foreground placeholder:text-[var(--muted)] focus:outline-none focus:border-blue-500 pb-1"
                      />
                    ) : (
                      t("pricing.comparison.featureColumn")
                    )}
                  </th>
                  {allTierKeys.map((tierKey) => (
                    <th
                      key={tierKey}
                      className={`px-3 py-3 text-center font-semibold whitespace-nowrap text-xs sm:text-sm ${
                        highlightedTiers.has(tierKey) ? "text-blue-400" : ""
                      }`}
                    >
                      {tierKey === "core" ? t("pricing.coreTier") : t(`pricing.tiers.${tierKey}.name`)}
                    </th>
                  ))}
                </tr>
              </thead>
              {CATEGORY_ORDER.map((cat) => {
                const catFeatures = filteredFeatures.filter((f) => f.category === cat);
                if (catFeatures.length === 0) return null;
                return (
                  <CollapsibleCategoryGroup
                    key={cat}
                    cat={cat}
                    catFeatures={catFeatures}
                    locale={locale}
                    t={t}
                    defaultExpanded={!!searchQuery}
                  />
                );
              })}
            </table>
          </div>
        ) : searchQuery ? (
          <div className="mt-8 text-center text-[var(--muted)]">
            {t("featureDetails.noResults")}
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ── API Features Hook ───────────────────────────────────────────────────────

// Static fallback data (bundled at build time for offline/CORS-blocked scenarios)
import featuresStaticEn from "@/data/features-en.json";
import featuresStaticDe from "@/data/features-de.json";

const staticFeatures: Record<string, ApiFeaturesResponse> = {
  en: featuresStaticEn as unknown as ApiFeaturesResponse,
  de: featuresStaticDe as unknown as ApiFeaturesResponse,
};

export function useApiFeatures(locale: string) {
  const [features, setFeatures] = useState<ApiFeature[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const lang = locale === 'de' ? 'de' : 'en';

    // Try live API first, fall back to static data (for localhost/CORS/offline)
    fetch(`${SITE_CONFIG.apiUrl}/api/features?lang=${lang}`)
      .then(res => res.json())
      .then((data: ApiFeaturesResponse) => {
        if (data?.data?.features?.length > 0) {
          setFeatures(data.data.features);
          setCategories(data.data.categories || []);
        } else {
          throw new Error('empty');
        }
      })
      .catch(() => {
        // Fallback to bundled static data
        const fallback = staticFeatures[lang] || staticFeatures.en;
        if (fallback?.data?.features) {
          setFeatures(fallback.data.features);
          setCategories(fallback.data.categories || []);
        }
      })
      .finally(() => setLoading(false));
  }, [locale]);

  return { features, categories, loading };
}
