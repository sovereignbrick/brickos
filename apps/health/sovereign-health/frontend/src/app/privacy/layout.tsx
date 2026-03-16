import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for Sovereign Health Intelligence. Your health data stays private.',
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
