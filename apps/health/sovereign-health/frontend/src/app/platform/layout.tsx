'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from 'next-intl'
import { AdminContext } from './admin-context'
import type { AdminContextType } from './admin-context'
import { PlatformFilterProvider, usePlatformFilter } from './platform-context'
import { OrgSwitcher } from '@/components/org-switcher'
import { ADMIN_NAV_REGISTRY, type AdminNavRole } from '@/lib/admin-nav'
import { useOrgEntitlements } from '@/lib/use-org-entitlements'
import { getPlane, swapPlaneHost } from '@/lib/plane'
import { useOrg } from '@/lib/org-context'

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

interface NavItem {
  key: string
  label: string
  href: string
  icon: string
  section: string
  visible: (ctx: AdminContextType) => boolean
}

function buildNavItems(t: (key: string) => string): NavItem[] {
  const p = (ctx: AdminContextType) => ctx.isPlatform
  // Sprint 046 hotfix 2026-04-20: org-scoped predicate for ORGANIZATION +
  // PEOPLE + APPS sections. Any org role (or platform admin) sees these.
  const o = (ctx: AdminContextType) => ctx.isPlatform || ctx.isOrgOwner || ctx.isTechAdmin || ctx.isCommercialAdmin
  // PLATFORM-WIDE items (CONTENT / OPS / SECURITY / COMMERCE / platform LINKS)
  // must be gated on isPlatform only. Previously these used `tech`, `comm`,
  // `any` predicates that included isOrgOwner, which leaked platform-wide
  // nav into the org_owner view on {slug}.brickos.io/platform.
  // Org-level tech / commercial admin roles don't currently have
  // platform-wide visibility -- if per-org tech/commercial views are added
  // later, re-introduce narrower predicates then.
  const tech = p
  const comm = p
  const any = p

  return [
    // Overview
    { key: 'home', label: t('home'), href: '/platform', icon: '\u2302', section: 'OVERVIEW', visible: () => true },

    // Organization (Sprint 046 #570: folded from old /org/*)
    { key: 'org-overview', label: t('orgOverview'), href: '/platform/org', icon: '\u2616', section: 'ORGANIZATION', visible: o },
    { key: 'org-general', label: t('general'), href: '/platform/org/general', icon: '\u2699', section: 'ORGANIZATION', visible: o },
    { key: 'org-branding', label: t('branding'), href: '/platform/org/branding', icon: '\u2740', section: 'ORGANIZATION', visible: o },
    { key: 'org-domains', label: t('domains'), href: '/platform/org/domains', icon: '\u2601', section: 'ORGANIZATION', visible: o },
    { key: 'org-analytics', label: t('analytics'), href: '/platform/org/analytics', icon: '\u2261', section: 'ORGANIZATION', visible: o },
    { key: 'org-affiliate', label: t('affiliate'), href: '/platform/org/affiliate', icon: '\u2764', section: 'ORGANIZATION', visible: o },
    { key: 'org-billing', label: t('billing'), href: '/platform/org/billing', icon: '\u2637', section: 'ORGANIZATION', visible: o },

    // People (Sprint 046 #570: unified members list, orgFilter scopes it)
    { key: 'members', label: t('members'), href: '/platform/members', icon: '\u263A', section: 'PEOPLE', visible: (ctx) => ctx.isPlatform || ctx.isOrgOwner || ctx.isTechAdmin || ctx.isCommercialAdmin },

    // Manage (platform-only now; org-level items moved to ORGANIZATION)
    { key: 'apps', label: t('apps'), href: '/platform/apps', icon: '\u25A6', section: 'MANAGE', visible: () => true },
    { key: 'orgs', label: t('organizations'), href: '/platform/orgs', icon: '\u2616', section: 'MANAGE', visible: p },
    { key: 'users', label: t('users'), href: '/platform/users', icon: '\u2639', section: 'MANAGE', visible: p },

    // Commerce (platform-wide; org-specific billing/affiliate live in ORGANIZATION)
    { key: 'platform-billing', label: t('billing'), href: '/platform/billing', icon: '\u2637', section: 'COMMERCE', visible: p },
    { key: 'platform-affiliates', label: t('affiliates'), href: '/platform/affiliates', icon: '\u2764', section: 'COMMERCE', visible: p },
    { key: 'promotions', label: t('promotions'), href: '/platform/promotions', icon: '\u2606', section: 'COMMERCE', visible: p },
    { key: 'revenue', label: t('revenue'), href: '/platform/revenue', icon: '\u2696', section: 'COMMERCE', visible: p },

    // Links
    { key: 'links', label: t('links'), href: '/platform/links', icon: '\u2197', section: 'LINKS', visible: any },
    { key: 'platform-analytics', label: t('analytics'), href: '/platform/analytics', icon: '\u2261', section: 'LINKS', visible: any },

    // Content
    { key: 'content-app', label: t('contentApp'), href: '/platform/content/app', icon: '\u270E', section: 'CONTENT', visible: p },
    { key: 'content-web', label: t('contentWeb'), href: '/platform/content/web', icon: '\u2318', section: 'CONTENT', visible: tech },
    // Sprint 041 #535: content-strings is a "Coming soon" stub. Hidden from
    // nav until the i18n string editor is implemented. Re-enable by removing
    // the `visible: () => false` override.
    { key: 'content-strings', label: t('strings'), href: '/platform/content/strings', icon: '\u2630', section: 'CONTENT', visible: () => false },
    { key: 'newsletter', label: t('newsletter'), href: '/platform/newsletter', icon: '\u2709', section: 'CONTENT', visible: comm },
    { key: 'contact', label: t('contact'), href: '/platform/contact', icon: '\u2706', section: 'CONTENT', visible: any },

    // AI
    // Sprint 041 #532: ai-config is a non-functional mockup (no onClick on
    // Test Connection, no onChange on inputs, no save button). Hidden from
    // nav until #529 (Dr. Alex consume brickos system AI defaults) lands
    // and rebuilds this page properly.
    { key: 'ai-config', label: t('aiConfig'), href: '/platform/ai/config', icon: '\u2699', section: 'AI', visible: () => false },
    { key: 'ai-usage', label: t('aiUsage'), href: '/platform/ai/usage', icon: '\u2604', section: 'AI', visible: any },

    // Ops
    { key: 'services', label: t('services'), href: '/platform/services', icon: '\u2665', section: 'OPS', visible: tech },
    { key: 'alerts', label: t('alerts'), href: '/platform/alerts', icon: '\u26A0', section: 'OPS', visible: tech },
    { key: 'deploy', label: t('deploy'), href: '/platform/deploy', icon: '\u2191', section: 'OPS', visible: p },

    // Security
    { key: 'audit', label: t('audit'), href: '/platform/audit', icon: '\u2610', section: 'SECURITY', visible: tech },
    { key: 'compliance', label: t('compliance'), href: '/platform/compliance', icon: '\u2611', section: 'SECURITY', visible: p },

    // Settings (platform-wide only now; org branding/domains moved to ORGANIZATION)
    { key: 'settings', label: t('settings'), href: '/platform/settings', icon: '\u2638', section: 'SETTINGS', visible: p },
    { key: 'licensing', label: t('licensing'), href: '/platform/licensing', icon: '\u2694', section: 'SETTINGS', visible: p },
    { key: 'features', label: t('features'), href: '/platform/features', icon: '\u269B', section: 'SETTINGS', visible: p },
  ]
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/** Data scoping filter dropdowns in the platform header */
function FilterDropdowns() {
  const { appFilter, orgFilter, orgs, setAppFilter, setOrgFilter, isOrgLocked } = usePlatformFilter()

  const selectedOrgName = orgs.find(o => o.id === orgFilter)?.name

  return (
    <div className="hidden sm:flex items-center gap-2">
      <select
        value={appFilter}
        onChange={e => setAppFilter(e.target.value)}
        className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2 py-1 text-[11px] text-zinc-400 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
      >
        {/* Sprint 041 #537 fix: option values must match the canonical app_key
            stored in DB columns (short_links.app_key, org_apps.app_key). The
            previous "shi" value mismatched the DB ("sovereign-health"), so
            picking Sovereign Health from the filter returned 0 results on
            every /platform/* page that respects this shared filter bar. */}
        <option value="all">All Apps</option>
        <option value="sovereign-health">Sovereign Health</option>
        <option value="sovereign-link">Sovereign Link</option>
        <option value="sovereign-voice">Sovereign Voice</option>
      </select>
      {isOrgLocked ? (
        <span className="text-[11px] text-zinc-500 px-2 py-1 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
          {selectedOrgName || 'Your Org'}
        </span>
      ) : (
        <select
          value={orgFilter}
          onChange={e => setOrgFilter(e.target.value)}
          className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2 py-1 text-[11px] text-zinc-400 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
        >
          <option value="all">All Orgs</option>
          {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      )}
    </div>
  )
}

/** Set BrickOS favicon + title when on brickos.io domain */
function BrickOSHead() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const isBrickOS = window.location.hostname.endsWith('.brickos.io')
    if (!isBrickOS) return

    // Set favicon
    let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.type = 'image/png'
    link.href = '/brickos-favicon-32.png'

    // Set title
    document.title = 'BrickOS Platform'

    // Also set apple-touch-icon
    let apple = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null
    if (apple) apple.href = '/brickos-favicon-32.png'
  })
  return null
}

/** User profile dropdown in the top-right header */
function UserProfileMenu({ user }: { user: { email: string; display_name: string | null; role: string } }) {
  const [open, setOpen] = useState(false)

  const initials = (user.display_name || user.email)
    .split(/[\s@]/)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() || '')
    .join('')

  const handleLogout = () => {
    // Clear cookie and redirect
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    window.location.href = '/login'
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-200">
          {initials}
        </div>
        <span className="hidden sm:block text-sm text-zinc-300 max-w-[150px] truncate">
          {user.display_name || user.email}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl z-50 py-1">
            <div className="px-3 py-2 border-b border-zinc-800">
              <p className="text-sm font-medium truncate">{user.display_name || 'User'}</p>
              <p className="text-xs text-zinc-400 truncate">{user.email}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5 capitalize">{user.role}</p>
            </div>
            {/* Sprint 040 #484 -- multi-org switcher (hidden if 0 memberships) */}
            <OrgSwitcher />
            {/* Sprint 041 #533 fix: collapsed "Security & MFA" sibling
                back into the Settings entry. Per the brickos master template
                (#528), Security is a tab inside Settings, not a sibling
                navigation item. Users who want MFA find it via the Security
                tab inside /settings. */}
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Settings
            </Link>
            {/* Sprint 046 #573 -- cross-plane entry on admin plane sidebar.
                Visible on org subdomains where we can swap {slug}.brickos.io
                to {slug}.sovereignhealth.io. Opens in a new tab because the
                cookie is scoped per parent domain (Design 025). */}
            <AdminPlaneCrossLink onClick={() => setOpen(false)} />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 transition-colors text-left"
            >
              Logout
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** Sprint 046 #573 -- "Open Sovereign Health" in the admin plane profile menu.
 *
 * Only renders on org subdomains where the parent can be swapped from
 * brickos.io to sovereignhealth.io. Hidden on app.brickos.io and unknown
 * hosts. Uses a fresh tab since cookies are scoped per plane.
 */
function AdminPlaneCrossLink({ onClick }: { onClick: () => void }) {
  const [href, setHref] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const host = window.location.hostname
    if (getPlane(host) !== 'admin') return
    const swapped = swapPlaneHost(host, 'end-user')
    if (!swapped) return
    setHref(`https://${swapped}/dashboard`)
  }, [])

  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
    >
      Open Sovereign Health {'\u2197'}
    </a>
  )
}

/** Role mapping from AdminContextType flags to AdminNavRole codes. */
function activeRoles(ctx: AdminContextType): AdminNavRole[] {
  const roles: AdminNavRole[] = []
  if (ctx.isPlatform) roles.push('platform_admin')
  if (ctx.isOrgOwner) roles.push('org_owner')
  if (ctx.isTechAdmin) roles.push('tech_admin')
  if (ctx.isCommercialAdmin) roles.push('commercial_admin')
  if (roles.length === 0) roles.push('member')
  return roles
}

/** Sprint 046 #571 -- APPS section fed by the admin-nav registry.
 *
 * Each registered app is always rendered. `licensed` controls whether
 * its sub-items are interactive (links) or greyed labels tagged with
 * "Licensed by BrickOS". Items further filter by role.
 */
function AppsNavSection({
  ctx,
  pathname,
  collapsed,
}: {
  ctx: AdminContextType
  pathname: string
  collapsed: boolean
}) {
  const { licensed, loading } = useOrgEntitlements()
  const roles = activeRoles(ctx)

  return (
    <div>
      {!collapsed && (
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-4 pt-4 pb-1">
          APPS
        </p>
      )}
      {ADMIN_NAV_REGISTRY.map(app => {
        const isLicensed = licensed.has(app.appKey)
        const visibleItems = app.orgSettings.filter(item =>
          item.roles.some(r => roles.includes(r)),
        )
        return (
          <div key={app.appKey} className="mb-1">
            {!collapsed && (
              <div className="flex items-center justify-between gap-2 px-4 pt-2 pb-1">
                <span
                  className={`text-xs font-medium truncate ${
                    isLicensed ? 'text-zinc-300' : 'text-zinc-600'
                  }`}
                >
                  {app.label}
                </span>
                {!isLicensed && !loading && (
                  <span
                    className="text-[9px] uppercase tracking-wider text-zinc-600 border border-zinc-800 rounded px-1 py-0.5 shrink-0"
                    title="Contact BrickOS to license this app"
                  >
                    Licensed by BrickOS
                  </span>
                )}
              </div>
            )}
            {visibleItems.map(item => {
              const isActive =
                isLicensed && (pathname === item.href || pathname.startsWith(`${item.href}/`))
              const baseClassName = `
                flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm transition-colors
                ${!isLicensed
                  ? 'text-zinc-600 cursor-not-allowed opacity-60'
                  : isActive
                    ? 'text-zinc-50 bg-zinc-800'
                    : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50'}
              `
              const content = (
                <>
                  <span className="text-base shrink-0">{item.icon ?? '\u2022'}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </>
              )
              const title = collapsed ? `${app.label}: ${item.label}` : undefined
              return isLicensed ? (
                <Link
                  key={item.key}
                  href={item.href}
                  data-nav-item={item.label.toLowerCase()}
                  title={title}
                  className={baseClassName}
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={item.key}
                  data-nav-item={item.label.toLowerCase()}
                  title={title}
                  className={baseClassName}
                  aria-disabled="true"
                >
                  {content}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('platform.nav')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Sprint 046 hotfix: read org_id/org_role from JWT (Sprint 044 #546 added
  // these claims). useOrg() already parses them -- we just consume the state.
  const org = useOrg()
  const isPlatform = user?.role === 'admin'
  const orgRole = org.orgRole

  const ctx: AdminContextType = {
    isPlatform,
    isOrgOwner: orgRole === 'owner' || orgRole === 'org_owner',
    isTechAdmin: orgRole === 'tech_admin',
    isCommercialAdmin: orgRole === 'commercial_admin',
    orgId: org.orgId,
    orgName: org.isOrg ? org.orgName : null,
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?return=/platform')
    } else if (!loading && user && user.role !== 'admin' && !org.orgId && !org.loading) {
      // No platform role AND no org membership => kick to end-user app
      router.push('/dashboard')
    }
  }, [loading, user, org.orgId, org.loading, router])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  if (loading || !user) return null

  const navItems = buildNavItems(t)
  const visibleItems = navItems.filter(item => item.visible(ctx))

  // Group by section
  const sections: Record<string, NavItem[]> = {}
  for (const item of visibleItems) {
    if (!sections[item.section]) sections[item.section] = []
    sections[item.section].push(item)
  }

  const appTitle = ctx.orgName ? `BrickOS Platform - ${ctx.orgName}` : 'BrickOS Platform'

  return (
    <AdminContext.Provider value={ctx}>
      <PlatformFilterProvider>
      <BrickOSHead />
      <div className="min-h-screen bg-[#09090b] text-zinc-50 flex">
        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden fixed bottom-4 right-4 z-50 bg-orange-500 hover:bg-orange-600 text-white h-10 px-4 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium transition-colors"
        >
          {mobileOpen ? '\u2715' : '\u2630'}
        </button>

        {/* Sidebar
            Sprint 041 round 3: aside is a flex column so the header
            (logo + name) and search input STICK at the top while the
            nav scrolls inside. Previously the whole aside had
            overflow-y-auto, so scrolling the sidebar moved the brand
            header out of view. */}
        <aside className={`
          fixed lg:sticky top-0 left-0 z-40 h-screen flex flex-col
          ${collapsed ? 'w-16' : 'w-60'} border-r border-zinc-800 bg-[#09090b]
          transition-all duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Header (sticky -- shrink-0 means it doesn't get pushed down by the scrolling nav) */}
          <div
            data-testid="platform-sidebar-header"
            className="flex items-center gap-3 px-3 py-3 border-b border-zinc-800 shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brickos-cube.png" alt="BrickOS"
              className={`w-8 h-8 shrink-0 ${collapsed ? 'cursor-pointer hover:opacity-80' : ''}`}
              onClick={collapsed ? () => setCollapsed(false) : undefined}
              title={collapsed ? 'Expand sidebar' : undefined}
            />
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{appTitle}</p>
                </div>
                <button
                  onClick={() => setCollapsed(true)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                  title="Collapse sidebar"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Search (also sticky -- shrink-0) */}
          {!collapsed && (
            <div
              data-testid="platform-sidebar-search"
              className="px-3 py-2 border-b border-zinc-800 shrink-0"
            >
              <input
                type="text"
                placeholder="Search pages..."
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                onChange={(e) => {
                  const q = e.target.value.toLowerCase()
                  document.querySelectorAll('[data-nav-item]').forEach(el => {
                    const label = el.getAttribute('data-nav-item') || ''
                    ;(el as HTMLElement).style.display = !q || label.includes(q) ? '' : 'none'
                  })
                }}
              />
            </div>
          )}

          {/* Nav sections (the scrolling area; min-h-0 lets it shrink in the flex column) */}
          <nav className="py-2 overflow-y-auto flex-1 min-h-0">
            {Object.entries(sections).map(([section, items]) => (
              <div key={section}>
                {!collapsed && (
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-4 pt-4 pb-1">
                    {section}
                  </p>
                )}
                {items.map(item => {
                  const isActive = pathname === item.href || (item.href !== '/platform' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      data-nav-item={item.label.toLowerCase()}
                      className={`
                        flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm transition-colors
                        ${isActive
                          ? 'text-zinc-50 bg-zinc-800'
                          : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50'}
                      `}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="text-base shrink-0">{item.icon}</span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            ))}

            {/* Sprint 046 #571: APPS section rendered from admin-nav registry.
                Licensed apps interactive; unlicensed greyed + "Licensed by
                BrickOS" tag (no self-serve Enable per Design 026). */}
            <AppsNavSection
              ctx={ctx}
              pathname={pathname}
              collapsed={collapsed}
            />
          </nav>

          {/* Expand button when collapsed */}
          {collapsed && (
            <div className="px-2 py-3 border-t border-zinc-800">
              <button
                onClick={() => setCollapsed(false)}
                className="w-full flex items-center justify-center py-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                title="Expand sidebar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
          {/* Top header with app switcher + user profile.
              Sprint 046 hotfix 2026-04-20 (round 7): removed the legacy
              "Health" link to /sovereignhealth/ -- that path is from
              Design 015's path-mount era and no longer exists. The
              profile dropdown already has "Open Sovereign Health \u2197"
              as the canonical cross-plane jump. Multi-app URL routing
              (#577 / Design 027) will replace this header app switcher
              with a proper per-app tab list. */}
          <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 sm:px-6 shrink-0">
            <nav className="flex items-center gap-1">
              {[
                { label: 'Platform', href: '/platform', active: pathname.startsWith('/platform') && !pathname.startsWith('/platform/apps') },
                { label: 'Links', href: '/platform/links', active: pathname === '/platform/links' },
                { label: 'Apps', href: '/platform/apps', active: pathname === '/platform/apps' },
              ].map(app => (
                <Link
                  key={app.label}
                  href={app.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    app.active ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  {app.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <FilterDropdowns />
              <UserProfileMenu user={user} />
            </div>
          </header>

          {/* Sprint 046 #14 hotfix: platform-admin scope banner. Visible
              only when a platform_admin is viewing an org subdomain.
              Org admins never see this (they have no "all orgs" concept). */}
          {ctx.isPlatform && ctx.orgName && (
            <div className="bg-orange-500/10 border-b border-orange-500/20 px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-sm">
              <div className="text-orange-300 truncate">
                <span className="font-semibold">BrickOS admin</span>
                <span className="text-orange-400/70 mx-2">·</span>
                <span className="text-orange-200">scope: {ctx.orgName}</span>
              </div>
              <a
                href="https://demo.brickos.io/platform"
                className="text-orange-300 hover:text-orange-200 underline decoration-dotted underline-offset-2 shrink-0"
              >
                {'\u2190'} Back to all orgs
              </a>
            </div>
          )}

          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </PlatformFilterProvider>
    </AdminContext.Provider>
  )
}
