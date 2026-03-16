import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Health Zones",
  description:
    "Discover 8 health zones in Sovereign Health Intelligence: Energy & Metabolic, Cardiovascular, Cognitive, Immune, Hormonal, Structural, Nutritional, and Detoxification.",
  alternates: {
    canonical: "https://sovereignhealth.io/health-zones/",
  },
  openGraph: {
    title: "Health Zones - Sovereign Health Intelligence",
    description:
      "Discover 8 health zones in Sovereign Health Intelligence covering all aspects of metabolic health.",
    url: "https://sovereignhealth.io/health-zones/",
  },
};

export default function HealthZonesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
