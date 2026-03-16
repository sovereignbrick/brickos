import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Compare Sovereign Health Intelligence plans: Glimpse (free), Focus, Insight, Clarity, and Horizon. Privacy-first health tracking starting at no cost. Pay with card or Bitcoin.",
  alternates: {
    canonical: "https://sovereignhealth.io/pricing/",
  },
  openGraph: {
    title: "Pricing - Sovereign Health Intelligence",
    description:
      "Compare Sovereign Health Intelligence plans: Glimpse (free), Focus, Insight, Clarity, and Horizon. Privacy-first health tracking starting at no cost.",
    url: "https://sovereignhealth.io/pricing/",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
