import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security",
  description:
    "How Sovereign Health Intelligence protects your data: AES-256-GCM encryption, zero-knowledge architecture, TLS 1.3, no tracking, GDPR compliance, and open-source transparency.",
  alternates: {
    canonical: "https://sovereignhealth.io/security/",
  },
  openGraph: {
    title: "Security - Sovereign Health Intelligence",
    description:
      "How Sovereign Health Intelligence protects your data: AES-256-GCM encryption, zero-knowledge architecture, TLS 1.3, and GDPR compliance.",
    url: "https://sovereignhealth.io/security/",
  },
};

export default function SecurityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
