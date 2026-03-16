import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Explore all Sovereign Health Intelligence features: 85+ biomarkers, AI-powered analysis with Dr. Alex, encrypted data storage, lab result import, medication tracking, and more.",
  alternates: {
    canonical: "https://sovereignhealth.io/features/",
  },
  openGraph: {
    title: "Features - Sovereign Health Intelligence",
    description:
      "Explore all Sovereign Health Intelligence features: 85+ biomarkers, AI-powered analysis, encrypted storage, and comprehensive health tracking.",
    url: "https://sovereignhealth.io/features/",
  },
};

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
