import type { AppNavContribution } from '../types'

export const SOVEREIGN_HEALTH: AppNavContribution = {
  appKey: 'sovereign-health',
  label: 'Sovereign Health',
  shortLabel: 'Sov. Health',
  orgSettings: [
    {
      key: 'email',
      label: 'Email Templates',
      href: '/platform/org/apps/shi/email',
      icon: '\u2709',
      roles: ['org_owner', 'tech_admin', 'platform_admin'],
    },
    {
      key: 'ai',
      label: 'AI Config',
      href: '/platform/org/apps/shi/ai',
      icon: '\u2604',
      roles: ['org_owner', 'tech_admin', 'platform_admin'],
    },
  ],
}
