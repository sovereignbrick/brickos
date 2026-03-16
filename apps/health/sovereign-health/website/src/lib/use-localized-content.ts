"use client";

import { useMemo } from "react";
import { useI18n, type Locale } from "./i18n";
import contentEn from "@/data/content-en.json";
import contentDe from "@/data/content-de.json";

const contentByLocale: Record<Locale, typeof contentEn> = {
  en: contentEn,
  de: contentDe,
};

export interface LocalizedMarker {
  slug: string;
  name: string;
  display_name: string;
  description: string;
  tooltip: string;
  unit: string;
  source_type: string;
  is_calculated: boolean;
  zone_slug: string;
  why_it_matters: string;
  when_to_worry: string;
}

/**
 * Returns marker data in the current locale.
 * Falls back to English for any missing fields.
 */
export function useLocalizedMarkers(): LocalizedMarker[] {
  const { locale } = useI18n();

  return useMemo(() => {
    const content = contentByLocale[locale] || contentEn;
    const enContent = contentEn;

    // Build a map of EN markers for fallback
    const enMap = new Map(
      enContent.markers.map((m) => [m.marker_slug, m])
    );

    return content.markers.map((m) => {
      const en = enMap.get(m.marker_slug);
      return {
        slug: m.marker_slug,
        name: m.name || en?.name || m.marker_slug,
        display_name: m.name || en?.name || m.marker_slug,
        description: m.description || en?.description || "",
        tooltip: m.tooltip || en?.tooltip || "",
        unit: m.unit_canonical || en?.unit_canonical || "",
        source_type: m.is_calculated ? "calculated" : "home",
        is_calculated: m.is_calculated || false,
        zone_slug: m.zone_slug || en?.zone_slug || "",
        why_it_matters: m.why_it_matters || en?.why_it_matters || "",
        when_to_worry: m.when_to_worry || en?.when_to_worry || "",
      };
    });
  }, [locale]);
}

/**
 * Returns a single marker by slug in the current locale.
 */
export function useLocalizedMarker(slug: string): LocalizedMarker | undefined {
  const markers = useLocalizedMarkers();
  return useMemo(() => markers.find((m) => m.slug === slug), [markers, slug]);
}
