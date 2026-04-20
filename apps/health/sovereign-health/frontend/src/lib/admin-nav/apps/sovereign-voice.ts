import type { AppNavContribution } from '../types'

// Sprint 046 #571 stub. Sovereign Voice has no org-scoped settings
// surface yet; the registration appears in the sidebar as a greyed
// "available" app.
export const SOVEREIGN_VOICE: AppNavContribution = {
  appKey: 'sovereign-voice',
  label: 'Sovereign Voice',
  shortLabel: 'Sov. Voice',
  orgSettings: [],
}
