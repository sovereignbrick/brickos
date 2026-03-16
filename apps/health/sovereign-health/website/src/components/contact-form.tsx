"use client";

import { useState, type FormEvent } from "react";
import { SITE_CONFIG } from "@/lib/config";
import { useI18n } from "@/lib/i18n";

export function ContactForm() {
  const { t } = useI18n();

  const subjects = [
    t("forms.contact.subjects.generalInquiry"),
    t("forms.contact.subjects.bugReport"),
    t("forms.contact.subjects.featureRequest"),
    t("forms.contact.subjects.partnership"),
    t("forms.contact.subjects.securityIssue"),
    t("forms.contact.subjects.other"),
  ];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject || !message.trim()) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch(`${SITE_CONFIG.apiUrl}/early-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject,
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error(t("forms.contact.errorDefault"));
      }

      setStatus("success");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : t("forms.contact.errorDefault")
      );
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <p className="text-xl font-semibold text-[var(--accent)]">{t("forms.contact.successTitle")}</p>
        <p className="mt-2 text-[var(--muted)]">{t("forms.contact.successMessage")}</p>
      </div>
    );
  }

  const inputClasses =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-4">
      <div>
        <label htmlFor="contact-name" className="mb-1 block text-sm font-medium">
          {t("forms.contact.nameLabel")}
        </label>
        <input
          id="contact-name"
          type="text"
          required
          placeholder={t("forms.contact.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClasses}
        />
      </div>
      <div>
        <label htmlFor="contact-email" className="mb-1 block text-sm font-medium">
          {t("forms.contact.emailLabel")}
        </label>
        <input
          id="contact-email"
          type="email"
          required
          placeholder={t("forms.contact.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClasses}
        />
      </div>
      <div>
        <label htmlFor="contact-subject" className="mb-1 block text-sm font-medium">
          {t("forms.contact.subjectLabel")}
        </label>
        <select
          id="contact-subject"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={inputClasses}
        >
          <option value="" disabled>
            {t("forms.contact.subjectPlaceholder")}
          </option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-1 block text-sm font-medium">
          {t("forms.contact.messageLabel")}
        </label>
        <textarea
          id="contact-message"
          required
          rows={4}
          placeholder={t("forms.contact.messagePlaceholder")}
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
        {status === "loading" ? t("forms.contact.sending") : t("forms.contact.submitButton")}
      </button>
      {status === "error" && (
        <p className="text-center text-sm text-[var(--danger)]">{errorMessage}</p>
      )}
    </form>
  );
}
