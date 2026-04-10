import type { Metadata } from "next";
import { LegalLocaleNotice } from "@/components/legal-locale-notice";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Sovereign Health Intelligence. Read about account requirements, medical disclaimer, data ownership, subscriptions, payments, refunds, and acceptable use.",
  alternates: {
    canonical: "https://sovereignhealth.io/terms/",
  },
  openGraph: {
    title: "Terms of Service - Sovereign Health Intelligence",
    description:
      "Terms of Service for Sovereign Health Intelligence. Read about account requirements, medical disclaimer, data ownership, subscriptions, payments, refunds, and acceptable use.",
    url: "https://sovereignhealth.io/terms/",
  },
};

export default function TermsPage() {
  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <LegalLocaleNotice />
        <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Effective date: March 12, 2026
        </p>

        {/* 1. Introduction */}
        <h2 className="mt-6 mb-3 text-xl font-bold">1. Introduction</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          These Terms of Service govern your use of the Sovereign Health Intelligence platform,
          including the web application at app.sovereignhealth.io and the API at api.sovereignhealth.io.
          By creating an account or using the service, you agree to these terms.
        </p>

        {/* 2. Medical Disclaimer */}
        <h2 className="mt-6 mb-3 text-xl font-bold">2. Medical Disclaimer</h2>
        <div className="mb-3 rounded-lg border border-yellow-600/30 bg-yellow-600/5 p-4">
          <p className="leading-relaxed text-[var(--foreground)] font-medium">
            Sovereign Health Intelligence is a health data tracking and analysis platform. We do not
            provide medical advice, diagnosis, or treatment. The information provided by our platform,
            including AI-assisted analysis (Dr. Alex), is for informational purposes only and should not
            be used as a substitute for professional medical advice. Always consult a qualified
            healthcare professional before making decisions about your health.
          </p>
        </div>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          The platform is not a medical device and is not certified, approved, or cleared by any
          regulatory authority for medical use. Reference ranges, traffic light indicators,
          AI-generated insights, food recommendations, and supplement guidance are provided for
          educational purposes only. We do not guarantee the medical accuracy, completeness, or
          reliability of any information provided through the platform.
        </p>

        {/* 3. Age Requirement */}
        <h2 className="mt-6 mb-3 text-xl font-bold">3. Age Requirement</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          You must be at least 18 years of age to use this service. By creating an account, you
          confirm that you are 18 or older. If we become aware that a user is under 18, we will
          take steps to delete their account and associated data.
        </p>

        {/* 4. Account */}
        <h2 className="mt-6 mb-3 text-xl font-bold">4. Account</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          You are responsible for maintaining the confidentiality of your login credentials,
          including your password and any two-factor authentication methods. You are responsible
          for all activity that occurs under your account. If you suspect unauthorized access,
          you must notify us immediately via our{" "}
          <a
            href="/contact"
            className="text-blue-400 underline hover:text-blue-300"
          >
            contact page
          </a>
          .
        </p>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          Each person may maintain only one account. Creating multiple accounts to circumvent
          tier limits, abuse free tier quotas, or for any other purpose is prohibited and may
          result in termination of all associated accounts.
        </p>

        {/* 5. Data Ownership and Privacy */}
        <h2 className="mt-6 mb-3 text-xl font-bold">5. Data Ownership and Privacy</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          You own your health data. Sovereign Health Intelligence does not claim ownership of
          any data you submit to the platform. We process your data solely on your behalf and
          in accordance with our{" "}
          <a href="/privacy/" className="text-blue-400 underline hover:text-blue-300">
            Privacy Policy
          </a>
          .
        </p>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          You may export your data at any time in JSON or CSV format. You may generate PDF health
          reports for sharing with your doctor. You may also delete your data, including your
          entire account, at any time from the Settings page. Upon account deletion, all
          associated data will be removed from the primary database within 30 days, and encrypted
          backups will be purged within 90 days.
        </p>

        {/* 6. AI Usage (Dr. Alex & Health Coach) */}
        <h2 className="mt-6 mb-3 text-xl font-bold">6. AI Usage (Dr. Alex & Health Coach)</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          Dr. Alex is a context-sensitive AI health expert available within the application
          that provides personalized health insights based on your data. Health Coach is a
          general-purpose AI assistant available on the homepage for product questions and
          general health education. The following applies to all AI-generated content:
        </p>
        <ul className="mb-3 list-disc space-y-2 pl-6 text-[var(--muted)]">
          <li className="leading-relaxed">
            AI outputs are informational, not diagnostic. They do not constitute medical advice
            and should not be used as a substitute for professional medical consultation.
          </li>
          <li className="leading-relaxed">
            We do not guarantee the accuracy, completeness, or reliability of AI-generated content.
          </li>
          <li className="leading-relaxed">
            AI queries are sent to Anthropic (Claude) with anonymized context only. Your name,
            email, and other personally identifiable information are never included.
          </li>
          <li className="leading-relaxed">
            Your health data is not used to train AI models. AI processing is performed solely to
            generate insights for your personal use.
          </li>
        </ul>

        {/* 7. Subscriptions and Tiers */}
        <h2 className="mt-6 mb-3 text-xl font-bold">7. Subscriptions and Tiers</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          Sovereign Health Intelligence offers a free tier (Glimpse) that is available
          indefinitely with no time limit. The free tier includes core tracking functionality
          with certain usage limits.
        </p>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          Paid subscription tiers (Focus, Insight, Clarity, and Horizon) provide additional
          features, higher quotas, and advanced capabilities. Paid tiers are billed either
          monthly or annually, at your choice. All prices are listed in EUR. Applicable taxes
          (such as VAT) may be added at checkout depending on your country of residence.
        </p>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          <span className="font-semibold text-[var(--foreground)]">Tier changes.</span>{" "}
          Sovereign Brick may modify tier definitions, feature inclusions, and pricing.
          Changes apply to all users immediately, including users on existing subscriptions.
          Users may cancel before the next billing cycle if they disagree.
        </p>

        {/* 7a. Account Inactivity */}
        <h2 className="mt-6 mb-3 text-xl font-bold">7a. Account Inactivity</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          Free-tier (Glimpse) accounts that show no activity for 365 consecutive days may
          be flagged as dormant. Sovereign Brick reserves the right to delete dormant
          free-tier accounts and their associated data after written notice to the email
          on file. Paid-tier accounts are not subject to inactivity-based deletion as long
          as the subscription is active. Users may export their data at any time via the
          in-app export feature, including from the free tier.
        </p>

        {/* 7b. Organization Termination */}
        <h2 className="mt-6 mb-3 text-xl font-bold">7b. Organization Subscriptions</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          When an organization&apos;s subscription ends, members are offered a grace period
          of 30 days to switch to an individual plan or export and delete their data. After
          the grace period, organization-only data may be removed; data tied to individual
          accounts is retained subject to the standard inactivity policy above.
        </p>

        {/* 8. Payments */}
        <h2 className="mt-6 mb-3 text-xl font-bold">8. Payments</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          We accept the following payment methods:
        </p>
        <ul className="mb-3 list-disc space-y-2 pl-6 text-[var(--muted)]">
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Credit/debit card (via Stripe):</span>{" "}
            card payments are processed by Stripe, a PCI DSS Level 1 certified payment processor.
            We do not see, receive, or store your card details. All card data is handled entirely
            by Stripe.
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Bitcoin (via BTCPay Server):</span>{" "}
            cryptocurrency payments are processed through our self-hosted BTCPay Server instance.
            No third-party payment processor is involved for Bitcoin payments. A 5% discount
            applies to Bitcoin payments.
          </li>
        </ul>

        {/* 9. Cancellation */}
        <h2 className="mt-6 mb-3 text-xl font-bold">9. Cancellation</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          You may cancel your paid subscription at any time from the Settings page within
          the application. Cancellation takes effect at the end of your current billing period.
          You will retain access to your paid tier features until that date.
        </p>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          After a downgrade from a paid tier to the free tier, you will have a 7-day grace
          period during which you can export any data or configurations that may not be
          available on the free tier.
        </p>

        {/* 10. Refunds */}
        <h2 className="mt-6 mb-3 text-xl font-bold">10. Refunds</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          We offer a 30-day money-back guarantee on your first paid subscription. If you are
          not satisfied with the service, you may request a full refund within 30 days of your
          initial payment by contacting us via our{" "}
          <a
            href="/contact"
            className="text-blue-400 underline hover:text-blue-300"
          >
            contact page
          </a>
          .
        </p>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          After the initial 30-day period, no refunds will be issued for partial billing
          periods. If you cancel mid-cycle, you retain access until the end of that billing
          period, but the remaining time will not be refunded.
        </p>

        {/* 11. Referral Program */}
        <h2 className="mt-6 mb-3 text-xl font-bold">11. Referral Program</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          Users may participate in the Sovereign Health Intelligence referral program, subject
          to the following terms:
        </p>
        <ul className="mb-3 list-disc space-y-2 pl-6 text-[var(--muted)]">
          <li className="leading-relaxed">
            Referrals are tracked using a first-party referral cookie (<code className="text-xs bg-white/10 px-1 py-0.5 rounded">sh_ref</code>)
            with a 30-day expiry. No IP addresses are stored for affiliate tracking and no device
            fingerprinting is used.
          </li>
          <li className="leading-relaxed">
            Commission rate is 20% of the first subscription payment for each referred user.
            Commissions are subject to a 30-day evaluation period before becoming payable.
          </li>
          <li className="leading-relaxed">
            We reserve the right to reject referrals that we reasonably determine to be
            fraudulent, self-referrals, or otherwise in violation of the spirit of the program.
          </li>
          <li className="leading-relaxed">
            Commissions are payable in EUR or BTC at our discretion.
          </li>
        </ul>

        {/* 12. Email Communications */}
        <h2 className="mt-6 mb-3 text-xl font-bold">12. Email Communications</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          We use Mailgun as our email service provider for transactional emails. Transactional
          emails include account verification, password reset, and important service notifications.
          Your email address is shared with Mailgun solely for the purpose of delivering these
          emails.
        </p>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          We do not send marketing emails without your consent. If you opt in to product updates
          or the newsletter during registration, you may opt out at any time from the Settings page.
        </p>

        {/* 13. Open Source */}
        <h2 className="mt-6 mb-3 text-xl font-bold">13. Open Source</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          The core Sovereign Health platform is open source software licensed under the
          GNU Affero General Public License version 3.0 (AGPL-3.0). The source code is
          publicly available and may be self-hosted in accordance with that license.
        </p>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          If you self-host the open source version, you are subject to the terms of the
          AGPL-3.0 license, not these Terms of Service. These Terms of Service apply
          exclusively to the hosted Sovereign Health Intelligence service at
          sovereignhealth.io and app.sovereignhealth.io.
        </p>

        {/* 14. Acceptable Use */}
        <h2 className="mt-6 mb-3 text-xl font-bold">14. Acceptable Use</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          You agree to use Sovereign Health Intelligence only for its intended purpose of
          personal health tracking. The following activities are prohibited:
        </p>
        <ul className="mb-3 list-disc space-y-2 pl-6 text-[var(--muted)]">
          <li className="leading-relaxed">
            Storing health data for other individuals without their explicit, informed consent.
          </li>
          <li className="leading-relaxed">
            Attempting to access, view, modify, or delete another user&apos;s data.
          </li>
          <li className="leading-relaxed">
            Attempting to reverse engineer, circumvent, or compromise the encryption mechanisms
            used to protect health data.
          </li>
          <li className="leading-relaxed">
            Using automated scripts, bots, or other tools to access the service in a manner
            that exceeds reasonable personal use.
          </li>
          <li className="leading-relaxed">
            Using the platform for any illegal purpose or in violation of any applicable laws.
          </li>
          <li className="leading-relaxed">
            Abusing the referral program through self-referrals, fake accounts, or other
            fraudulent means.
          </li>
        </ul>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          Violation of these terms may result in immediate suspension or termination of your
          account.
        </p>

        {/* 15. Disclaimer */}
        <h2 className="mt-6 mb-3 text-xl font-bold">15. Disclaimer</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          The Sovereign Health Intelligence platform is provided &quot;as is&quot; and &quot;as
          available&quot; without warranties of any kind, whether express or implied, including
          but not limited to implied warranties of merchantability, fitness for a particular
          purpose, and non-infringement.
        </p>

        {/* 16. Limitation of Liability */}
        <h2 className="mt-6 mb-3 text-xl font-bold">16. Limitation of Liability</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          To the maximum extent permitted by applicable law, Sovereign Health Intelligence
          and its operator shall not be liable for any indirect, incidental, special,
          consequential, or punitive damages, including but not limited to loss of data,
          loss of profits, or damages arising from your use of or inability to use the
          service.
        </p>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          In no event shall the total liability of Sovereign Health Intelligence exceed the
          total amount you have paid to us in the twelve (12) months immediately preceding
          the event giving rise to the claim. If you are on the free tier and have paid
          nothing, our total liability shall not exceed EUR 50.
        </p>

        {/* 17. Governing Law */}
        <h2 className="mt-6 mb-3 text-xl font-bold">17. Governing Law</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          These Terms of Service shall be governed by and construed in accordance with the
          laws of the Republic of Austria, without regard to its conflict of law provisions.
          Any disputes arising from or relating to these terms or your use of the service
          shall be subject to the exclusive jurisdiction of the competent courts of Austria.
        </p>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          If you are a consumer within the European Union, you may also make use of the
          European Commission&apos;s Online Dispute Resolution (ODR) platform, available at{" "}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline hover:text-blue-300"
          >
            https://ec.europa.eu/consumers/odr
          </a>
          .
        </p>

        {/* 18. Changes */}
        <h2 className="mt-6 mb-3 text-xl font-bold">18. Changes to These Terms</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          We reserve the right to update or modify these Terms of Service at any time.
          Changes will be posted on this page with an updated effective date. Your continued
          use of the service after any changes constitutes your acceptance of the revised
          terms.
        </p>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          For material changes that significantly affect your rights or obligations, we will
          notify you via email at the address associated with your account at least 14 days
          before the changes take effect.
        </p>

        {/* 19. Contact */}
        <h2 className="mt-6 mb-3 text-xl font-bold">19. Contact</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          If you have any questions about these Terms of Service, please reach out via our{" "}
          <a
            href="/contact"
            className="text-blue-400 underline hover:text-blue-300"
          >
            contact page
          </a>
          .
        </p>
      </div>
    </div>
  );
}
