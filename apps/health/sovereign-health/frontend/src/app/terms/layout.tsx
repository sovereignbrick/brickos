import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of service for Sovereign Health Intelligence.',
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
