'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from 'next-intl'
import { AdminContext } from './admin-context'
import type { AdminContextType } from './admin-context'

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
    { key: 'home', label: t('home'), href: '/platform', icon: '\u25C9', section: 'OVERVIEW', visible: () => true },

    // Manage
    { key: 'apps', label: t('apps'), href: '/platform/apps', icon: '\u25A3', section: 'MANAGE', visible: () => true },
    { key: 'orgs', label: t('organizations'), href: '/platform/orgs', icon: '\u25A3', section: 'MANAGE', visible: p },
    { key: 'users', label: t('users'), href: '/platform/users', icon: '\u25A3', section: 'MANAGE', visible: p },
    { key: 'members', label: t('members'), href: '/platform/members', icon: '\u25A3', section: 'MANAGE', visible: o },

    // Commerce
    { key: 'billing', label: t('billing'), href: '/platform/billing', icon: '\u25A3', section: 'COMMERCE', visible: comm },
    { key: 'affiliates', label: t('affiliates'), href: '/platform/affiliates', icon: '\u25A3', section: 'COMMERCE', visible: comm },
    { key: 'promotions', label: t('promotions'), href: '/platform/promotions', icon: '\u25A3', section: 'COMMERCE', visible: p },
    { key: 'revenue', label: t('revenue'), href: '/platform/revenue', icon: '\u25A3', section: 'COMMERCE', visible: p },

    // Links
    { key: 'links', label: t('links'), href: '/platform/links', icon: '\u25A3', section: 'LINKS', visible: any },
    { key: 'analytics', label: t('analytics'), href: '/platform/analytics', icon: '\u25A3', section: 'LINKS', visible: any },

    // Content
    { key: 'content-app', label: t('contentApp'), href: '/platform/content/app', icon: '\u25A3', section: 'CONTENT', visible: p },
    { key: 'content-web', label: t('contentWeb'), href: '/platform/content/web', icon: '\u25A3', section: 'CONTENT', visible: tech },
    { key: 'content-strings', label: t('strings'), href: '/platform/content/strings', icon: '\u25A3', section: 'CONTENT', visible: p },
    { key: 'newsletter', label: t('newsletter'), href: '/platform/newsletter', icon: '\u25A3', section: 'CONTENT', visible: comm },
    { key: 'contact', label: t('contact'), href: '/platform/contact', icon: '\u25A3', section: 'CONTENT', visible: any },

    // AI
    { key: 'ai-config', label: t('aiConfig'), href: '/platform/ai/config', icon: '\u25A3', section: 'AI', visible: tech },
    { key: 'ai-usage', label: t('aiUsage'), href: '/platform/ai/usage', icon: '\u25A3', section: 'AI', visible: any },

    // Ops
    { key: 'services', label: t('services'), href: '/platform/services', icon: '\u25A3', section: 'OPS', visible: tech },
    { key: 'alerts', label: t('alerts'), href: '/platform/alerts', icon: '\u25A3', section: 'OPS', visible: tech },
    { key: 'deploy', label: t('deploy'), href: '/platform/deploy', icon: '\u25A3', section: 'OPS', visible: p },

    // Security
    { key: 'audit', label: t('audit'), href: '/platform/audit', icon: '\u25A3', section: 'SECURITY', visible: tech },
    { key: 'compliance', label: t('compliance'), href: '/platform/compliance', icon: '\u25A3', section: 'SECURITY', visible: p },

    // Settings
    { key: 'settings', label: t('settings'), href: '/platform/settings', icon: '\u25A3', section: 'SETTINGS', visible: p },
    { key: 'branding', label: t('branding'), href: '/platform/branding', icon: '\u25A3', section: 'SETTINGS', visible: (ctx) => ctx.isOrgOwner || ctx.isTechAdmin },
    { key: 'domains', label: t('domains'), href: '/platform/domains', icon: '\u25A3', section: 'SETTINGS', visible: (ctx) => ctx.isOrgOwner || ctx.isTechAdmin },
    { key: 'licensing', label: t('licensing'), href: '/platform/licensing', icon: '\u25A3', section: 'SETTINGS', visible: p },
  ]
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

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
      router.push('/login?redirect=/platform')
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
          <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              B
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{appTitle}</p>
              </div>
            )}
          </div>

          {/* Nav sections */}
          <nav className="py-2">
            {Object.entries(sections).map(([section, items]) => (
              <div key={section}>
                {!collapsed && (
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-4 pt-4 pb-1">
                    {section}
                  </p>
                )}
                {items.map(item => {
                  const isActive = pathname === item.href || (item.href !== '/platform' && pathname.startsWith(item.href + '/'))
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
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

          {/* Collapse toggle */}
          <div className="hidden lg:block absolute bottom-4 left-0 right-0 px-2">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center py-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors text-xs"
            >
              {collapsed ? '\u25B6' : '\u25C0'}
            </button>
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </AdminContext.Provider>
  )
}
