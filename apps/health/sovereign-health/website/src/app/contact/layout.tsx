import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Sovereign Health Intelligence. Reach out for support, partnerships, bug reports, feature requests, or billing questions.",
  alternates: {
    canonical: "https://sovereignhealth.io/contact/",
  },
  openGraph: {
    title: "Contact - Sovereign Health Intelligence",
    description:
      "Get in touch with Sovereign Health Intelligence for support, partnerships, and inquiries.",
    url: "https://sovereignhealth.io/contact/",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
