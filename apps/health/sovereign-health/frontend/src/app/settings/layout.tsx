import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your profile, unit preferences, custom reference ranges, and data privacy settings.',
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children
}
