import type { AppNavContribution } from './types'
import { SOVEREIGN_HEALTH } from './apps/sovereign-health'
import { SOVEREIGN_LINK } from './apps/sovereign-link'
import { SOVEREIGN_VOICE } from './apps/sovereign-voice'

export type { AppNavContribution, AppNavItem, AdminNavRole } from './types'

// Ordered registry -- sidebar renders apps in this sequence.
export const ADMIN_NAV_REGISTRY: readonly AppNavContribution[] = [
  SOVEREIGN_HEALTH,
  SOVEREIGN_LINK,
  SOVEREIGN_VOICE,
]
