"use client";

import { useI18n } from "@/lib/i18n";

export default function ImpressumPage() {
  const { t } = useI18n();

  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight">{t("impressum.title")}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{t("impressum.legalNotice")}</p>

        {/* Service Provider */}
        <h2 className="mt-6 mb-3 text-xl font-bold">{t("impressum.serviceProvider.heading")}</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          {t("impressum.serviceProvider.name")}
        </p>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          {t("impressum.serviceProvider.type")}
        </p>

        {/* Contact */}
        <h2 className="mt-6 mb-3 text-xl font-bold">{t("impressum.contact.heading")}</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          {t("impressum.contact.emailLabel")}{" "}
          <a
            href="/contact"
            className="text-blue-400 underline hover:text-blue-300"
          >
            {t("impressum.contact.emailLinkText")}
          </a>
        </p>

        {/* Applicable Law */}
        <h2 className="mt-6 mb-3 text-xl font-bold">{t("impressum.applicableLaw.heading")}</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          {t("impressum.applicableLaw.text")}
        </p>

        {/* Regulatory Authority */}
        <h2 className="mt-6 mb-3 text-xl font-bold">{t("impressum.regulatoryAuthority.heading")}</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          {t("impressum.regulatoryAuthority.text")}
        </p>

        {/* Registration */}
        <h2 className="mt-6 mb-3 text-xl font-bold">{t("impressum.registration.heading")}</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          {t("impressum.registration.text")}
        </p>

        {/* EU Dispute Resolution */}
        <h2 className="mt-6 mb-3 text-xl font-bold">{t("impressum.disputeResolution.heading")}</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          {t("impressum.disputeResolution.paragraph1")}{" "}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline hover:text-blue-300"
          >
            https://ec.europa.eu/consumers/odr
          </a>
        </p>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          {t("impressum.disputeResolution.paragraph2")}
        </p>

        {/* Content Responsibility */}
        <h2 className="mt-6 mb-3 text-xl font-bold">{t("impressum.contentResponsibility.heading")}</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          {t("impressum.contentResponsibility.text")}
        </p>
      </div>
    </div>
  );
}
