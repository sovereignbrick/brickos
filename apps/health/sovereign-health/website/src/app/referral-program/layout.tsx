import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Referral Program",
  description:
    "Earn recurring commissions by referring users to Sovereign Health Intelligence. Share your link, track conversions, and get paid in EUR or Bitcoin.",
  alternates: {
    canonical: "https://sovereignhealth.io/referral-program/",
  },
  openGraph: {
    title: "Referral Program - Sovereign Health Intelligence",
    description:
      "Earn recurring commissions by referring users to Sovereign Health Intelligence. Share your link, track conversions, and get paid.",
    url: "https://sovereignhealth.io/referral-program/",
  },
};

export default function ReferralProgramLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
