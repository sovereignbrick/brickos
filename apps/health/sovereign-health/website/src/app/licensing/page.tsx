import Link from "next/link";

// Sprint 040 #487 — customer-facing licensing page.
//
// Plain-language explanation of how the Sovereign Health licensing system
// works. design 022 §11 + §12. Bilingual content (EN here; DE follow-up
// can be added the same way the rest of the website handles i18n).
//
// Tier comparison data is intentionally NOT hardcoded — the live tier
// table on /pricing already reads from /api/v1/license/tiers, and that
// page is the source of truth for pricing. This page focuses on the
// behavior model: what happens when you downgrade, what dormant means,
// what org termination looks like.

export default function LicensingPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-2 text-3xl font-bold">How licensing works</h1>
        <p className="mb-8 text-sm text-[var(--muted)]">
          Plain language. No legalese. Last updated 2026-04-10.
        </p>

        <p className="mb-6 leading-relaxed text-[var(--muted)]">
          Sovereign Health is built on the BrickOS licensing system: a small set
          of clear rules that decide what your account can do, how your data is
          treated when you change plans, and what happens when you stop logging
          in. This page explains all of it without buzzwords. For prices and the
          current tier feature list, see the{" "}
          <Link href="/pricing" className="text-blue-400 underline hover:text-blue-300">
            Pricing page
          </Link>
          .
        </p>

        {/* 1. Tiers */}
        <h2 className="mt-10 mb-3 text-xl font-bold">1. Tiers</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          A &quot;tier&quot; is a named bundle of features and limits. Sovereign
          Health offers Glimpse (free), Focus, Insight, Clarity, and Horizon.
          The current feature list and prices live on the{" "}
          <Link href="/pricing" className="text-blue-400 underline hover:text-blue-300">
            Pricing page
          </Link>{" "}
          and are read directly from the licensing system, so they cannot drift
          out of sync.
        </p>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          Sovereign Brick may add features, change feature inclusions, or adjust
          prices. Changes apply to existing subscribers immediately. If you
          disagree with a change, you can cancel before the next billing cycle.
        </p>

        {/* 2. Glimpse semantics */}
        <h2 className="mt-10 mb-3 text-xl font-bold">2. What &quot;Glimpse&quot; means in practice</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          Glimpse is the free tier. It is intended to be useful by itself, not
          a teaser. Concretely:
        </p>
        <ul className="mb-3 list-disc space-y-2 pl-6 text-[var(--muted)]">
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">10 active markers.</span>{" "}
            You can actively track up to 10 biomarkers at a time. You pick
            which 10 from the full catalogue.
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Preserved markers.</span>{" "}
            If you previously tracked more (e.g. you downgraded from Focus to
            Glimpse), the extra markers are kept read-only. You can still see
            their history; you just can&apos;t add new measurements until you
            promote them back into the active 10 (or upgrade).
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Calculated markers are unlimited.</span>{" "}
            GKI, BMI, WHtR, and other derived metrics are computed from your
            biomarkers and never count against the 10-marker cap.
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">30 days of history.</span>{" "}
            You see the last 30 days of measurement data on Glimpse. Older
            measurements are not deleted — they become visible again when you
            upgrade.
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">3 AI chat messages per month.</span>{" "}
            See section 4 for the full AI usage rules.
          </li>
        </ul>

        {/* 3. Downgrade behavior */}
        <h2 className="mt-10 mb-3 text-xl font-bold">3. Downgrade behavior</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          When you cancel a paid plan, your access continues until the end of
          the current billing period. After that, you enter a 7-day grace period
          on your old tier so you can export anything you need. After the grace
          period:
        </p>
        <ul className="mb-3 list-disc space-y-2 pl-6 text-[var(--muted)]">
          <li className="leading-relaxed">
            Your account drops to Glimpse.
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Your data is preserved, not deleted.</span>{" "}
            Markers above the Glimpse 10-active cap become preserved (read-only).
            Calculated markers stay unlimited. Your full measurement history is
            kept on disk; only the visibility window changes.
          </li>
          <li className="leading-relaxed">
            If you upgrade again later, all preserved data becomes editable
            again immediately. Nothing has to be re-entered.
          </li>
        </ul>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          You can also downgrade voluntarily from inside the app at any time.
          The same rules apply.
        </p>

        {/* 4. AI usage */}
        <h2 className="mt-10 mb-3 text-xl font-bold">4. AI chat limits</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          Dr. Alex (the in-app AI) has two layers of limits:
        </p>
        <ol className="mb-3 list-decimal space-y-2 pl-6 text-[var(--muted)]">
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">A monthly tier quota</span>{" "}
            — 3/month on Glimpse, scaling up by tier. The quota is shared across
            all Dr. Alex agents (general, trends, labs, diet, supplements,
            protocols), so you can spend it however you want.
          </li>
          <li className="leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">A hard daily ceiling</span>{" "}
            — applied per user even on the highest tier, to prevent runaway
            usage. The limit is generous but not unlimited; you will see a
            warning when you approach it.
          </li>
        </ol>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          AI calls go to Anthropic Claude with anonymized context only. Your
          name, email, and other personally identifiable information are never
          included. Your data is not used to train AI models.
        </p>

        {/* 5. Account inactivity */}
        <h2 className="mt-10 mb-3 text-xl font-bold">5. Account inactivity</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          Free-tier (Glimpse) accounts that show no activity for 365 consecutive
          days may be flagged as dormant. Concretely:
        </p>
        <ul className="mb-3 list-disc space-y-2 pl-6 text-[var(--muted)]">
          <li className="leading-relaxed">
            We send an inactivity warning email to the address on file.
          </li>
          <li className="leading-relaxed">
            If the account stays inactive after the warning, we reserve the
            right to delete it and its associated data.
          </li>
          <li className="leading-relaxed">
            Paid-tier accounts are <span className="font-semibold text-[var(--foreground)]">never</span>{" "}
            subject to inactivity-based deletion as long as the subscription is
            active.
          </li>
          <li className="leading-relaxed">
            You can export your full data at any time, including from the free
            tier, via the export feature in the app.
          </li>
        </ul>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          The full legal text of this policy is in our{" "}
          <Link href="/terms" className="text-blue-400 underline hover:text-blue-300">
            Terms of Service
          </Link>{" "}
          (Section 7a).
        </p>

        {/* 6. Organization termination */}
        <h2 className="mt-10 mb-3 text-xl font-bold">6. Organizations and white-label customers</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          Some customers (clinics, employers, communities) buy a Sovereign
          Health license at the organization level. As a member of such an
          organization, your tier comes from the org&apos;s license, not your
          own subscription.
        </p>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          When an organization&apos;s subscription ends, members are offered a
          30-day grace period during which they can:
        </p>
        <ul className="mb-3 list-disc space-y-2 pl-6 text-[var(--muted)]">
          <li className="leading-relaxed">
            Switch to an individual plan and keep using their data.
          </li>
          <li className="leading-relaxed">
            Export their data and close their account.
          </li>
        </ul>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          After the grace period, organization-only data may be removed. Data
          tied to your individual account is retained subject to the standard
          inactivity policy above.
        </p>

        {/* 7. Multi-org */}
        <h2 className="mt-10 mb-3 text-xl font-bold">7. Multi-org accounts</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          If you are a member of more than one organization (e.g. you have a
          personal account and a clinic account), the user profile dropdown in
          the app has an org switcher. The currently selected org determines
          which tier and which features you see. Switching is instant and
          reversible.
        </p>

        {/* 8. License revocation */}
        <h2 className="mt-10 mb-3 text-xl font-bold">8. License revocation</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          In rare cases (terms of service violation, fraud, customer dispute) a
          license may be revoked mid-period. Revocation is logged in the
          internal audit trail and propagates within 60 seconds. Affected users
          see an upgrade-required prompt the next time they hit a gated feature.
        </p>

        {/* 9. Open source / self-hosted */}
        <h2 className="mt-10 mb-3 text-xl font-bold">9. Open source and self-hosted</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          The Sovereign Health platform is open source under AGPL-3.0. If you
          self-host, none of the licensing rules above apply — there is no
          tier, no quota, no remote check. The licensing system only runs on
          the hosted Sovereign Health service at sovereignhealth.io and
          app.sovereignhealth.io. The repository is at{" "}
          <a
            href="https://github.com/sovereignbrick/brickos"
            className="text-blue-400 underline hover:text-blue-300"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/sovereignbrick/brickos
          </a>
          .
        </p>

        {/* Contact */}
        <h2 className="mt-10 mb-3 text-xl font-bold">Questions?</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          For licensing questions, billing issues, or organization onboarding,
          please use the{" "}
          <Link href="/contact" className="text-blue-400 underline hover:text-blue-300">
            contact page
          </Link>
          . We answer within one business day.
        </p>

        <div className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-[var(--muted)]">
          See also:{" "}
          <Link href="/pricing" className="underline hover:text-blue-300">
            Pricing
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="underline hover:text-blue-300">
            Terms of Service
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" className="underline hover:text-blue-300">
            Privacy Policy
          </Link>
        </div>
      </div>
    </main>
  );
}
