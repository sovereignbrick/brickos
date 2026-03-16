// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use rust_decimal::prelude::ToPrimitive;
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::Serialize;

use super::gateway::GatewayId;

// ---------------------------------------------------------------------------
// Input / output types
// ---------------------------------------------------------------------------

pub struct PricingInput {
    pub list_price_cents: i64,
    pub promo_discount_pct: Decimal,
    pub promo_discount_fixed_cents: i64,
    pub promo_is_percent: bool,
    pub btc_discount_pct: Decimal,
    pub gateway: GatewayId,
    pub is_first_payment: bool,
    pub has_affiliate: bool,
    pub affiliate_commission_pct: Decimal,
}

#[derive(Debug, Clone, Serialize)]
pub struct PricingBreakdown {
    pub list_price_cents: i64,
    pub promo_discount_cents: i64,
    pub after_promo_cents: i64,
    pub btc_discount_cents: i64,
    pub charged_amount_cents: i64,
    pub floor_applied: bool,
    pub gateway_fee_cents: i64,
    pub gross_revenue_cents: i64,
    pub affiliate_commission_cents: i64,
    pub net_revenue_cents: i64,
    pub net_revenue_pct: f64,
    pub user_savings_cents: i64,
    pub user_savings_pct: f64,
}

/// EUR 5.00 minimum charge
pub const MINIMUM_CHARGE_CENTS: i64 = 500;

/// Default BTC discount percentage
pub const BTC_DISCOUNT_PCT: Decimal = dec!(5);

/// Default affiliate commission percentage
pub const AFFILIATE_COMMISSION_PCT: Decimal = dec!(20);

// ---------------------------------------------------------------------------
// Tier prices (cents)
// ---------------------------------------------------------------------------

pub const TIER_PRICES_MONTHLY: &[(&str, i64)] = &[
    ("focus", 999),
    ("insight", 2499),
    ("clarity", 4999),
    ("horizon", 9999),
];

pub const TIER_PRICES_YEARLY: &[(&str, i64)] = &[
    ("focus", 9999),
    ("insight", 24999),
    ("clarity", 49999),
    ("horizon", 99999),
];

pub fn tier_price_cents(tier: &str, interval: &str) -> Option<i64> {
    let prices = if interval == "annual" {
        TIER_PRICES_YEARLY
    } else {
        TIER_PRICES_MONTHLY
    };
    prices.iter().find(|(t, _)| *t == tier).map(|(_, p)| *p)
}

// ---------------------------------------------------------------------------
// Calculate
// ---------------------------------------------------------------------------

impl PricingBreakdown {
    pub fn calculate(input: &PricingInput) -> Self {
        let list = input.list_price_cents;

        // Step 1: Promo discount
        let promo_discount = if input.promo_is_percent {
            (Decimal::from(list) * input.promo_discount_pct / dec!(100))
                .round_dp(0)
                .to_i64()
                .unwrap_or(0)
        } else {
            input.promo_discount_fixed_cents.min(list)
        };
        let after_promo = (list - promo_discount).max(0);

        // Step 2: BTC discount (% of after-promo price)
        let btc_discount = (Decimal::from(after_promo) * input.btc_discount_pct / dec!(100))
            .round_dp(0)
            .to_i64()
            .unwrap_or(0);
        let mut charged = after_promo - btc_discount;

        // Step 3: Enforce EUR 5.00 floor
        let floor_applied = charged < MINIMUM_CHARGE_CENTS && charged > 0;
        if floor_applied {
            charged = MINIMUM_CHARGE_CENTS;
        }

        // Step 4: Gateway fee estimate
        let gateway_fee = estimate_gateway_fee(input.gateway, charged);
        let gross = charged - gateway_fee;

        // Step 5: Affiliate commission (first payment only)
        let affiliate_commission = if input.is_first_payment && input.has_affiliate {
            (Decimal::from(charged) * input.affiliate_commission_pct / dec!(100))
                .round_dp(0)
                .to_i64()
                .unwrap_or(0)
        } else {
            0
        };
        let net = gross - affiliate_commission;

        let net_pct = if list > 0 {
            let pct = Decimal::from(net) * dec!(100) / Decimal::from(list);
            pct.round_dp(1).to_f64().unwrap_or(0.0)
        } else {
            0.0
        };

        let savings = list - charged;
        let savings_pct = if list > 0 {
            let pct = Decimal::from(savings) * dec!(100) / Decimal::from(list);
            pct.round_dp(1).to_f64().unwrap_or(0.0)
        } else {
            0.0
        };

        Self {
            list_price_cents: list,
            promo_discount_cents: promo_discount,
            after_promo_cents: after_promo,
            btc_discount_cents: btc_discount,
            charged_amount_cents: charged,
            floor_applied,
            gateway_fee_cents: gateway_fee,
            gross_revenue_cents: gross,
            affiliate_commission_cents: affiliate_commission,
            net_revenue_cents: net,
            net_revenue_pct: net_pct,
            user_savings_cents: savings,
            user_savings_pct: savings_pct,
        }
    }
}

fn estimate_gateway_fee(gateway: GatewayId, amount_cents: i64) -> i64 {
    match gateway {
        GatewayId::Stripe => {
            // EU cards: 1.5% + EUR 0.25
            let pct_fee = (Decimal::from(amount_cents) * dec!(0.015))
                .round_dp(0)
                .to_i64()
                .unwrap_or(0);
            pct_fee + 25
        }
        GatewayId::Strike => {
            // ~1%
            (Decimal::from(amount_cents) * dec!(0.01))
                .round_dp(0)
                .to_i64()
                .unwrap_or(0)
        }
    }
}

/// Generate all-tier revenue preview for a given discount percentage.
/// Returns data for the admin promo preview endpoint.
pub fn admin_promo_preview(discount_pct: f64) -> (Vec<serde_json::Value>, Vec<String>) {
    let discount = Decimal::try_from(discount_pct).unwrap_or(dec!(0));
    let mut tiers = Vec::new();
    let mut warnings: Vec<String> = Vec::new();

    for (tier_slug, monthly_cents) in TIER_PRICES_MONTHLY {
        let yearly_cents = TIER_PRICES_YEARLY
            .iter()
            .find(|(t, _)| t == tier_slug)
            .map(|(_, p)| *p)
            .unwrap_or(0);

        let mut tier_data = serde_json::json!({ "tier": tier_slug });

        for (interval_name, price_cents) in [("monthly", *monthly_cents), ("annual", yearly_cents)]
        {
            let scenarios = serde_json::json!({
                "card_no_affiliate": scenario_breakdown(price_cents, discount, GatewayId::Stripe, false),
                "card_with_affiliate": scenario_breakdown(price_cents, discount, GatewayId::Stripe, true),
                "btc_no_affiliate": scenario_breakdown(price_cents, discount, GatewayId::Strike, false),
                "btc_with_affiliate": scenario_breakdown(price_cents, discount, GatewayId::Strike, true),
            });

            tier_data[interval_name] = serde_json::json!({
                "list_cents": price_cents,
                "scenarios": scenarios,
            });
        }

        tiers.push(tier_data);
    }

    // Check worst case: BTC + affiliate on Focus monthly
    if discount_pct > 0.0 {
        let worst = PricingBreakdown::calculate(&PricingInput {
            list_price_cents: 999,
            promo_discount_pct: discount,
            promo_discount_fixed_cents: 0,
            promo_is_percent: true,
            btc_discount_pct: BTC_DISCOUNT_PCT,
            gateway: GatewayId::Strike,
            is_first_payment: true,
            has_affiliate: true,
            affiliate_commission_pct: AFFILIATE_COMMISSION_PCT,
        });

        if worst.net_revenue_pct < 50.0 {
            warnings.push(format!(
                "Discount above {:.0}%: net revenue drops below 50% of list price for first-time affiliate-referred BTC payments.",
                discount_pct
            ));
        }

        if worst.floor_applied {
            warnings.push(
                "This discount would hit the EUR 5.00 minimum floor for Focus tier with BTC payment."
                    .to_string(),
            );
        }
    }

    (tiers, warnings)
}

fn scenario_breakdown(
    price_cents: i64,
    discount_pct: Decimal,
    gateway: GatewayId,
    with_affiliate: bool,
) -> serde_json::Value {
    let btc_pct = match gateway {
        GatewayId::Strike => BTC_DISCOUNT_PCT,
        _ => dec!(0),
    };

    let b = PricingBreakdown::calculate(&PricingInput {
        list_price_cents: price_cents,
        promo_discount_pct: discount_pct,
        promo_discount_fixed_cents: 0,
        promo_is_percent: true,
        btc_discount_pct: btc_pct,
        gateway,
        is_first_payment: with_affiliate,
        has_affiliate: with_affiliate,
        affiliate_commission_pct: AFFILIATE_COMMISSION_PCT,
    });

    serde_json::json!({
        "charged": b.charged_amount_cents,
        "net": b.net_revenue_cents,
        "net_pct": b.net_revenue_pct,
        "floor_applied": b.floor_applied,
    })
}
