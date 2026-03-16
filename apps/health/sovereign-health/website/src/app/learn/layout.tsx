import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn",
  description:
    "Educational resources about metabolic health, biomarkers, and health optimization. Videos, guides, and tutorials from Sovereign Health Intelligence.",
  alternates: {
    canonical: "https://sovereignhealth.io/learn/",
  },
  openGraph: {
    title: "Learn - Sovereign Health Intelligence",
    description:
      "Educational resources about metabolic health, biomarkers, and health optimization from Sovereign Health Intelligence.",
    url: "https://sovereignhealth.io/learn/",
  },
};

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
