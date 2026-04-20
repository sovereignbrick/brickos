// Sprint 046 #571 -- declarative nav registry for org-scoped app settings.
//
// Each installed BrickOS app contributes its admin-nav entries via a
// single file under src/lib/admin-nav/apps/{appKey}.ts. The platform
// layout iterates the registry and renders an APPS section; licensed
// apps are interactive, unlicensed apps render greyed with a
// "Licensed by BrickOS" tag (no self-serve Enable -- licensing is a
// commercial decision per Design 026).

export type AdminNavRole =
  | 'platform_admin'
  | 'org_owner'
  | 'tech_admin'
  | 'commercial_admin'
  | 'member'

export interface AppNavItem {
  /** Stable identifier within the app's sub-tree. */
  key: string
  /** User-facing label, e.g. "Email Templates". */
  label: string
  /** Absolute path under /platform. */
  href: string
  /** Short single-character glyph rendered in the sidebar. */
  icon?: string
  /** Item is visible only if the user has at least one of these roles. */
  roles: AdminNavRole[]
}

export interface AppNavContribution {
  /** Internal canonical app identifier (matches brickos-licensing + backend org_apps.app_key). */
  appKey: string
  /** User-facing app name -- use the full "Sovereign X" form, never abbreviations. */
  label: string
  /** Short label for narrow viewports / mobile, optional. */
  shortLabel?: string
  /** Entries rendered under this app in the APPS sidebar section. */
  orgSettings: AppNavItem[]
}
