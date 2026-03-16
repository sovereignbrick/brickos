// ============================================================================
//  SOVEREIGN HEALTH INTELLIGENCE
//
//  BLOOD · BIOMARKERS · INSIGHT
//
//  Privacy-first platform for collecting, analyzing, and understanding
//  blood markers and laboratory data.
//
//  Your body is the operating system of your life.
//  Blood is its diagnostic interface.
//
//  Bitcoin introduced Proof of Work.
//  Health needs Proof of Blood.
//
//  Inspired by the principles of sovereignty, self-custody,
//  and the ideas explored in "Brick by Brick":
//  https://www.amazon.de/-/en/Brick-Building-Sovereign-Life-Bitcoin/dp/B0FR42K8R1
//
//  Own your data. Understand your biology. Build health sovereignty.
//
//  https://sovereignhealth.io/
//  AGPL-3.0 -- https://gitlab.com/sovereign-health
// ============================================================================

import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { DrAlexChat } from "@/components/dr-alex-chat";
import { ReferralRedirect } from "@/components/referral-redirect";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  metadataBase: new URL("https://sovereignhealth.io"),
  title: {
    default: "Sovereign Health Intelligence - Privacy-First Health Tracking",
    template: "%s | Sovereign Health Intelligence",
  },
  description:
    "Track 85+ biomarkers, analyze trends with AI, and maintain complete data sovereignty. Self-host or use our encrypted cloud. Open source, privacy-first.",
  keywords: [
    "health tracking",
    "biomarkers",
    "metabolic health",
    "blood work",
    "health optimization",
    "glucose",
    "ketones",
    "cholesterol",
    "privacy-first",
    "self-hosted",
    "open source",
    "encrypted",
  ],
  alternates: {
    canonical: "https://sovereignhealth.io/",
    languages: {
      en: "https://sovereignhealth.io/",
      de: "https://sovereignhealth.io/?lang=de",
      "x-default": "https://sovereignhealth.io/",
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32 16x16" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sovereignhealth.io",
    siteName: "Sovereign Health Intelligence",
    title: "Sovereign Health Intelligence - Privacy-First Health Tracking",
    description:
      "Track 85+ biomarkers, analyze trends with AI, and maintain complete data sovereignty.",
  },
  twitter: {
    card: "summary",
    title: "Sovereign Health Intelligence",
    description:
      "Track 85+ biomarkers, analyze trends with AI, and maintain complete data sovereignty.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  other: {
    robots: "noai, noimageai",
    rights: "(c) Sovereign Health Intelligence. All rights reserved.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="alternate" hrefLang="en" href="https://sovereignhealth.io/" />
        <link rel="alternate" hrefLang="de" href="https://sovereignhealth.io/?lang=de" />
        <link rel="alternate" hrefLang="x-default" href="https://sovereignhealth.io/" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <I18nProvider>
          <ReferralRedirect />
          <Header />
          <main className="min-h-[calc(100vh-8rem)]">{children}</main>
          <Footer />
          <DrAlexChat />
        </I18nProvider>
      </body>
    </html>
  );
}
