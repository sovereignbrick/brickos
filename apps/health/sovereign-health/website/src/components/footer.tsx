"use client";

import Link from "next/link";
import { SITE_CONFIG } from "@/lib/config";
import { useI18n } from "@/lib/i18n";

type FooterLink = { href: string; labelKey: string; external?: boolean };
type FooterSection = { titleKey: string; links: FooterLink[] };

const footerSections: FooterSection[] = [
  {
    titleKey: "footer.sections.product.title",
    links: [
      { href: "/features/", labelKey: "footer.sections.product.features" },
      { href: "/pricing/", labelKey: "footer.sections.product.pricing" },
      { href: "/health-zones/", labelKey: "footer.sections.product.healthZones" },
      { href: "/markers/", labelKey: "footer.sections.product.markers" },
    ],
  },
  {
    titleKey: "footer.sections.company.title",
    links: [
      { href: "/about/", labelKey: "footer.sections.company.about" },
      { href: "/partners/", labelKey: "footer.sections.company.partners" },
      { href: "/contact/", labelKey: "footer.sections.company.contact" },
      { href: "/open-source/", labelKey: "footer.sections.company.openSource" },
    ],
  },
  {
    titleKey: "footer.sections.resources.title",
    links: [
      { href: "/security/", labelKey: "footer.sections.resources.security" },
      { href: "/referral-program/", labelKey: "footer.sections.resources.referralProgram" },
      { href: SITE_CONFIG.githubUrl, labelKey: "footer.sections.resources.github", external: true },
    ],
  },
  {
    titleKey: "footer.sections.legal.title",
    links: [
      { href: "/terms/", labelKey: "footer.sections.legal.termsOfService" },
      { href: "/privacy/", labelKey: "footer.sections.legal.privacyPolicy" },
      { href: "/impressum/", labelKey: "footer.sections.legal.impressum" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();
  const { t } = useI18n();

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {footerSections.map((section) => (
            <div key={section.titleKey}>
              <h3 className="text-sm font-semibold text-foreground">
                {t(section.titleKey)}
              </h3>
              <ul className="mt-3 space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted hover:text-foreground transition-colors inline-flex items-center gap-1"
                      >
                        {t(link.labelKey)}
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-muted hover:text-foreground transition-colors"
                      >
                        {t(link.labelKey)}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-border pt-8 text-center">
          <p className="text-sm text-muted">
            {t("footer.copyright", { year: String(year) })}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted">
            <Link href="/terms/" className="hover:text-foreground transition-colors">
              {t("footer.sections.legal.termsOfService")}
            </Link>
            <span>|</span>
            <Link href="/privacy/" className="hover:text-foreground transition-colors">
              {t("footer.sections.legal.privacyPolicy")}
            </Link>
            <span>|</span>
            <Link href="/impressum/" className="hover:text-foreground transition-colors">
              {t("footer.sections.legal.impressum")}
            </Link>
            <span>|</span>
            <a
              href={SITE_CONFIG.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <span>|</span>
            <a
              href={`${SITE_CONFIG.appUrl}/donate`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-colors"
              style={{ color: '#f7931a' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffab40')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#f7931a')}
            >
              &#8383; {t("footer.donateTitle")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
