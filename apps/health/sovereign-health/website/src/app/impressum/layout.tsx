import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum",
  description:
    "Legal notice (Impressum) for Sovereign Health Intelligence as required by German law. Company information, contact details, and regulatory disclosures.",
  alternates: {
    canonical: "https://sovereignhealth.io/impressum/",
  },
  openGraph: {
    title: "Impressum - Sovereign Health Intelligence",
    description:
      "Legal notice (Impressum) for Sovereign Health Intelligence as required by German law.",
    url: "https://sovereignhealth.io/impressum/",
  },
};

export default function ImpressumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
