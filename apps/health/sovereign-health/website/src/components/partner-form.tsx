"use client";

import { useState, type FormEvent } from "react";
import { SITE_CONFIG } from "@/lib/config";
import { useI18n } from "@/lib/i18n";

export function PartnerForm() {
  const { t } = useI18n();

  const partnerTypes = [
    t("forms.partner.partnerTypes.healthPractitioner"),
    t("forms.partner.partnerTypes.deviceManufacturer"),
    t("forms.partner.partnerTypes.contentContributor"),
    t("forms.partner.partnerTypes.affiliate"),
    t("forms.partner.partnerTypes.other"),
  ];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !type || !message.trim()) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch(`${SITE_CONFIG.apiUrl}/early-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          type,
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error(t("forms.partner.errorDefault"));
      }

      setStatus("success");
      setName("");
      setEmail("");
      setType("");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : t("forms.partner.errorDefault")
      );
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <p className="text-xl font-semibold text-[var(--accent)]">{t("forms.partner.successTitle")}</p>
        <p className="mt-2 text-[var(--muted)]">{t("forms.partner.successMessage")}</p>
      </div>
    );
  }

  const inputClasses =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-4">
      <div>
        <label htmlFor="partner-name" className="mb-1 block text-sm font-medium">
          {t("forms.partner.nameLabel")}
        </label>
        <input
          id="partner-name"
          type="text"
          required
          placeholder={t("forms.partner.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClasses}
        />
      </div>
      <div>
        <label htmlFor="partner-email" className="mb-1 block text-sm font-medium">
          {t("forms.partner.emailLabel")}
        </label>
        <input
          id="partner-email"
          type="email"
          required
          placeholder={t("forms.partner.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClasses}
        />
      </div>
      <div>
        <label htmlFor="partner-type" className="mb-1 block text-sm font-medium">
          {t("forms.partner.partnerTypeLabel")}
        </label>
        <select
          id="partner-type"
          required
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={inputClasses}
        >
          <option value="" disabled>
            {t("forms.partner.partnerTypePlaceholder")}
          </option>
          {partnerTypes.map((pt) => (
            <option key={pt} value={pt}>
              {pt}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="partner-message" className="mb-1 block text-sm font-medium">
          {t("forms.partner.messageLabel")}
        </label>
        <textarea
          id="partner-message"
          required
          rows={4}
          placeholder={t("forms.partner.messagePlaceholder")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={inputClasses}
        />
      </div>
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {status === "loading" ? t("forms.partner.submitting") : t("forms.partner.submitButton")}
      </button>
      {status === "error" && (
        <p className="text-center text-sm text-[var(--danger)]">{errorMessage}</p>
      )}
    </form>
  );
}
