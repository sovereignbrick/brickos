'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/lib/theme-context'
import { getBrand } from '@/lib/brand'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/capture', label: 'Capture' },
  { href: '/contacts', label: 'Contacts' },
  { href: '/companies', label: 'Companies' },
  { href: '/projects', label: 'Projects' },
  { href: '/meetings', label: 'Meetings' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/graph', label: 'Graph' },
]

export default function NavbarClient() {
  const { user, loading, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()
  const brand = getBrand()

  // -- User menu dropdown --
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // -- Avatar initials --
  const name = user?.display_name ?? user?.email ?? ''
  const initials = name
    .split(/[\s@]+/)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('')

  // -- Tier badge colors --
  const tierColors: Record<string, string> = {
    glimpse: 'bg-zinc-600',
    core: 'bg-blue-600',
    focus: 'bg-emerald-600',
    insight: 'bg-purple-600',
    clarity: 'bg-amber-600',
    horizon: 'bg-rose-600',
  }
  const tierSlug = user?.tier || 'glimpse'

  // -- Mobile menu --
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo + app name */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src={brand.logo} alt={brand.logoAlt} width={28} height={28} className="rounded" unoptimized />
          <span className="hidden font-semibold sm:inline-block">{brand.appName}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 sm:flex">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                pathname?.startsWith(item.href)
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Search shortcut */}
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors" title="Search (Ctrl+K)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
          </button>
          <span className="hidden text-xs text-muted-foreground sm:inline">Ctrl+K</span>

          {/* Language selector */}
          <select className="bg-transparent text-sm text-muted-foreground border-none outline-none cursor-pointer" defaultValue="en">
            <option value="en">EN</option>
            <option value="de">DE</option>
          </select>

          {loading ? (
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            /* Authenticated: avatar + dropdown */
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white hover:bg-blue-500 transition-colors"
              >
                {initials}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 w-48 rounded-xl border bg-popover shadow-xl py-1 z-50">
                  {/* Header: name + tier + email */}
                  <div className="px-3 py-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{user.display_name}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${tierColors[tierSlug] || 'bg-zinc-600'}`}>
                        {tierSlug.charAt(0).toUpperCase() + tierSlug.slice(1)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>

                  {/* Menu items */}
                  <Link href="/settings" onClick={() => setMenuOpen(false)}
                    className="block w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    Settings
                  </Link>
                  <Link href="/affiliate" onClick={() => setMenuOpen(false)}
                    className="block w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    Affiliate
                  </Link>
                  {user.role === 'admin' && (
                    <Link href="/admin" onClick={() => setMenuOpen(false)}
                      className="block w-full text-left px-3 py-2 text-sm text-amber-400 hover:bg-accent hover:text-amber-300 transition-colors">
                      Admin
                    </Link>
                  )}
                  <button onClick={toggleTheme}
                    className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center gap-2">
                    {theme === 'dark' ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                      </svg>
                    )}
                    Toggle theme
                  </button>

                  <div className="border-t border-border my-1" />
                  <button onClick={() => { setMenuOpen(false); logout() }}
                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-accent hover:text-red-300 transition-colors">
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Unauthenticated */
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Log in
              </Link>
              {brand.showRegister && (
                <Link href="/signup" className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                  Sign up
                </Link>
              )}
            </div>
          )}

          {/* Mobile hamburger */}
          <button className="sm:hidden p-2 text-muted-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? <path d="M18 6 6 18M6 6l12 12"/> : <path d="M4 6h16M4 12h16M4 18h16"/>}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border sm:hidden">
          <div className="px-4 py-2 space-y-1">
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 text-sm rounded-md ${
                  pathname?.startsWith(item.href) ? 'bg-accent text-foreground' : 'text-muted-foreground'
                }`}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
