import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create your Sovereign Health account. Start tracking your biomarkers with privacy-first health intelligence.',
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
