import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn | Sovereign Health Intelligence",
  description: "Tutorials and guides to help you get the most out of Sovereign Health.",
  alternates: { canonical: "https://sovereignhealth.io/learn/" },
  openGraph: {
    title: "Learn | Sovereign Health Intelligence",
    description: "Tutorials and guides to help you get the most out of Sovereign Health.",
    url: "https://sovereignhealth.io/learn/",
    type: "website",
  },
};

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return children;
}
