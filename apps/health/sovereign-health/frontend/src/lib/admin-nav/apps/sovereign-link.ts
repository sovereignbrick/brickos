import type { AppNavContribution } from '../types'

// Sprint 046 #571 stub. Sub-items are placeholders until Sovereign Link
// builds out per-org settings. The app still appears in the sidebar --
// licensed vs greyed is decided by the org's entitlements.
export const SOVEREIGN_LINK: AppNavContribution = {
  appKey: 'sovereign-link',
  label: 'Sovereign Link',
  shortLabel: 'Sov. Link',
  orgSettings: [
    {
      key: 'overview',
      label: 'Overview',
      href: '/platform/links',
      icon: '\u2197',
      roles: ['org_owner', 'tech_admin', 'commercial_admin', 'platform_admin'],
    },
  ],
}
