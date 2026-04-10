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
  const o = (ctx: AdminContextType) => ctx.isOrgOwner || ctx.isTechAdmin || ctx.isCommercialAdmin
  const tech = (ctx: AdminContextType) => ctx.isPlatform || ctx.isOrgOwner || ctx.isTechAdmin
  const comm = (ctx: AdminContextType) => ctx.isPlatform || ctx.isOrgOwner || ctx.isCommercialAdmin
  const any = (ctx: AdminContextType) => ctx.isPlatform || ctx.isOrgOwner || ctx.isTechAdmin || ctx.isCommercialAdmin

  return [
    // Overview
    { key: 'home', label: t('home'), href: '/platform', icon: '\u2302', section: 'OVERVIEW', visible: () => true },

    // Manage
    { key: 'apps', label: t('apps'), href: '/platform/apps', icon: '\u25A6', section: 'MANAGE', visible: () => true },
    { key: 'orgs', label: t('organizations'), href: '/platform/orgs', icon: '\u2616', section: 'MANAGE', visible: p },
    { key: 'users', label: t('users'), href: '/platform/users', icon: '\u263A', section: 'MANAGE', visible: p },
    { key: 'members', label: t('members'), href: '/platform/members', icon: '\u2639', section: 'MANAGE', visible: (ctx) => ctx.isPlatform || ctx.isOrgOwner || ctx.isTechAdmin || ctx.isCommercialAdmin },

    // Commerce
    { key: 'billing', label: t('billing'), href: '/platform/billing', icon: '\u2637', section: 'COMMERCE', visible: comm },
    { key: 'affiliates', label: t('affiliates'), href: '/platform/affiliates', icon: '\u2764', section: 'COMMERCE', visible: comm },
    { key: 'promotions', label: t('promotions'), href: '/platform/promotions', icon: '\u2606', section: 'COMMERCE', visible: p },
    { key: 'revenue', label: t('revenue'), href: '/platform/revenue', icon: '\u2696', section: 'COMMERCE', visible: p },

    // Links
    { key: 'links', label: t('links'), href: '/platform/links', icon: '\u2197', section: 'LINKS', visible: any },
    { key: 'analytics', label: t('analytics'), href: '/platform/analytics', icon: '\u2261', section: 'LINKS', visible: any },

    // Content
    { key: 'content-app', label: t('contentApp'), href: '/platform/content/app', icon: '\u270E', section: 'CONTENT', visible: p },
    { key: 'content-web', label: t('contentWeb'), href: '/platform/content/web', icon: '\u2318', section: 'CONTENT', visible: tech },
    { key: 'content-strings', label: t('strings'), href: '/platform/content/strings', icon: '\u2630', section: 'CONTENT', visible: p },
    { key: 'newsletter', label: t('newsletter'), href: '/platform/newsletter', icon: '\u2709', section: 'CONTENT', visible: comm },
    { key: 'contact', label: t('contact'), href: '/platform/contact', icon: '\u2706', section: 'CONTENT', visible: any },

    // AI
    { key: 'ai-config', label: t('aiConfig'), href: '/platform/ai/config', icon: '\u2699', section: 'AI', visible: tech },
    { key: 'ai-usage', label: t('aiUsage'), href: '/platform/ai/usage', icon: '\u2604', section: 'AI', visible: any },

    // Ops
    { key: 'services', label: t('services'), href: '/platform/services', icon: '\u2665', section: 'OPS', visible: tech },
    { key: 'alerts', label: t('alerts'), href: '/platform/alerts', icon: '\u26A0', section: 'OPS', visible: tech },
    { key: 'deploy', label: t('deploy'), href: '/platform/deploy', icon: '\u2191', section: 'OPS', visible: p },

    // Security
    { key: 'audit', label: t('audit'), href: '/platform/audit', icon: '\u2610', section: 'SECURITY', visible: tech },
    { key: 'compliance', label: t('compliance'), href: '/platform/compliance', icon: '\u2611', section: 'SECURITY', visible: p },

    // Settings
    { key: 'settings', label: t('settings'), href: '/platform/settings', icon: '\u2638', section: 'SETTINGS', visible: p },
    { key: 'branding', label: t('branding'), href: '/platform/branding', icon: '\u2740', section: 'SETTINGS', visible: (ctx) => ctx.isPlatform || ctx.isOrgOwner || ctx.isTechAdmin },
    { key: 'domains', label: t('domains'), href: '/platform/domains', icon: '\u2601', section: 'SETTINGS', visible: (ctx) => ctx.isPlatform || ctx.isOrgOwner || ctx.isTechAdmin },
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
        <option value="all">All Apps</option>
        <option value="shi">Sovereign Health</option>
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
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Settings
            </Link>
            <Link
              href="/settings?tab=security"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Security & MFA
            </Link>
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

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('platform.nav')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Determine role context
  const isPlatform = user?.role === 'admin'
  // TODO: read org_id/org_role from JWT when org context is active
  const orgId = null as string | null
  const orgRole = null as string | null
  const orgName = null as string | null

  const ctx: AdminContextType = {
    isPlatform,
    isOrgOwner: orgRole === 'owner',
    isTechAdmin: orgRole === 'tech_admin',
    isCommercialAdmin: orgRole === 'commercial_admin',
    orgId,
    orgName,
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?return=/platform')
    } else if (!loading && user && user.role !== 'admin' && !orgId) {
      router.push('/dashboard')
    }
  }, [loading, user, orgId, router])

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

  const appTitle = orgName ? `BrickOS Platform - ${orgName}` : 'BrickOS Platform'

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

        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-0 left-0 z-40 h-screen overflow-y-auto
          ${collapsed ? 'w-16' : 'w-60'} border-r border-zinc-800 bg-[#09090b]
          transition-all duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Header */}
          <div className="flex items-center gap-3 px-3 py-3 border-b border-zinc-800">
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

          {/* Search */}
          {!collapsed && (
            <div className="px-3 py-2 border-b border-zinc-800">
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

          {/* Nav sections */}
          <nav className="py-2 overflow-y-auto flex-1">
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
          {/* Top header with app switcher + user profile */}
          <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 sm:px-6 shrink-0">
            <nav className="flex items-center gap-1">
              {[
                { label: 'Platform', href: '/platform', active: pathname.startsWith('/platform') && !pathname.startsWith('/platform/apps') },
                { label: 'Health', href: '/sovereignhealth/', active: false },
                { label: 'Links', href: '/platform/links', active: pathname === '/platform/links' },
                { label: 'Voice', href: '/platform/apps', active: false },
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
