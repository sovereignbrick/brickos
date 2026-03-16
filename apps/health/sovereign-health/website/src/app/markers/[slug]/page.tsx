import type { Metadata } from "next";
import markersData from "../../../../data/markers.json";
import MarkerPage from "./marker-detail";

interface MarkerEntry {
  slug: string;
  name: string;
  display_name?: string;
  description?: string;
  unit?: string;
  zone_name?: string;
}

export function generateStaticParams() {
  return markersData.map((m: { slug: string }) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const marker = (markersData as MarkerEntry[]).find((m) => m.slug === slug);

  if (!marker) {
    return {
      title: "Biomarker Not Found",
    };
  }

  const displayName = marker.display_name || marker.name;
  const firstLine = marker.description?.split("\n")[0] ?? "";
  const description = firstLine
    ? `${displayName}: ${firstLine} Track ${displayName} with Sovereign Health Intelligence.`
    : `Track ${displayName} with Sovereign Health Intelligence. Privacy-first biomarker tracking and analysis.`;

  return {
    title: displayName,
    description,
    alternates: {
      canonical: `https://sovereignhealth.io/markers/${slug}/`,
    },
    openGraph: {
      title: `${displayName} - Sovereign Health Intelligence`,
      description,
      url: `https://sovereignhealth.io/markers/${slug}/`,
    },
  };
}

export default function Page() {
  return <MarkerPage />;
}
