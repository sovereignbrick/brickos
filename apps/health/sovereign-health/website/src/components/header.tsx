"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { SITE_CONFIG } from "@/lib/config";
import { useI18n, locales, localeNames } from "@/lib/i18n";

type NavLink = { href: string; labelKey: string };

const navLinks: NavLink[] = [
  { href: "/features/", labelKey: "nav.features" },
  { href: "/pricing/", labelKey: "nav.pricing" },
  { href: "/health-zones/", labelKey: "nav.healthZones" },
  { href: "/markers/", labelKey: "nav.markers" },
];

function LanguageSelector() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { locale, setLocale } = useI18n();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted hover:text-foreground hover:bg-white/5 transition-colors"
        aria-label="Change language"
      >
        {locale.toUpperCase()}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-8 w-32 rounded-xl border border-border bg-zinc-900 shadow-xl py-1 z-50">
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => {
                setLocale(loc);
                setOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 text-sm transition-colors ${
                locale === loc
                  ? "text-foreground bg-white/5"
                  : "text-muted hover:text-foreground hover:bg-white/5"
              }`}
            >
              {localeNames[loc]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useI18n();

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Image
            src="/logo.png"
            alt="SHI"
            width={28}
            height={28}
            className="rounded-sm"
          />
          <span className="text-sm sm:text-lg">{t("nav.brandFull")}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                pathname?.startsWith(link.href.replace(/\/$/, ""))
                  ? "bg-white/10 text-foreground"
                  : "text-muted hover:text-foreground hover:bg-white/5"
              }`}
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <LanguageSelector />
          <a
            href={SITE_CONFIG.appUrl}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            {t("nav.tryTheApp")}
          </a>
        </div>

        {/* Mobile: language + menu button */}
        <div className="flex lg:hidden items-center gap-1">
          <LanguageSelector />
          <button
            className="p-2 text-muted hover:text-foreground"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={t("nav.toggleMenu")}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

    </header>

      {/* Mobile nav overlay  - rendered outside <header> to avoid backdrop-filter containing block issue */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[60] lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <nav
        className={`fixed top-0 right-0 bottom-0 w-72 max-w-[85vw] bg-zinc-950 border-l border-zinc-800 z-[70] lg:hidden transition-transform duration-300 ease-in-out ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-zinc-800">
          <span className="text-sm font-semibold text-foreground">
            {t("nav.menu")}
          </span>
          <button
            onClick={() => setMenuOpen(false)}
            className="flex items-center justify-center w-10 h-10 -mr-2 text-muted hover:text-foreground transition-colors"
            aria-label="Close menu"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <div className="px-2 py-3 space-y-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 10rem)" }}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                pathname?.startsWith(link.href.replace(/\/$/, ""))
                  ? "bg-white/10 text-foreground"
                  : "text-muted hover:text-foreground hover:bg-white/5"
              }`}
              onClick={() => setMenuOpen(false)}
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </div>

        {/* CTA at bottom */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-800 px-4 py-4">
          <a
            href={SITE_CONFIG.appUrl}
            className="block rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-blue-500 transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            {t("nav.tryTheApp")}
          </a>
        </div>
      </nav>
    </>
  );
}
