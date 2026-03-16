import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log In',
  description: 'Sign in to your Sovereign Health account to access your biomarker data and health insights.',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
