import type { Metadata } from 'next'

const ZONE_META: Record<string, { name: string; description: string }> = {
  energy_metabolic: {
    name: 'Energy & Metabolic',
    description: 'Track glucose, insulin, ketones, and thyroid markers. Monitor your metabolic engine and energy sustainability.',
  },
  structural: {
    name: 'Structural',
    description: 'Monitor calcium, magnesium, protein, and vitamin D. Track bone, muscle, and connective tissue health.',
  },
  cardiovascular: {
    name: 'Cardiovascular',
    description: 'Track ApoB, lipid ratios, and blood pressure. Monitor true cardiovascular risk factors.',
  },
  cognitive: {
    name: 'Cognitive',
    description: 'Monitor B vitamins, magnesium, and hormones that impact brain function, memory, and mood.',
  },
  immune: {
    name: 'Immune',
    description: 'Track white blood cells, vitamin D, zinc, and selenium. Monitor immune balance and resilience.',
  },
  nutritional: {
    name: 'Nutritional',
    description: 'Track essential vitamins and minerals. Monitor micronutrient status for optimal cellular function.',
  },
  hormonal: {
    name: 'Hormonal',
    description: 'Monitor sex hormones, stress hormones, and reproductive markers for metabolic and mood optimization.',
  },
  detoxification: {
    name: 'Detoxification',
    description: 'Track liver and kidney function markers. Monitor ALT, GGT, creatinine, eGFR, and uric acid.',
  },
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const zone = ZONE_META[slug]
  if (!zone) {
    return { title: 'Health Zone' }
  }
  return {
    title: zone.name,
    description: zone.description,
    openGraph: {
      title: `${zone.name} Zone | Sovereign Health`,
      description: zone.description,
    },
  }
}

export default function ZoneLayout({ children }: { children: React.ReactNode }) {
  return children
}
