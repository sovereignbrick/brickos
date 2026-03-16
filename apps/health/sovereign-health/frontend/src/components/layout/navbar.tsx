'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { usePathname, useRouter } from 'next/navigation'
import { DemoBanner } from '@/components/demo-banner'
import { useDemoHref } from '@/lib/use-demo-href'
import { APP_NAME, IS_OSS } from '@/lib/mode'
import { api } from '@/lib/api'
import { useTranslations } from 'next-intl'
import { useContent } from '@/lib/content-context'
import { locales, localeNames, type Locale } from '@/i18n/config'

type NavItem = { href: string; labelKey: string }

const NAV: NavItem[] = [
  { href: '/dashboard', labelKey: 'overview' },
  { href: '/doctor-chat', labelKey: 'doctorChat' },
  { href: '/measurements/new', labelKey: 'addMeasurement' },
  { href: '/measurements', labelKey: 'history' },
  { href: '/trends', labelKey: 'trends' },
]

const DEMO_NAV: NavItem[] = [
  { href: '/dashboard', labelKey: 'overview' },
  { href: '/doctor-chat', labelKey: 'doctorChat' },
  { href: '/measurements', labelKey: 'history' },
  { href: '/trends', labelKey: 'trends' },
]

function UserMenu({ user, logout }: { user: { email: string; display_name: string | null; tier?: string; role?: string } | null; logout: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const t = useTranslations('nav')
  const tTiers = useTranslations('tiers')

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const name = user?.display_name ?? user?.email ?? ''
  const initials = name
    .split(/[\s@]+/)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('')

  const tierSlug = user?.tier || 'glimpse'
  const tierColors: Record<string, string> = {
    glimpse: 'bg-zinc-600', core: 'bg-blue-600', focus: 'bg-emerald-600',
    insight: 'bg-purple-600', clarity: 'bg-amber-600', horizon: 'bg-rose-600',
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        title={user?.email ?? ''}
        className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white hover:bg-blue-500 transition-colors"
      >
        {initials || '?'}
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-48 rounded-xl border bg-zinc-900 shadow-xl py-1 z-50">
          <div className="px-3 py-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{user?.display_name ?? 'User'}</p>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${tierColors[tierSlug] || 'bg-zinc-600'}`}>
                {tTiers.has(tierSlug) ? tTiers(tierSlug as 'glimpse') : tierSlug}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
          >
            {t('settings')}
          </Link>
          <Link
            href="/affiliate"
            onClick={() => setOpen(false)}
            className="block w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
          >
            {t('affiliate')}
          </Link>
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="block w-full text-left px-3 py-2 text-sm text-amber-400 hover:bg-white/5 hover:text-amber-300 transition-colors"
            >
              {t('admin')}
            </Link>
          )}
          <div className="border-t border-zinc-800 my-1" />
          <button
            onClick={() => { setOpen(false); logout() }}
            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/5 hover:text-red-300 transition-colors"
          >
            {t('signOut')}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Mobile hamburger menu (slide-in from right) ──────────────────────────────

function MobileMenu({
  navItems,
  isDemo,
  isDemoOnly,
  demoHref,
  pathname,
  user,
  logout,
}: {
  navItems: NavItem[]
  isDemo: boolean
  isDemoOnly: boolean
  demoHref: (path: string) => string
  pathname: string
  user: { email: string; display_name: string | null; tier?: string; role?: string } | null
  logout: () => void
}) {
  const t = useTranslations('nav')
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { setMounted(true) }, [])

  // Focus trap: when menu opens, focus the close button
  useEffect(() => {
    if (open) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
      // Focus first focusable element in menu
      const timer = setTimeout(() => {
        const firstFocusable = menuRef.current?.querySelector('button, a') as HTMLElement | null
        firstFocusable?.focus()
      }, 100)
      return () => {
        clearTimeout(timer)
        document.body.style.overflow = ''
      }
    } else {
      document.body.style.overflow = ''
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  // Focus trap within menu
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !menuRef.current) return
    const focusable = menuRef.current.querySelectorAll<HTMLElement>('a, button')
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }, [])

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(true)}
        className="sm:hidden flex items-center justify-center w-10 h-10 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={t('openNavMenu')}
        aria-expanded={open}
        aria-controls="mobile-nav-menu"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Portal: render backdrop + panel at document.body to escape backdrop-blur containing block */}
      {mounted && createPortal(
        <>
          {/* Backdrop */}
          {open && (
            <div
              className="fixed inset-0 bg-black/60 z-[60] sm:hidden animate-fade-in"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Slide-in menu panel */}
          <div
            ref={menuRef}
            id="mobile-nav-menu"
            role="dialog"
            aria-modal="true"
            aria-label={t('navMenuLabel')}
            onKeyDown={handleKeyDown}
            className={`fixed top-0 right-0 bottom-0 w-72 max-w-[85vw] bg-zinc-900 border-l border-zinc-800 z-[70] sm:hidden transition-transform duration-300 ease-in-out ${
              open ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-800">
              <span className="text-sm font-semibold">{t('menu')}</span>
              <button
                onClick={() => setOpen(false)}
                className="flex items-center justify-center w-10 h-10 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={t('closeNavMenu')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Nav items */}
            <nav className="px-2 py-3 space-y-1">
              {navItems.map(({ href, labelKey }) => (
                <Link
                  key={href}
                  href={isDemo ? demoHref(href) : href}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith(href)
                      ? 'bg-white/10 text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  {t(labelKey)}
                </Link>
              ))}
              {!isDemo && (
                <>
                  <Link
                    href="/affiliate"
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      pathname.startsWith('/affiliate')
                        ? 'bg-white/10 text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    }`}
                  >
                    {t('affiliate')}
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      pathname.startsWith('/settings')
                        ? 'bg-white/10 text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    }`}
                  >
                    {t('settings')}
                  </Link>
                </>
              )}
            </nav>

            {/* User info & actions */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-800 px-4 py-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
              {isDemo ? (
                !isDemoOnly && (
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="block w-full text-center bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-3 rounded-lg transition-colors"
                  >
                    {t('logIn')}
                  </Link>
                )
              ) : user ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium truncate">{user.display_name ?? 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => { setOpen(false); logout() }}
                    className="w-full text-left text-sm text-red-400 hover:text-red-300 transition-colors py-2"
                  >
                    {t('signOut')}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}

export function Navbar() {
  const { user, logout, isDemo, isDemoOnly } = useAuth()
  const pathname = usePathname()
  const demoHref = useDemoHref()
  const router = useRouter()
  const t = useTranslations('nav')
  const tCommon = useTranslations('common')
  const { locale: contentLocale, setLocale: setContentLocale } = useContent()
  const [registrationEnabled, setRegistrationEnabled] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user && !isDemo) {
      api.auth.registrationStatus().then(res => {
        if (res.data?.enabled) setRegistrationEnabled(true)
      }).catch(() => {})
    }
  }, [user, isDemo])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLocaleSwitch = (newLocale: string) => {
    setContentLocale(newLocale)
    setLangOpen(false)
    // Save to backend if logged in
    if (user) {
      api.settings.updateProfile({ locale: newLocale }).catch(() => {})
    }
    // Reload to pick up new next-intl messages from server
    router.refresh()
  }

  const languageSelector = (
    <div className="relative" ref={langRef}>
      <button
        onClick={() => setLangOpen(o => !o)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
        aria-label={tCommon('changeLanguage')}
      >
        {contentLocale.toUpperCase()}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {langOpen && (
        <div className="absolute right-0 top-8 w-32 rounded-xl border bg-zinc-900 shadow-xl py-1 z-50">
          {locales.map(loc => (
            <button
              key={loc}
              onClick={() => handleLocaleSwitch(loc)}
              className={`block w-full text-left px-3 py-2 text-sm transition-colors ${
                contentLocale === loc
                  ? 'text-foreground bg-white/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              {localeNames[loc]}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  if (!user && !isDemo) {
    return (
      <nav className="border-b bg-background/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-sm tracking-tight">
            <Image src="/logo.png" alt="SHI" width={28} height={28} className="rounded-sm" />
            <span className="hidden lg:inline">{APP_NAME}</span>
            <span className="lg:hidden">Sovereign Health</span>
          </Link>
          <div className="flex items-center gap-2">
            {languageSelector}
            <Link
              href="/login"
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              {t('logIn')}
            </Link>
            {registrationEnabled && (
              <Link
                href="/signup"
                className="text-xs border border-blue-600 text-blue-400 hover:bg-blue-600/10 px-3 py-1.5 rounded-lg transition-colors"
              >
                {t('register')}
              </Link>
            )}
          </div>
        </div>
      </nav>
    )
  }

  const navItems = isDemo ? DEMO_NAV : NAV

  return (
    <div className="sticky top-0 z-50">
      <DemoBanner />
      <nav className="border-b bg-background/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={isDemo ? demoHref('/dashboard') : '/dashboard'} className="flex items-center gap-2 font-bold text-sm tracking-tight">
          <Image src="/logo.png" alt="SHI" width={28} height={28} className="rounded-sm" />
          <span className="hidden lg:inline">{APP_NAME}</span>
          <span className="lg:hidden">Sovereign Health</span>
        </Link>
        <div className="hidden sm:flex items-center gap-1">
          {navItems.map(({ href, labelKey }) => (
            <Link
              key={href}
              href={isDemo ? demoHref(href) : href}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                pathname.startsWith(href)
                  ? 'bg-white/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              {t(labelKey)}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {languageSelector}
          {isDemo ? (
            isDemoOnly ? (
              <div className="hidden sm:block w-8" />
            ) : (
              <Link
                href="/login"
                className="hidden sm:inline-flex text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                {t('login')}
              </Link>
            )
          ) : (
            <div className="hidden sm:block">
              <UserMenu user={user} logout={logout} />
            </div>
          )}
          <MobileMenu
            navItems={navItems}
            isDemo={isDemo}
            isDemoOnly={isDemoOnly}
            demoHref={demoHref}
            pathname={pathname}
            user={user}
            logout={logout}
          />
        </div>
      </div>
      </nav>
    </div>
  )
}
