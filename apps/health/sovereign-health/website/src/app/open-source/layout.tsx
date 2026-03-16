import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Open Source",
  description:
    "Sovereign Health is open source under AGPLv3. Self-host the full platform, audit the code, and maintain complete data sovereignty. No vendor lock-in.",
  alternates: {
    canonical: "https://sovereignhealth.io/open-source/",
  },
  openGraph: {
    title: "Open Source - Sovereign Health Intelligence",
    description:
      "Sovereign Health is open source under AGPLv3. Self-host the full platform, audit the code, and maintain complete data sovereignty.",
    url: "https://sovereignhealth.io/open-source/",
  },
};

export default function OpenSourceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
