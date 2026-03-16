import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Sovereign Health Intelligence: our mission, values, and the team behind privacy-first metabolic health tracking. Open source, encrypted, and user-owned.",
  alternates: {
    canonical: "https://sovereignhealth.io/about/",
  },
  openGraph: {
    title: "About - Sovereign Health Intelligence",
    description:
      "Learn about Sovereign Health Intelligence: our mission, values, and the team behind privacy-first metabolic health tracking.",
    url: "https://sovereignhealth.io/about/",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
