"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { SITE_CONFIG } from "@/lib/config";

const SUBJECT_KEYS = [
  "general",
  "support",
  "partnership",
  "bug",
  "feature",
  "security",
  "billing",
  "gdpr",
] as const;

export default function ContactPage() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch(`${SITE_CONFIG.apiUrl}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const data = await res.json();

      if (res.ok && !data.error) {
        setStatus("success");
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
      } else if (res.status === 429) {
        setStatus("error");
        setErrorMsg(t("contact.form.errorRateLimit"));
      } else {
        setStatus("error");
        setErrorMsg(data.error?.message || t("contact.form.errorGeneric"));
      }
    } catch {
      setStatus("error");
      setErrorMsg(t("contact.form.errorGeneric"));
    }
  };

  return (
    <div className="px-6 py-14">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-center">
          {t("contact.hero.title")}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-lg font-medium text-[var(--zone-immune)]">
          {t("contact.hero.tagline")}
        </p>

        {/* Contact Form */}
        <div className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
          {status === "success" ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-medium text-green-400">
                {t("contact.form.success")}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium">
                  {t("contact.form.name")}
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  maxLength={200}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none transition-colors focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium">
                  {t("contact.form.email")}
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  maxLength={320}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none transition-colors focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label htmlFor="contact-subject" className="mb-1.5 block text-sm font-medium">
                  {t("contact.form.subject")}
                </label>
                <select
                  id="contact-subject"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none transition-colors focus:border-[var(--accent)]"
                >
                  <option value="" disabled>
                    --
                  </option>
                  {SUBJECT_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {t(`contact.form.subjects.${key}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium">
                  {t("contact.form.message")}
                </label>
                <textarea
                  id="contact-message"
                  required
                  maxLength={5000}
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("contact.form.messagePlaceholder")}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none transition-colors focus:border-[var(--accent)] resize-y"
                />
              </div>

              {status === "error" && errorMsg && (
                <p className="text-sm text-red-400">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "sending" ? t("contact.form.sending") : t("contact.form.submit")}
              </button>
            </form>
          )}
        </div>

        {/* Direct Contact */}
        <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-semibold">{t("contact.directContact.title")}</h2>
          <div className="mt-4 space-y-3">
            <p className="text-sm text-[var(--muted)]">
              {t("contact.directContact.githubLabel")}{" "}
              <a
                href={SITE_CONFIG.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] underline transition-colors hover:text-[var(--accent-hover)]"
              >
                GitHub
              </a>
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {t("contact.directContact.responseTime")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
