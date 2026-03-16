import type { Metadata } from "next";
import { LegalLocaleNotice } from "@/components/legal-locale-notice";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "GDPR-compliant Privacy Policy for Sovereign Health Intelligence. Learn how we protect your health data with AES-256-GCM encryption, zero-knowledge architecture, and no tracking.",
  alternates: {
    canonical: "https://sovereignhealth.io/privacy/",
  },
  openGraph: {
    title: "Privacy Policy - Sovereign Health Intelligence",
    description:
      "GDPR-compliant Privacy Policy for Sovereign Health Intelligence. Learn how we protect your health data with AES-256-GCM encryption, zero-knowledge architecture, and no tracking.",
    url: "https://sovereignhealth.io/privacy/",
  },
};

export default function PrivacyPage() {
  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <LegalLocaleNotice />
        <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Effective date: March 12, 2026
        </p>

        {/* 1. Introduction */}
        <h2 className="mt-6 mb-3 text-xl font-bold">1. Introduction</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          Sovereign Health Intelligence (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
          operates the health tracking platform at sovereignhealth.io, app.sovereignhealth.io,
          and api.sovereignhealth.io. This Privacy Policy explains what data we collect, how we
          use it, how we protect it, and what rights you have.
        </p>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          Privacy is not a feature we added. It is the foundation of this platform. We built
          Sovereign Health Intelligence from the ground up to collect the minimum data necessary
          to provide you with a useful health tracking service, and to ensure that even we
          cannot read your health data.
        </p>

        {/* 2. What We Collect */}
        <h2 className="mt-6 mb-3 text-xl font-bold">2. What We Collect</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          We collect only the data required to provide and improve the service:
        </p>
        <ul className="mb-3 list-disc space-y-2 pl-6 text-[var(--muted)]">
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Account information:</span>{" "}
            your email address, password (hashed using Argon2, never stored in plaintext),
            display name (optional), and date of birth (optional).
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Health measurements:</span>{" "}
            biomarker values and lab results that you enter into the platform. All health
            measurement values are encrypted at rest using AES-256-GCM before being stored in
            the database.
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Profile preferences:</span>{" "}
            your chosen measurement units, lifestyle settings, and default protocol (such as
            standard, fasting, keto, or carnivore).
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Device information:</span>{" "}
            the names of measurement devices you add to your account (for example, &quot;Fora
            6&quot; or &quot;Qardio Arm&quot;).
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Doctor Chat conversations:</span>{" "}
            your interactions with the AI health assistant. These are stored encrypted. Your
            name and email are never included in the data sent to AI providers.
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Payment information:</span>{" "}
            payment processing is handled entirely by Stripe (for card payments) or our
            self-hosted BTCPay Server (for Bitcoin). We do not receive, see, or store credit
            card numbers, CVVs, or other payment credentials. Stripe provides us with a
            customer identifier and subscription status only.
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Referral attribution:</span>{" "}
            if you arrive via a referral link, we record which referral code led to your signup.
            This is tied to an anonymous affiliate code, not to the referrer&apos;s personal identity.
            See the Cookies section below.
          </li>
        </ul>

        {/* 3. What We Do NOT Collect */}
        <h2 className="mt-6 mb-3 text-xl font-bold">3. What We Do NOT Collect</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          We believe the best way to protect data is to never collect it in the first place.
          Sovereign Health Intelligence does not use:
        </p>
        <ul className="mb-3 list-disc space-y-2 pl-6 text-[var(--muted)]">
          <li className="leading-relaxed">Analytics or tracking scripts (no Google Analytics, no Plausible, nothing)</li>
          <li className="leading-relaxed">Third-party advertising or ad networks</li>
          <li className="leading-relaxed">Browser fingerprinting</li>
          <li className="leading-relaxed">Location data or geolocation</li>
          <li className="leading-relaxed">Device identifiers or hardware IDs</li>
          <li className="leading-relaxed">Usage telemetry or behavioral tracking</li>
          <li className="leading-relaxed">IP address storage for affiliate tracking</li>
        </ul>

        {/* 4. Cookies */}
        <h2 className="mt-6 mb-3 text-xl font-bold">4. Cookies</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          We use a minimal number of cookies, strictly limited to what is necessary:
        </p>
        <ul className="mb-3 list-disc space-y-2 pl-6 text-[var(--muted)]">
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Session cookie:</span>{" "}
            essential, required for authentication after login. This is a first-party,
            HTTP-only, secure cookie. It is deleted when you log out or when the session expires.
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Referral cookie (<code className="text-xs bg-white/10 px-1 py-0.5 rounded">sh_ref</code>):</span>{" "}
            optional, first-party only, 30-day expiry. Set only if you arrive via a referral link.
            Used solely to attribute your signup to the referring user. Contains only the referral
            code (no personal data). Deleted after registration or after 30 days.
          </li>
        </ul>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          We do not use third-party cookies. We do not use analytics cookies. We do not use
          advertising cookies or tracking pixels.
        </p>

        {/* 5. How We Use Your Data */}
        <h2 className="mt-6 mb-3 text-xl font-bold">5. How We Use Your Data</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          We use the data you provide exclusively for the following purposes:
        </p>
        <ul className="mb-3 list-disc space-y-2 pl-6 text-[var(--muted)]">
          <li className="leading-relaxed">
            To provide the health tracking service, including storing your measurements,
            calculating trends, and displaying your data back to you.
          </li>
          <li className="leading-relaxed">
            To generate AI-powered insights through the Doctor Chat feature (see AI Processing
            section below).
          </li>
          <li className="leading-relaxed">
            To send transactional emails (account verification, password reset, service
            notifications) via our email service provider, Mailgun.
          </li>
          <li className="leading-relaxed">
            To process payments via Stripe or BTCPay Server.
          </li>
          <li className="leading-relaxed">
            To attribute referral signups to the correct affiliate code for the referral program.
          </li>
        </ul>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          We never use your data for advertising. We never sell, rent, or share your data
          with third parties for their own purposes.
        </p>

        {/* 6. AI Processing */}
        <h2 className="mt-6 mb-3 text-xl font-bold">6. AI Processing</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          The Doctor Chat feature uses Anthropic Claude, a third-party AI model, to provide
          health insights based on your data. We take the following precautions:
        </p>
        <ul className="mb-3 list-disc space-y-2 pl-6 text-[var(--muted)]">
          <li className="leading-relaxed">
            Your name, email address, and any other personally identifiable information are
            never included in requests sent to Anthropic.
          </li>
          <li className="leading-relaxed">
            Conversations use anonymized context, consisting of marker values and trends
            without identifying information.
          </li>
          <li className="leading-relaxed">
            Your health data is not used to train AI models. Anthropic does not use API
            inputs for model training.
          </li>
          <li className="leading-relaxed">
            AI processing is performed via Anthropic&apos;s API with a data processing agreement
            in place. Anthropic participates in the EU-US Data Privacy Framework (DPF).
          </li>
          <li className="leading-relaxed">
            You can delete any Doctor Chat conversation at any time from within the application.
          </li>
        </ul>

        {/* 7. Encryption */}
        <h2 className="mt-6 mb-3 text-xl font-bold">7. Encryption</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          Protecting your health data is our highest technical priority. We implement
          multiple layers of encryption:
        </p>
        <ul className="mb-3 list-disc space-y-2 pl-6 text-[var(--muted)]">
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Encryption at rest:</span>{" "}
            all health measurement values are encrypted using AES-256-GCM before being written
            to the database. The encryption key is stored separately from the database itself.
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Encryption in transit:</span>{" "}
            all communication between your browser and our servers is encrypted using TLS 1.3.
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Zero-knowledge architecture:</span>{" "}
            the system is designed so that platform administrators cannot read your health data.
            Even with full database access, your measurement values remain encrypted and
            unreadable without the separate encryption key.
          </li>
        </ul>

        {/* 8. Anonymous Data Sharing */}
        <h2 className="mt-6 mb-3 text-xl font-bold">8. Anonymous Data Sharing</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          Sovereign Health Intelligence offers an optional, opt-in feature that allows your
          anonymized marker averages to contribute to aggregated cohort comparisons. This
          feature is entirely voluntary.
        </p>
        <ul className="mb-3 list-disc space-y-2 pl-6 text-[var(--muted)]">
          <li className="leading-relaxed">
            This feature is opt-in only. It is disabled by default and must be explicitly
            enabled by you in Settings.
          </li>
          <li className="leading-relaxed">
            If you opt in, only anonymized, aggregated marker averages are used. No individual
            data points, names, or identifying information are ever shared.
          </li>
          <li className="leading-relaxed">
            Cohort comparison data is only displayed when the cohort contains a minimum of
            50 users, preventing re-identification through small group sizes.
          </li>
          <li className="leading-relaxed">
            You can opt out at any time from the Settings page.
          </li>
        </ul>

        {/* 9. Data Retention */}
        <h2 className="mt-6 mb-3 text-xl font-bold">9. Data Retention</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          We retain your data for as long as you maintain your account:
        </p>
        <ul className="mb-3 list-disc space-y-2 pl-6 text-[var(--muted)]">
          <li className="leading-relaxed">
            Your data is kept for as long as your account exists. There is no automatic
            expiration or deletion of historical data.
          </li>
          <li className="leading-relaxed">
            When you delete your account, all associated data is removed from the primary
            database within 30 days.
          </li>
          <li className="leading-relaxed">
            Encrypted backups containing your data are purged within 90 days of account
            deletion.
          </li>
          <li className="leading-relaxed">
            We do not retain any of your data after you leave the platform.
          </li>
        </ul>

        {/* 10. Your Rights Under GDPR */}
        <h2 className="mt-6 mb-3 text-xl font-bold">10. Your Rights Under GDPR</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          Under the General Data Protection Regulation (GDPR), you have the following rights
          regarding your personal data:
        </p>
        <ul className="mb-3 list-disc space-y-2 pl-6 text-[var(--muted)]">
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Right of access:</span>{" "}
            you can export all of your data at any time in JSON or CSV format directly from
            the application.
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Right to rectification:</span>{" "}
            you can edit any measurement, profile information, or other data at any time.
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Right to erasure (right to be forgotten):</span>{" "}
            you can delete your account and all associated data from the Settings page.
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Right to data portability:</span>{" "}
            you can download your data in standard, machine-readable formats (JSON, CSV).
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Right to restrict processing:</span>{" "}
            reach out via our{" "}
            <a href="/contact" className="text-blue-400 underline hover:text-blue-300">contact page</a>{" "}
            to request restriction of processing.
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Right to object:</span>{" "}
            reach out via our{" "}
            <a href="/contact" className="text-blue-400 underline hover:text-blue-300">contact page</a>{" "}
            to object to specific processing activities.
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Right to withdraw consent:</span>{" "}
            you can opt out of anonymous data sharing at any time from Settings, and you can
            delete your account at any time.
          </li>
        </ul>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          To exercise any of these rights, you can use the built-in tools in the application
          (Settings page) or via our{" "}
          <a href="/contact" className="text-blue-400 underline hover:text-blue-300">contact page</a>.
        </p>

        {/* 11. Sub-processors */}
        <h2 className="mt-6 mb-3 text-xl font-bold">11. Sub-processors</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          We use the following sub-processors to operate the service:
        </p>
        <ul className="mb-3 list-disc space-y-2 pl-6 text-[var(--muted)]">
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Hostinger</span> (EU data
            center, Lithuania): server hosting and infrastructure.
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Anthropic</span> (United States):
            AI model provider (Claude) for the Doctor Chat feature. Only anonymized queries are sent. No
            personally identifiable information is included. Anthropic participates in the EU-US Data
            Privacy Framework (DPF).
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Mailgun</span> (United States):
            email service provider for transactional emails (account verification, password reset,
            notifications). Email addresses are shared with Mailgun solely for delivery purposes.
            Mailgun does not use your email address for any other purpose. See{" "}
            <a
              href="https://www.mailgun.com/legal/privacy-policy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline hover:text-blue-300"
            >
              Mailgun&apos;s Privacy Policy
            </a>.
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Stripe</span> (United States):
            payment processing for credit/debit card subscriptions. Stripe receives your card details
            directly and provides us with only a customer identifier and subscription status. See{" "}
            <a
              href="https://stripe.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline hover:text-blue-300"
            >
              Stripe&apos;s Privacy Policy
            </a>.
          </li>
        </ul>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          We do not use CDNs, third-party analytics, advertising networks, or customer data
          platforms.
        </p>

        {/* 12. International Transfers */}
        <h2 className="mt-6 mb-3 text-xl font-bold">12. International Transfers</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          All primary data, including your account information, health measurements, and
          encrypted backups, is stored in the European Union (Hostinger data center in
          Lithuania).
        </p>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          AI queries sent to Anthropic (United States) contain no personally identifiable
          information. Anthropic participates in the EU-US Data Privacy Framework (DPF),
          providing an adequate level of data protection as recognized by the European
          Commission. Mailgun and Stripe also participate in the EU-US DPF.
        </p>

        {/* 13. Age Restriction */}
        <h2 className="mt-6 mb-3 text-xl font-bold">13. Age Restriction</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          Our services are intended for individuals aged 18 and older. We do not knowingly
          collect data from individuals under 18. If we become aware that we have collected
          data from someone under 18, we will delete their account and associated data promptly.
        </p>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          During registration, users are required to confirm that they are at least 18 years
          old by checking a mandatory age confirmation checkbox.
        </p>

        {/* 14. Legal Basis */}
        <h2 className="mt-6 mb-3 text-xl font-bold">14. Legal Basis</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          Our processing of your personal data is governed by the Austrian Data Protection
          Act (DSG) and the EU General Data Protection Regulation (GDPR). We process your
          data on the following legal bases:
        </p>
        <ul className="mb-3 list-disc space-y-2 pl-6 text-[var(--muted)]">
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Consent</span> (Article 6(1)(a) GDPR):
            you consent to the processing of your data when you create an account.
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Contract performance</span> (Article 6(1)(b) GDPR):
            processing is necessary to provide you with the health tracking service you have
            requested.
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Legitimate interest</span> (Article 6(1)(f) GDPR):
            processing for security purposes, such as detecting unauthorized access and
            protecting the integrity of the platform.
          </li>
        </ul>

        {/* 15. Changes */}
        <h2 className="mt-6 mb-3 text-xl font-bold">15. Changes to This Policy</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          We may update this Privacy Policy from time to time. Material changes that
          significantly affect how we handle your data will be communicated to you via email
          at the address associated with your account at least 14 days before they take effect.
        </p>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          Minor changes, such as clarifications or formatting updates that do not affect
          your rights, take effect immediately upon posting.
        </p>

        {/* 16. Contact */}
        <h2 className="mt-6 mb-3 text-xl font-bold">16. Contact</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          For privacy-related inquiries, data access requests, or to exercise any of your
          GDPR rights, please reach out via our{" "}
          <a
            href="/contact"
            className="text-blue-400 underline hover:text-blue-300"
          >
            contact page
          </a>
        </p>
      </div>
    </div>
  );
}
