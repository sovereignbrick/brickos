import type { AppNavContribution } from '../types'

// Sprint 046 #571 stub, Sprint 051 #0587 end-user pages wired.
// /sovereign-link is the org-member landing; /platform/links stays for
// platform-admin-wide link management.
export const SOVEREIGN_LINK: AppNavContribution = {
  appKey: 'sovereign-link',
  label: 'Sovereign Link',
  shortLabel: 'Sov. Link',
  orgSettings: [
    {
      key: 'overview',
      label: 'Overview',
      href: '/sovereign-link',
      icon: '\u2197',
      roles: ['org_owner', 'tech_admin', 'commercial_admin', 'platform_admin'],
    },
    {
      key: 'analytics',
      label: 'Analytics',
      href: '/sovereign-link/analytics',
      icon: '\u2261',
      roles: ['org_owner', 'tech_admin', 'commercial_admin', 'platform_admin'],
    },
  ],
}
