import type { Metadata } from 'next'

function formatMarkerName(slug: string): string {
  const special: Record<string, string> = {
    hba1c: 'HbA1c', apob: 'ApoB', lp_a: 'Lp(a)', ldl_c: 'LDL-C', hdl_c: 'HDL-C',
    vldl: 'VLDL', non_hdl_c: 'Non-HDL-C', hscrp: 'hs-CRP', alt: 'ALT', ast: 'AST',
    ggt: 'GGT', egfr: 'eGFR', tsh: 'TSH', ft3: 'Free T3', ft4: 'Free T4',
    dheas: 'DHEA-S', fsh: 'FSH', lh: 'LH', wbc: 'WBC', rbc: 'RBC',
    gki: 'GKI', bmi: 'BMI', whtr: 'WHtR', homa_ir: 'HOMA-IR',
    tyg_index: 'TyG Index', tg_hdl_ratio: 'TG/HDL Ratio',
    total_cholesterol_hdl_ratio: 'Total Cholesterol/HDL Ratio',
    ldl_hdl_ratio: 'LDL/HDL Ratio',
  }
  if (special[slug]) return special[slug]
  return slug.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export async function generateMetadata({ params }: { params: Promise<{ markerId: string }> }): Promise<Metadata> {
  const { markerId } = await params
  const name = formatMarkerName(markerId)
  return {
    title: name,
    description: `Track your ${name} levels over time. View reference ranges, trends, and personalized insights.`,
    openGraph: {
      title: `${name} | Sovereign Health`,
      description: `Track your ${name} levels over time. View reference ranges, trends, and personalized insights.`,
    },
  }
}

export default function MarkerLayout({ children }: { children: React.ReactNode }) {
  return children
}
