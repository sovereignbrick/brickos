"use client";

import { useState, useEffect, Suspense } from "react";
import ReactMarkdown from "react-markdown";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { SITE_CONFIG } from "@/lib/config";
import { InfoTooltip, highlightedTiers } from "@/components/feature-comparison-table";

const tierKeys = ["glimpse", "focus", "insight", "clarity", "horizon"] as const;

const faqKeys = [
  "freeTier",
  "paymentMethods",
  "cancelAnytime",
  "refundPolicy",
  "dataOwnership",
  "selfHost",
  "dataSecurity",
  "aiChats",
  "quotaRollover",
  "bitcoinPayment",
] as const;

const allPlansItems = [
  { key: "openSourceCore", icon: "\uD83D\uDD13", color: "#84cc16" },
  { key: "aes256Encryption", icon: "\uD83D\uDD10", color: "#ef4444" },
  { key: "dataPortability", icon: "\uD83D\uDCE6", color: "#3b82f6" },
  { key: "gdprCompliant", icon: "\uD83D\uDEE1\uFE0F", color: "#10b981" },
  { key: "noTracking", icon: "\uD83D\uDEAB", color: "#8b5cf6" },
  { key: "selfHostOption", icon: "\uD83C\uDFE0", color: "#f59e0b" },
] as const;

// ── Tier feature definitions ────────────────────────────────────────────────

type FeatureValue =
  | { type: "value"; value: string | number }
  | { type: "check" }
  | { type: "locked"; minTier: string }
  | { type: "soon"; value?: string | number };

interface TierFeatureRow {
  featureKey: string;
  value: FeatureValue;
}

const glimpseFeatures: TierFeatureRow[] = [
  { featureKey: "biomarkers", value: { type: "value", value: 8 } },
  { featureKey: "history", value: { type: "value", value: 30 } },
  { featureKey: "calculated", value: { type: "value", value: 1 } },
  { featureKey: "templates", value: { type: "value", value: 1 } },
  { featureKey: "medications", value: { type: "value", value: 2 } },
  { featureKey: "ai_chats", value: { type: "value", value: "2" } },
  { featureKey: "measurements", value: { type: "value", value: 100 } },
  { featureKey: "trends", value: { type: "locked", minTier: "Focus" } },
  { featureKey: "lab_explain", value: { type: "locked", minTier: "Focus" } },
  { featureKey: "nutrition", value: { type: "locked", minTier: "Focus" } },
  { featureKey: "supplement", value: { type: "locked", minTier: "Focus" } },
];

const focusFeatures: TierFeatureRow[] = [
  { featureKey: "biomarkers", value: { type: "value", value: 20 } },
  { featureKey: "history", value: { type: "value", value: 365 } },
  { featureKey: "calculated", value: { type: "value", value: 3 } },
  { featureKey: "templates", value: { type: "value", value: 3 } },
  { featureKey: "medications", value: { type: "value", value: 10 } },
  { featureKey: "ai_chats", value: { type: "value", value: "5" } },
  { featureKey: "trends", value: { type: "value", value: "3" } },
  { featureKey: "lab_explain", value: { type: "value", value: "3" } },
  { featureKey: "nutrition", value: { type: "value", value: "3" } },
  { featureKey: "supplement", value: { type: "value", value: "3" } },
  { featureKey: "measurements", value: { type: "value", value: 250 } },
  { featureKey: "csv_export", value: { type: "check" } },
  { featureKey: "thresholds", value: { type: "check" } },
  { featureKey: "body_comp", value: { type: "check" } },
  { featureKey: "twofa", value: { type: "check" } },
];

const insightFeatures: TierFeatureRow[] = [
  { featureKey: "biomarkers", value: { type: "value", value: 50 } },
  { featureKey: "history", value: { type: "check" } },
  { featureKey: "calculated", value: { type: "value", value: 8 } },
  { featureKey: "templates", value: { type: "value", value: 5 } },
  { featureKey: "medications", value: { type: "value", value: 25 } },
  { featureKey: "measurements", value: { type: "value", value: 500 } },
  { featureKey: "ai_chats", value: { type: "value", value: "30" } },
  { featureKey: "trends", value: { type: "value", value: "10" } },
  { featureKey: "lab_explain", value: { type: "value", value: "10" } },
  { featureKey: "nutrition", value: { type: "value", value: "10" } },
  { featureKey: "supplement", value: { type: "value", value: "10" } },
  { featureKey: "ai_dashboard", value: { type: "soon" } },
  { featureKey: "pdf_reports", value: { type: "soon", value: "1" } },
  { featureKey: "lab_import", value: { type: "soon", value: "3" } },
  { featureKey: "med_import", value: { type: "soon", value: "1" } },
  { featureKey: "protocols", value: { type: "soon", value: "5" } },
];

const clarityFeatures: TierFeatureRow[] = [
  { featureKey: "biomarkers", value: { type: "check" } },
  { featureKey: "calculated", value: { type: "check" } },
  { featureKey: "templates", value: { type: "check" } },
  { featureKey: "medications", value: { type: "check" } },
  { featureKey: "measurements", value: { type: "check" } },
  { featureKey: "ai_chats", value: { type: "check" } },
  { featureKey: "trends", value: { type: "check" } },
  { featureKey: "lab_explain", value: { type: "check" } },
  { featureKey: "nutrition", value: { type: "check" } },
  { featureKey: "supplement", value: { type: "check" } },
  { featureKey: "protocols", value: { type: "check" } },
  { featureKey: "cohort", value: { type: "soon" } },
  { featureKey: "pdf_reports", value: { type: "soon", value: "2" } },
  { featureKey: "lab_import", value: { type: "soon", value: "4" } },
  { featureKey: "med_import", value: { type: "soon", value: "2" } },
];

const horizonFeatures: TierFeatureRow[] = [
  { featureKey: "api_access", value: { type: "check" } },
  { featureKey: "self_hosted", value: { type: "soon" } },
  { featureKey: "onboarding", value: { type: "check" } },
  { featureKey: "priority", value: { type: "check" } },
  { featureKey: "weekly_pdf", value: { type: "soon" } },
  { featureKey: "unlimited_import", value: { type: "soon" } },
];

const tierFeatureMap: Record<string, TierFeatureRow[]> = {
  glimpse: glimpseFeatures,
  focus: focusFeatures,
  insight: insightFeatures,
  clarity: clarityFeatures,
  horizon: horizonFeatures,
};

const tierInheritsFrom: Record<string, string | null> = {
  glimpse: null,
  focus: null,
  insight: "focus",
  clarity: "insight",
  horizon: "clarity",
};


// ── Feature Row Component ────────────────────────────────────────────────────

function FeatureRow({
  row,
  t,
}: {
  row: TierFeatureRow;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const label = t(`pricing.feature.${row.featureKey}.label`);
  const tooltip = t(`pricing.feature.${row.featureKey}.tooltip`);

  const renderValue = () => {
    switch (row.value.type) {
      case "check":
        return (
          <span className="text-emerald-400">{t("pricing.unlimited")}</span>
        );
      case "value": {
        const v = row.value.value;
        if (row.featureKey === "history") {
          return <span>{v} {t("pricing.days")}</span>;
        }
        if (row.featureKey === "ai_chats" || row.featureKey === "trends" ||
            row.featureKey === "lab_explain" || row.featureKey === "nutrition" ||
            row.featureKey === "supplement" || row.featureKey === "protocols" ||
            row.featureKey === "pdf_reports" || row.featureKey === "lab_import" ||
            row.featureKey === "med_import") {
          return <span>{v}{t("pricing.perMonth")}</span>;
        }
        return <span>{v}</span>;
      }
      case "locked":
        return (
          <span className="text-zinc-500 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="inline-block">
              <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {t("pricing.locked", { tier: row.value.minTier })}
          </span>
        );
      case "soon":
        if (row.value.value !== undefined) {
          return (
            <span>
              {row.value.value}{t("pricing.perMonth")}
              <span className="ml-1.5 inline-block rounded bg-amber-900/40 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 leading-tight align-middle">
                {t("pricing.comingSoon")}
              </span>
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1">
            <span className="text-emerald-400">&#10003;</span>
            <span className="inline-block rounded bg-amber-900/40 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 leading-tight">
              {t("pricing.comingSoon")}
            </span>
          </span>
        );
    }
  };

  return (
    <li className="flex items-start gap-2 text-sm">
      {row.value.type === "locked" ? (
        <span className="mt-0.5 text-zinc-500">&#8212;</span>
      ) : (
        <span className="mt-0.5 text-emerald-400">&#10003;</span>
      )}
      <span className="flex-1">
        <span className="inline-flex items-center">
          {label}
          <InfoTooltip text={tooltip} />
        </span>
        <span className="ml-1.5 text-[var(--muted)]">
          {renderValue()}
        </span>
      </span>
    </li>
  );
}

// ── Promo Code Hook ─────────────────────────────────────────────────────────

interface PromoData {
  valid: boolean;
  code: string;
  discount: string;
  discount_type: string;
  discount_value: number;
  duration: string;
  duration_raw: string;
  duration_months: number | null;
  applicable_tiers: string[] | null;
  prices: Array<{ tier: string; original_price: number; discounted_price: number }>;
}

function usePromoCode() {
  const searchParams = useSearchParams();
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<PromoData | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  const validateCode = async (code: string) => {
    if (!code.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const res = await fetch(`${SITE_CONFIG.apiUrl}/v1/promotions/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (data?.data?.valid) {
        setPromo(data.data);
        setPromoError('');
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('sh_promo', code.trim().toUpperCase());
        }
      } else {
        setPromo(null);
        const reasons: Record<string, string> = {
          invalid_code: 'Invalid promo code',
          expired: 'This code has expired',
          code_disabled: 'This code is no longer active',
          max_redemptions_reached: 'This code is no longer available',
          not_yet_active: 'This code is not yet active',
          not_applicable_to_tier: 'This code does not apply to the selected tier',
        };
        setPromoError(reasons[data?.data?.reason] || 'Invalid code');
      }
    } catch {
      setPromoError('Could not validate code');
    } finally {
      setPromoLoading(false);
    }
  };

  useEffect(() => {
    const urlPromo = searchParams.get('promo');
    const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sh_promo') : null;
    const code = urlPromo || stored;
    if (code) {
      setPromoInput(code.toUpperCase());
      validateCode(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { promoInput, setPromoInput, promo, promoError, promoLoading, validateCode, setPromo, setPromoError };
}



// ── Wrapper ─────────────────────────────────────────────────────────────────

export default function PricingPageWrapper() {
  return (
    <Suspense>
      <PricingPage />
    </Suspense>
  );
}

type PayMethod = 'card' | 'btc';

// ── Main Page ───────────────────────────────────────────────────────────────

function FaqItem({ faqKey, t }: { faqKey: string; t: (key: string) => string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <h3 className="font-semibold text-sm pr-4">{t(`pricing.faq.items.${faqKey}.question`)}</h3>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className={`shrink-0 text-[var(--muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm leading-relaxed text-[var(--muted)]">
          <ReactMarkdown components={{
            a: ({ href, children }) => (
              <a
                href={href}
                target={href?.startsWith('/') ? undefined : '_blank'}
                rel={href?.startsWith('/') ? undefined : 'noopener noreferrer'}
                style={{ color: '#60a5fa', textDecoration: 'underline', textUnderlineOffset: '2px' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#93c5fd')}
                onMouseLeave={e => (e.currentTarget.style.color = '#60a5fa')}
              >
                {children}
              </a>
            ),
            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
          }}>
            {t(`pricing.faq.items.${faqKey}.answer`)}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>('card');
  const { t, locale } = useI18n();
  const { promoInput, setPromoInput, promo, promoError, promoLoading, validateCode, setPromo, setPromoError } = usePromoCode();

  const getDiscountedPrice = (tierKey: string, price: string): { original: string; discounted: string } | null => {
    if (!promo) return null;
    if (promo.applicable_tiers && !promo.applicable_tiers.includes(tierKey)) return null;
    const match = promo.prices.find(p => p.tier === tierKey);
    if (!match) return null;
    return {
      original: `\u20AC${match.original_price.toFixed(2)}`,
      discounted: `\u20AC${match.discounted_price.toFixed(2)}`,
    };
  };

  const getDisplayPrice = (tierKey: string, monthlyPrice: string, annualMonthly: string): React.ReactNode => {
    if (monthlyPrice === "Free" || monthlyPrice === "Custom" || monthlyPrice === "Kostenlos" || monthlyPrice === "Individuell") {
      return <p className="text-3xl font-bold">{monthlyPrice}</p>;
    }

    const basePrice = annual ? annualMonthly : monthlyPrice;
    const discount = getDiscountedPrice(tierKey, monthlyPrice);

    if (payMethod === 'btc') {
      const priceMatch = basePrice.match(/[\d.,]+/);
      if (!priceMatch) return <p className="text-3xl font-bold">{basePrice}</p>;
      const numPrice = parseFloat(priceMatch[0].replace(',', '.'));
      let finalPrice = numPrice * 0.95;
      let originalForStrike = basePrice;

      if (discount && !annual) {
        const discountedNum = parseFloat(discount.discounted.replace(/[^\d.]/g, ''));
        finalPrice = discountedNum * 0.95;
        originalForStrike = discount.original;
      }

      return (
        <div>
          <p className="text-3xl font-bold text-amber-400">
            {`\u20AC${finalPrice.toFixed(2)}`}
            <span className="text-base font-normal text-[var(--muted)]">{t("pricing.perMonth")}</span>
          </p>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            <span className="line-through">{originalForStrike}{t("pricing.perMonth")}</span>
            <span className="ml-1 text-amber-400">{t("pricing.btcDiscountLabel")}</span>
          </p>
        </div>
      );
    }

    if (discount && !annual) {
      return (
        <div>
          <p className="text-3xl font-bold">
            {discount.discounted}
            <span className="text-base font-normal text-[var(--muted)]">{t("pricing.perMonth")}</span>
          </p>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            <span className="line-through">{discount.original}{t("pricing.perMonth")}</span>
            {promo && promo.duration_raw === 'repeating' && promo.duration_months && (
              <span> {t("pricing.promoForMonths", { months: String(promo.duration_months), price: discount.original })}</span>
            )}
            {promo && promo.duration_raw === 'once' && (
              <span> {t("pricing.promoFirstMonth", { price: discount.original })}</span>
            )}
          </p>
        </div>
      );
    }

    const annualPrice = t(`pricing.tiers.${tierKey}.annualPrice`);
    return (
      <>
        <p className="text-3xl font-bold">
          {basePrice}
          <span className="text-base font-normal text-[var(--muted)]">{t("pricing.perMonth")}</span>
        </p>
        {annual && (
          <p className="mt-1 text-sm text-[var(--muted)]">
            {annualPrice}{t("pricing.perYear")}
          </p>
        )}
      </>
    );
  };

  return (
    <div>
      {/* Hero */}
      <section className="px-6 py-14 text-center">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t("pricing.hero.title")}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg font-medium text-[var(--success)]">
            {t("pricing.hero.tagline")}
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-[var(--muted)]">
            {t("pricing.hero.subtitle")}
          </p>
        </div>
      </section>

      {/* Payment Options + Promo Code - Two Column Layout */}
      <section className="px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Left: Payment Options */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
              <p className="text-sm font-semibold text-[var(--foreground)] mb-4">{t("pricing.paymentOptions")}</p>

              {/* Billing cycle */}
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-sm ${!annual ? "text-[var(--foreground)] font-medium" : "text-[var(--muted)]"}`}>
                  {t("pricing.toggle.monthly")}
                </span>
                <button
                  onClick={() => setAnnual(!annual)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    annual ? "bg-blue-600" : "bg-[var(--border)]"
                  }`}
                  aria-label="Toggle annual pricing"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                      annual ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className={`text-sm ${annual ? "text-[var(--foreground)] font-medium" : "text-[var(--muted)]"}`}>
                  {t("pricing.toggle.annual")}
                </span>
                {annual && (
                  <span className="rounded-full bg-emerald-900/50 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                    {t("pricing.toggle.save17")}
                  </span>
                )}
              </div>

              {/* Payment method */}
              <div className="flex gap-2">
                <button
                  onClick={() => setPayMethod('card')}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    payMethod === 'card'
                      ? 'border-blue-500 bg-blue-600/10 text-blue-400'
                      : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)]'
                  }`}
                >
                  &#128179; {t("pricing.payCard")}
                </button>
                <button
                  onClick={() => setPayMethod('btc')}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    payMethod === 'btc'
                      ? 'border-amber-500 bg-amber-600/10 text-amber-400'
                      : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)]'
                  }`}
                >
                  &#9889; {t("pricing.payBitcoin")}
                  <span className="rounded bg-amber-900/40 px-1.5 py-0.5 text-[10px] text-amber-400">{t("pricing.btcDiscount")}</span>
                </button>
              </div>
              {payMethod === 'btc' && (
                <p className="mt-3 text-xs text-amber-400">{t("pricing.btcNote")}</p>
              )}
            </div>

            {/* Right: Promo Code */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
              <p className="text-sm font-semibold text-[var(--foreground)] mb-4">{t("pricing.promoCode")}</p>

              {promo ? (
                <div className="text-center py-2">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="text-emerald-400">&#10003;</span>
                    <span className="font-semibold text-emerald-400">{promo.discount}</span>
                    <span className="text-sm text-[var(--muted)]">{t("pricing.promoFor")} {promo.duration}</span>
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    Code <span className="font-mono font-medium text-[var(--foreground)]">{promo.code}</span> {t("pricing.promoApplied")}
                  </p>
                  <button
                    onClick={() => { setPromo(null); setPromoInput(''); setPromoError(''); if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('sh_promo'); }}
                    className="mt-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  >
                    {t("pricing.promoRemove")}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
                      onKeyDown={e => e.key === 'Enter' && validateCode(promoInput)}
                      placeholder={t("pricing.promoPlaceholder")}
                      className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => validateCode(promoInput)}
                      disabled={promoLoading || !promoInput.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      {promoLoading ? '...' : t("pricing.promoApply")}
                    </button>
                  </div>
                  {promoError && (
                    <p className="mt-2 text-xs text-center text-red-400">{promoError}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Tier Cards */}
      <section className="px-6 py-10">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-5">
          {tierKeys.map((tierKey) => {
            const highlighted = highlightedTiers.has(tierKey);
            const name = t(`pricing.tiers.${tierKey}.name`);
            const tagline = t(`pricing.tiers.${tierKey}.tagline`);
            const monthlyPrice = t(`pricing.tiers.${tierKey}.monthlyPrice`);
            const annualMonthly = t(`pricing.tiers.${tierKey}.annualMonthly`);
            const featureRows = tierFeatureMap[tierKey] || [];
            const inheritsFrom = tierInheritsFrom[tierKey];

            return (
              <div
                key={tierKey}
                className={`flex flex-col rounded-xl border p-5 ${
                  highlighted
                    ? "border-blue-600 bg-[var(--card)]"
                    : "border-[var(--border)] bg-[var(--card)]"
                }`}
              >
                {highlighted && (
                  <span className="mb-3 inline-block self-start rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                    {t("pricing.bestValue")}
                  </span>
                )}
                <h3 className="text-xl font-bold">{name}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{tagline}</p>
                <div className="mt-3">
                  {getDisplayPrice(tierKey, monthlyPrice, annualMonthly)}
                </div>
                <ul className="mt-4 flex-1 space-y-2">
                  {inheritsFrom && (
                    <li className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 text-blue-400">+</span>
                      <span className="text-blue-400 font-medium">
                        {t(`pricing.tiers.${inheritsFrom}.name`)} +
                      </span>
                    </li>
                  )}
                  {featureRows.map((row) => (
                    <FeatureRow key={row.featureKey} row={row} t={t} />
                  ))}
                </ul>
                {(() => {
                  const isFree = monthlyPrice === "Free" || monthlyPrice === "Kostenlos";
                  const isCustom = monthlyPrice === "Custom" || monthlyPrice === "Individuell";
                  return (
                    <a
                      href={isCustom
                        ? "/contact/"
                        : isFree
                          ? `${SITE_CONFIG.appUrl}/signup${locale !== 'en' ? `?lang=${locale}` : ''}`
                          : `${SITE_CONFIG.appUrl}/signup?tier=${tierKey}&interval=${annual ? 'annual' : 'monthly'}${promo ? `&promo=${promo.code}` : ''}${locale !== 'en' ? `&lang=${locale}` : ''}`
                      }
                      className={`mt-6 block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors ${
                        highlighted ? 'bg-blue-600 hover:bg-blue-700' : 'bg-zinc-700 hover:bg-zinc-600'
                      }`}
                    >
                      {isCustom ? t("pricing.enterprise.contactUs") : isFree ? t("pricing.getStartedFree") : t("pricing.subscribe")}
                    </a>
                  );
                })()}
              </div>
            );
          })}
        </div>
        <div className="text-center mt-6">
          <a href="/feature-details/" className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
            {t("pricing.viewFullFeatureList")}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        </div>
      </section>

      {/* All Plans Include */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-2xl font-bold">{t("pricing.allPlansInclude.heading")}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {allPlansItems.map((item) => (
              <div
                key={item.key}
                className="rounded-xl border bg-[var(--card)] p-5 text-center"
                style={{ borderColor: item.color + "40", background: `linear-gradient(135deg, ${item.color}08, transparent)` }}
              >
                <span className="mb-2 inline-block text-2xl">{item.icon}</span>
                <h3 className="font-semibold" style={{ color: item.color }}>{t(`pricing.allPlansInclude.${item.key}.title`)}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{t(`pricing.allPlansInclude.${item.key}.description`)}</p>
              </div>
            ))}
          </div>
          <a
            href="/security/"
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            {t("pricing.learnMoreSecurity")}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="inline-block">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </section>

      {/* Enterprise */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
          <h2 className="text-2xl font-bold">{t("pricing.enterprise.heading")}</h2>
          <p className="mt-3 text-[var(--muted)]">
            {t("pricing.enterprise.description")}
          </p>
          <a
            href="/contact/"
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {t("pricing.enterprise.contactUs")}
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold">{t("pricing.faq.heading")}</h2>
          <div className="mt-6 space-y-2">
            {faqKeys.map((faqKey) => (
              <FaqItem key={faqKey} faqKey={faqKey} t={t} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-14 text-center">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold">{t("pricing.cta.heading")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-[var(--muted)]">
            {t("pricing.cta.description")}
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={SITE_CONFIG.appUrl}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              {t("pricing.cta.getEarlyAccess")}
            </a>
            <a
              href="/features/"
              className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] px-6 py-3 font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--card)]"
            >
              {t("pricing.cta.seeAllFeatures")}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
