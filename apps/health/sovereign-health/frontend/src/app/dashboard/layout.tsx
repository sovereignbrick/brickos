import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Health Overview',
  description: 'View your health zones, biomarker status, and overall metabolic health at a glance.',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
