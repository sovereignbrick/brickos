import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trends',
  description: 'Track how your biomarkers change over time. Compare periods, spot patterns, and measure progress.',
}

export default function TrendsLayout({ children }: { children: React.ReactNode }) {
  return children
}
