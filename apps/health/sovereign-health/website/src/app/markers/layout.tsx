import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Biomarkers",
  description:
    "Explore 85+ biomarkers tracked by Sovereign Health Intelligence. Browse by health zone, search by name, and learn what each marker means for your metabolic health.",
  alternates: {
    canonical: "https://sovereignhealth.io/markers/",
  },
  openGraph: {
    title: "Biomarkers - Sovereign Health Intelligence",
    description:
      "Explore 85+ biomarkers tracked by Sovereign Health Intelligence. Browse by health zone, search by name, and learn what each marker means for your metabolic health.",
    url: "https://sovereignhealth.io/markers/",
  },
};

export default function MarkersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
