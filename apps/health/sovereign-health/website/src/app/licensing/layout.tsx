import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How licensing works",
  description:
    "Plain-language guide to how Sovereign Health and BrickOS licenses work: tier features, downgrade behavior, account inactivity, organization termination, AI usage limits.",
  alternates: {
    canonical: "https://sovereignhealth.io/licensing/",
  },
  openGraph: {
    title: "How licensing works - Sovereign Health Intelligence",
    description:
      "Plain-language guide to how Sovereign Health and BrickOS licenses work: tier features, downgrade behavior, account inactivity, organization termination.",
    url: "https://sovereignhealth.io/licensing/",
  },
};

export default function LicensingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
