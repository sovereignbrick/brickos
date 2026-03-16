"use client";

import { useI18n } from "@/lib/i18n";

/**
 * Shows a notice in the user's language when viewing legal pages (Terms, Privacy)
 * that are only available in English. This is a common practice for legal documents
 * to maintain legal validity in their original language.
 */
export function LegalLocaleNotice() {
  const { locale } = useI18n();

  if (locale === "en") return null;

  if (locale === "de") {
    return (
      <div className="mb-6 rounded-lg border border-amber-800/40 bg-amber-950/20 px-4 py-3">
        <p className="text-sm text-amber-200/80">
          <span className="font-medium">Hinweis:</span>{" "}
          Dieses Rechtsdokument ist nur auf Englisch verfugbar, um die rechtliche Gultigkeit zu gewahrleisten. Bei Fragen nutzen Sie bitte unser{" "}
          <a href="/contact?lang=de" className="text-amber-300 underline hover:text-amber-200">
            Kontaktformular
          </a>.
        </p>
      </div>
    );
  }

  return null;
}
