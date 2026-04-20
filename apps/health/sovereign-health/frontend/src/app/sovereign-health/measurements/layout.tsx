import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Measurements',
  description: 'View, add, and manage your health measurements. Track biomarkers with protocol-aware reference ranges.',
}

export default function MeasurementsLayout({ children }: { children: React.ReactNode }) {
  return children
}
