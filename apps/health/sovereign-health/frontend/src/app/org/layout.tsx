'use client'

/**
 * Sprint 044: Org owner settings layout with sidebar navigation.
 * Multi-app aware -- platform-level settings + per-app settings.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { useOrg } from '@/lib/org-context'
import { useAuth } from '@/lib/auth-context'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

type NavLink = { href: string; label: string; exact?: boolean }
type NavDivider = { divider: true; label: string }
type NavItem = NavLink | NavDivider

const NAV_ITEMS: NavItem[] = [
  { href: '/org', label: 'Overview', exact: true },
  { href: '/org/general', label: 'General' },
  { href: '/org/branding', label: 'Branding' },
  { href: '/org/members', label: 'Members' },
  { href: '/org/domains', label: 'Domains' },
  { href: '/org/analytics', label: 'Analytics' },
  { href: '/org/affiliate', label: 'Affiliate' },
  { href: '/org/billing', label: 'Billing' },
  { divider: true, label: 'Apps' },
  { href: '/org/apps', label: 'App Overview', exact: true },
  { href: '/org/apps/shi/email', label: 'SHI -- Email' },
  { href: '/org/apps/shi/ai', label: 'SHI -- AI Config' },
]

function isLink(item: NavItem): item is NavLink {
  return 'href' in item
}

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const org = useOrg()
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?return=/org')
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse h-8 bg-muted rounded w-48" />
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold">
            {org.isOrg ? org.orgName : 'Organization'} Settings
          </h1>
          {org.isOrg && (
            <p className="text-sm text-muted-foreground mt-1">
              Manage your organization, members, and app configurations
            </p>
          )}
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <nav className="w-48 shrink-0 hidden md:block">
            <ul className="space-y-0.5">
              {NAV_ITEMS.map((item, i) => {
                if (!isLink(item)) {
                  return (
                    <li key={i} className="pt-4 pb-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {item.label}
                      </span>
                    </li>
                  )
                }
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block px-3 py-1.5 rounded text-sm transition-colors ${
                        isActive
                          ? 'bg-muted font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Mobile nav */}
          <div className="md:hidden w-full mb-4">
            <select
              value={pathname}
              onChange={e => router.push(e.target.value)}
              className="w-full bg-muted border rounded-lg px-3 py-2 text-sm"
            >
              {NAV_ITEMS.filter(isLink).map(item => (
                <option key={item.href} value={item.href}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}
