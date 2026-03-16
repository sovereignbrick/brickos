import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partners",
  description:
    "Partner with Sovereign Health Intelligence. Programs for health practitioners, clinics, labs, and affiliates. Earn commissions and help your clients track their health.",
  alternates: {
    canonical: "https://sovereignhealth.io/partners/",
  },
  openGraph: {
    title: "Partners - Sovereign Health Intelligence",
    description:
      "Partner with Sovereign Health Intelligence. Programs for health practitioners, clinics, labs, and affiliates.",
    url: "https://sovereignhealth.io/partners/",
  },
};

export default function PartnersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
