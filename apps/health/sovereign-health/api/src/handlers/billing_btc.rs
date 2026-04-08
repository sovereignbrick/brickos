// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpRequest, HttpResponse};
use chrono::{Duration, Utc};
use serde::Deserialize;
use serde_json::json;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use brickos_billing::strike::{CreateInvoiceRequest, InvoiceAmount, StrikeService};

use crate::middleware::auth::AuthenticatedUser;
use crate::PlatformPool;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// Monthly prices in EUR per tier (same as Stripe)
const TIER_PRICES: &[(&str, f64)] = &[
    ("focus", 9.99),
    ("insight", 24.99),
    ("clarity", 49.99),
    ("horizon", 99.99),
];

/// Default BTC discount percentage (overridden by app_settings.btc_discount_percent)
const DEFAULT_BTC_DISCOUNT_PERCENT: f64 = 5.0;

/// Number of free months for annual billing (2 months free)
const ANNUAL_FREE_MONTHS: u32 = 2;

/// Read BTC discount from app_settings (admin panel), falling back to default
async fn btc_discount_percent(platform_pool: &PgPool) -> f64 {
    let val = crate::handlers::admin_settings::get_setting(
        platform_pool,
        "btc_discount_percent",
        json!(DEFAULT_BTC_DISCOUNT_PERCENT),
    )
    .await;
    val.as_f64()
        .or_else(|| val.as_str().and_then(|s| s.parse::<f64>().ok()))
        .unwrap_or(DEFAULT_BTC_DISCOUNT_PERCENT)
}

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct CreateBtcInvoiceRequest {
    pub tier: String,
    pub period_months: u32,
    pub promo_code: Option<String>,
}

#[derive(Deserialize)]
pub struct CheckInvoiceQuery {
    // No query params needed, invoice_id is in the path
}

// ---------------------------------------------------------------------------
// Pricing logic
// ---------------------------------------------------------------------------

fn tier_monthly_price(tier: &str) -> Option<f64> {
    TIER_PRICES
        .iter()
        .find(|(t, _)| *t == tier)
        .map(|(_, p)| *p)
}

/// Calculate the final EUR price for a BTC payment
/// Applies: period discount (annual = 2 months free) + BTC discount + promo
fn calculate_btc_price(
    tier: &str,
    period_months: u32,
    promo_discount_percent: Option<f64>,
    promo_discount_amount: Option<f64>,
    promo_discount_type: Option<&str>,
    btc_discount_pct: f64,
) -> Option<BtcPriceBreakdown> {
    let monthly = tier_monthly_price(tier)?;
    let total_eur = monthly * period_months as f64;

    // Annual discount: 2 months free
    let annual_discount = if period_months == 12 {
        monthly * ANNUAL_FREE_MONTHS as f64
    } else {
        0.0
    };

    let after_annual = total_eur - annual_discount;

    // Promo discount (applied before BTC discount)
    let promo_discount = match promo_discount_type {
        Some("percent_off") => after_annual * promo_discount_percent.unwrap_or(0.0) / 100.0,
        Some("amount_off") => {
            // Fixed amount off (applied per period, not per month)
            promo_discount_amount.unwrap_or(0.0)
        }
        _ => 0.0,
    };

    let after_promo = (after_annual - promo_discount).max(0.0);

    // BTC discount
    let btc_discount = after_promo * btc_discount_pct / 100.0;
    let final_eur = after_promo - btc_discount;

    // Round to 2 decimal places, floor at €5.00
    let final_eur = ((final_eur * 100.0).round() / 100.0).max(5.0);

    Some(BtcPriceBreakdown {
        _tier: tier.to_string(),
        _period_months: period_months,
        monthly_price: monthly,
        base_total_eur: total_eur,
        annual_discount_eur: annual_discount,
        promo_discount_eur: promo_discount,
        btc_discount_percent: btc_discount_pct,
        btc_discount_eur: btc_discount,
        final_eur,
    })
}

struct BtcPriceBreakdown {
    _tier: String,
    _period_months: u32,
    monthly_price: f64,
    base_total_eur: f64,
    annual_discount_eur: f64,
    promo_discount_eur: f64,
    btc_discount_percent: f64,
    btc_discount_eur: f64,
    final_eur: f64,
}

// ---------------------------------------------------------------------------
// POST /billing/btc/create-invoice
// ---------------------------------------------------------------------------

pub async fn create_invoice(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    strike: Option<web::Data<StrikeService>>,
    user: AuthenticatedUser,
    body: web::Json<CreateBtcInvoiceRequest>,
) -> HttpResponse {
    // Check payment whitelist gate
    if let Err(resp) = crate::handlers::payments::check_payment_allowed(&req, &platform_pool.0).await
    {
        return resp;
    }

    let strike = match strike {
        Some(s) => s,
        None => return HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "BTC_DISABLED", "message": "Bitcoin payments are not configured." }
        })),
    };

    // Validate tier
    if tier_monthly_price(&body.tier).is_none() {
        return HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "INVALID_TIER", "message": "Invalid tier." }
        }));
    }

    // Validate period
    if ![1, 3, 6, 12].contains(&body.period_months) {
        return HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "INVALID_PERIOD", "message": "Period must be 1, 3, 6, or 12 months." }
        }));
    }

    // Look up promo code if provided
    let mut promo_discount_percent: Option<f64> = None;
    let mut promo_discount_amount: Option<f64> = None;
    let mut promo_discount_type: Option<String> = None;
    let mut promo_code_validated: Option<String> = None;

    if let Some(ref code) = body.promo_code {
        let code_upper = code.trim().to_uppercase();
        let promo_row = sqlx::query(
            r#"SELECT discount_type, discount_value::float8 as discount_value, applicable_tiers,
                      max_redemptions, redemption_count, starts_at, expires_at, is_active
               FROM promotions WHERE UPPER(code) = $1"#,
        )
        .bind(&code_upper)
        .fetch_optional(&platform_pool.0)
        .await;

        if let Ok(Some(row)) = promo_row {
            let is_active: bool = row.try_get("is_active").unwrap_or(false);
            let discount_type: String = row.try_get("discount_type").unwrap_or_default();
            let discount_value: f64 = row.try_get("discount_value").unwrap_or(0.0);
            let applicable_tiers: Option<Vec<String>> =
                row.try_get("applicable_tiers").unwrap_or(None);
            let max_redemptions: Option<i32> = row.try_get("max_redemptions").unwrap_or(None);
            let redemption_count: i32 = row.try_get("redemption_count").unwrap_or(0);
            let starts_at: Option<chrono::DateTime<Utc>> = row.try_get("starts_at").unwrap_or(None);
            let expires_at: Option<chrono::DateTime<Utc>> =
                row.try_get("expires_at").unwrap_or(None);

            let now = Utc::now();
            let valid = is_active
                && starts_at.is_none_or(|s| now >= s)
                && expires_at.is_none_or(|e| now <= e)
                && max_redemptions.is_none_or(|m| redemption_count < m)
                && applicable_tiers
                    .as_ref()
                    .is_none_or(|tiers| tiers.contains(&body.tier));

            if valid {
                promo_discount_type = Some(discount_type.clone());
                if discount_type == "percent_off" {
                    promo_discount_percent = Some(discount_value);
                } else {
                    promo_discount_amount = Some(discount_value);
                }
                promo_code_validated = Some(code_upper);
            }
        }
    }

    // Calculate price (BTC discount from admin settings)
    let btc_pct = btc_discount_percent(&platform_pool.0).await;
    let price = match calculate_btc_price(
        &body.tier,
        body.period_months,
        promo_discount_percent,
        promo_discount_amount,
        promo_discount_type.as_deref(),
        btc_pct,
    ) {
        Some(p) => p,
        None => {
            return HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "PRICE_ERROR", "message": "Could not calculate price." }
            }))
        }
    };

    // Create a correlation ID for idempotency
    let payment_id = Uuid::new_v4();
    let correlation_id = format!("sh-{}", payment_id.as_simple());

    let period_label = match body.period_months {
        1 => "1 month".to_string(),
        n => format!("{} months", n),
    };

    let tier_display = match body.tier.as_str() {
        "focus" => "Focus",
        "insight" => "Insight",
        "clarity" => "Clarity",
        "horizon" => "Horizon",
        other => other,
    };

    // Create Strike invoice
    let invoice_req = CreateInvoiceRequest {
        correlation_id: correlation_id.clone(),
        description: format!("Sovereign Health - {} ({})", tier_display, period_label),
        amount: InvoiceAmount {
            amount: format!("{:.2}", price.final_eur),
            currency: "EUR".to_string(),
        },
        is_reusable: false,
    };

    let invoice = match strike.create_invoice(invoice_req).await {
        Ok(inv) => inv,
        Err(e) => {
            tracing::error!("Strike create_invoice failed: {}", e);
            return HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "STRIKE_ERROR", "message": "Could not create Bitcoin invoice." }
            }));
        }
    };

    // Generate Lightning invoice (quote)
    let quote = match strike.create_invoice_quote(&invoice.invoice_id).await {
        Ok(q) => q,
        Err(e) => {
            tracing::error!("Strike create_invoice_quote failed: {}", e);
            // Invoice created but quote failed - cancel invoice
            let _ = strike.cancel_invoice(&invoice.invoice_id).await;
            return HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "STRIKE_ERROR", "message": "Could not generate Lightning invoice." }
            }));
        }
    };

    // Parse BTC amount from the quote
    let btc_amount: Option<f64> = quote
        .source_amount
        .as_ref()
        .and_then(|a| a.amount.parse::<f64>().ok());
    let sats: Option<i64> = btc_amount.map(|btc| (btc * 100_000_000.0) as i64);

    // Calculate expiry
    let expires_at = quote
        .expiration
        .as_ref()
        .and_then(|e| chrono::DateTime::parse_from_rfc3339(e).ok())
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|| Utc::now() + Duration::minutes(15));

    // Store in DB
    let insert_result = sqlx::query(
        r#"INSERT INTO btc_payments
           (id, user_id, strike_invoice_id, tier, period_months,
            amount_eur, amount_btc, amount_sats, btc_discount_percent,
            promo_code, promo_discount_eur, status,
            lightning_invoice, on_chain_address, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12, $13, $14)"#,
    )
    .bind(payment_id)
    .bind(user.user_id)
    .bind(&invoice.invoice_id)
    .bind(&body.tier)
    .bind(body.period_months as i32)
    .bind(price.final_eur)
    .bind(btc_amount)
    .bind(sats)
    .bind(price.btc_discount_percent)
    .bind(&promo_code_validated)
    .bind(price.promo_discount_eur)
    .bind(&quote.ln_invoice)
    .bind(&quote.onchain_address)
    .bind(expires_at)
    .execute(&platform_pool.0)
    .await;

    if let Err(e) = insert_result {
        tracing::error!("Failed to insert btc_payment: {}", e);
        let _ = strike.cancel_invoice(&invoice.invoice_id).await;
        return HttpResponse::InternalServerError().json(json!({
            "data": null,
            "error": { "code": "DB_ERROR", "message": "Could not save payment record." }
        }));
    }

    // Build unified payment URI for QR code
    // BIP21 + BOLT11: bitcoin:<address>?amount=<btc>&lightning=<bolt11>
    let qr_data = match (&quote.onchain_address, &quote.ln_invoice) {
        (Some(addr), Some(ln)) => {
            let btc_str = btc_amount.map_or("0".to_string(), |b| format!("{:.8}", b));
            format!("bitcoin:{}?amount={}&lightning={}", addr, btc_str, ln)
        }
        (None, Some(ln)) => ln.clone(),
        (Some(addr), None) => {
            let btc_str = btc_amount.map_or("0".to_string(), |b| format!("{:.8}", b));
            format!("bitcoin:{}?amount={}", addr, btc_str)
        }
        (None, None) => String::new(),
    };

    HttpResponse::Ok().json(json!({
        "data": {
            "invoice_id": payment_id,
            "strike_invoice_id": invoice.invoice_id,
            "tier": body.tier,
            "period_months": body.period_months,
            "price_breakdown": {
                "monthly_price": price.monthly_price,
                "base_total_eur": price.base_total_eur,
                "annual_discount_eur": price.annual_discount_eur,
                "promo_discount_eur": price.promo_discount_eur,
                "btc_discount_percent": price.btc_discount_percent,
                "btc_discount_eur": price.btc_discount_eur,
            },
            "amount_eur": price.final_eur,
            "amount_btc": btc_amount,
            "amount_sats": sats,
            "lightning_invoice": quote.ln_invoice,
            "on_chain_address": quote.onchain_address,
            "qr_data": qr_data,
            "expires_at": expires_at.to_rfc3339(),
            "promo_applied": promo_code_validated,
        },
        "error": null
    }))
}

// ---------------------------------------------------------------------------
// GET /billing/btc/check/{invoice_id}
// ---------------------------------------------------------------------------

pub async fn check_invoice(
    platform_pool: web::Data<PlatformPool>,
    strike: Option<web::Data<StrikeService>>,
    user: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> HttpResponse {
    let payment_id = path.into_inner();

    // Get payment record (verify ownership)
    let row = sqlx::query(
        r#"SELECT strike_invoice_id, status, paid_at, expires_at, tier, period_months
           FROM btc_payments WHERE id = $1 AND user_id = $2"#,
    )
    .bind(payment_id)
    .bind(user.user_id)
    .fetch_optional(&platform_pool.0)
    .await;

    let row = match row {
        Ok(Some(r)) => r,
        Ok(None) => {
            return HttpResponse::NotFound().json(json!({
                "data": null,
                "error": { "code": "NOT_FOUND", "message": "Payment not found." }
            }))
        }
        Err(e) => {
            tracing::error!("DB error: {}", e);
            return HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "INTERNAL", "message": "Database error." }
            }));
        }
    };

    let status: String = row.try_get("status").unwrap_or_default();
    let paid_at: Option<chrono::DateTime<Utc>> = row.try_get("paid_at").unwrap_or(None);
    let expires_at: Option<chrono::DateTime<Utc>> = row.try_get("expires_at").unwrap_or(None);
    let strike_invoice_id: String = row.try_get("strike_invoice_id").unwrap_or_default();

    // If already paid or expired, return immediately
    if status == "paid" {
        return HttpResponse::Ok().json(json!({
            "data": { "status": "paid", "paid_at": paid_at },
            "error": null
        }));
    }

    // Check if expired locally
    if let Some(exp) = expires_at {
        if Utc::now() > exp && status == "pending" {
            let _ = sqlx::query(
                "UPDATE btc_payments SET status = 'expired', updated_at = NOW() WHERE id = $1",
            )
            .bind(payment_id)
            .execute(&platform_pool.0)
            .await;
            return HttpResponse::Ok().json(json!({
                "data": { "status": "expired", "paid_at": null },
                "error": null
            }));
        }
    }

    // Poll Strike for status
    if let Some(ref strike) = strike {
        if let Ok(inv) = strike.get_invoice(&strike_invoice_id).await {
            match inv.state.as_str() {
                "PAID" => {
                    // Payment confirmed! Activate tier.
                    let tier: String = row.try_get("tier").unwrap_or_default();
                    let period_months: i32 = row.try_get("period_months").unwrap_or(1);
                    let now = Utc::now();
                    let prepaid_until = now + Duration::days(period_months as i64 * 30);

                    let _ = activate_btc_payment(
                        &platform_pool.0,
                        payment_id,
                        user.user_id,
                        &tier,
                        now,
                        prepaid_until,
                    )
                    .await;

                    return HttpResponse::Ok().json(json!({
                        "data": { "status": "paid", "paid_at": now.to_rfc3339() },
                        "error": null
                    }));
                }
                "CANCELLED" => {
                    let _ = sqlx::query(
                        "UPDATE btc_payments SET status = 'expired', updated_at = NOW() WHERE id = $1",
                    )
                    .bind(payment_id)
                    .execute(&platform_pool.0)
                    .await;
                    return HttpResponse::Ok().json(json!({
                        "data": { "status": "expired", "paid_at": null },
                        "error": null
                    }));
                }
                _ => {} // UNPAID or PENDING - still waiting
            }
        }
    }

    HttpResponse::Ok().json(json!({
        "data": { "status": status, "paid_at": null },
        "error": null
    }))
}

// ---------------------------------------------------------------------------
// POST /billing/btc/webhook (public, no JWT)
// ---------------------------------------------------------------------------

pub async fn webhook(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    strike: Option<web::Data<StrikeService>>,
    body: web::Bytes,
) -> HttpResponse {
    let strike = match strike {
        Some(s) => s,
        None => return HttpResponse::Ok().json(json!({ "received": true })),
    };

    let signature = match req.headers().get("X-Webhook-Signature") {
        Some(s) => s.to_str().unwrap_or(""),
        None => {
            tracing::warn!("Strike webhook missing X-Webhook-Signature header");
            return HttpResponse::Ok().json(json!({ "received": true }));
        }
    };

    let event = match strike.verify_webhook(&body, signature) {
        Ok(e) => e,
        Err(e) => {
            tracing::warn!("Strike webhook signature verification failed: {}", e);
            return HttpResponse::Ok().json(json!({ "received": true }));
        }
    };

    tracing::info!(
        "Strike webhook received: {} (type: {})",
        event.id,
        event.event_type
    );

    match event.event_type.as_str() {
        "invoice.updated" => {
            // Check if invoice was paid
            let invoice_id = event.data["entityId"].as_str().unwrap_or("");

            if invoice_id.is_empty() {
                return HttpResponse::Ok().json(json!({ "received": true }));
            }

            // Fetch full invoice from Strike to get latest state
            match strike.get_invoice(invoice_id).await {
                Ok(inv) if inv.state == "PAID" => {
                    if let Err(e) = handle_invoice_paid(&platform_pool.0, invoice_id).await {
                        tracing::error!("Failed to handle paid invoice {}: {}", invoice_id, e);
                    }
                }
                Ok(_) => {
                    tracing::info!("Strike invoice {} not yet paid", invoice_id);
                }
                Err(e) => {
                    tracing::error!("Failed to fetch Strike invoice {}: {}", invoice_id, e);
                }
            }
        }
        _ => {
            tracing::info!("Unhandled Strike webhook event type: {}", event.event_type);
        }
    }

    HttpResponse::Ok().json(json!({ "received": true }))
}

// ---------------------------------------------------------------------------
// GET /billing/btc/status - current BTC prepaid status
// ---------------------------------------------------------------------------

pub async fn btc_status(platform_pool: web::Data<PlatformPool>, user: AuthenticatedUser) -> HttpResponse {
    let row = sqlx::query(
        r#"SELECT id, tier, period_months, amount_eur, amount_btc, amount_sats,
                  status, paid_at, prepaid_from, prepaid_until, promo_code, created_at
           FROM btc_payments
           WHERE user_id = $1 AND status = 'paid'
           ORDER BY prepaid_until DESC LIMIT 1"#,
    )
    .bind(user.user_id)
    .fetch_optional(&platform_pool.0)
    .await;

    match row {
        Ok(Some(r)) => {
            let prepaid_until: Option<chrono::DateTime<Utc>> =
                r.try_get("prepaid_until").unwrap_or(None);
            let is_active = prepaid_until.is_some_and(|u| Utc::now() < u);

            HttpResponse::Ok().json(json!({
                "data": {
                    "has_btc_subscription": true,
                    "is_active": is_active,
                    "tier": r.try_get::<String, _>("tier").unwrap_or_default(),
                    "period_months": r.try_get::<i32, _>("period_months").unwrap_or(0),
                    "amount_eur": r.try_get::<f64, _>("amount_eur").unwrap_or(0.0),
                    "amount_sats": r.try_get::<Option<i64>, _>("amount_sats").unwrap_or(None),
                    "paid_at": r.try_get::<Option<chrono::DateTime<Utc>>, _>("paid_at").unwrap_or(None),
                    "prepaid_from": r.try_get::<Option<chrono::DateTime<Utc>>, _>("prepaid_from").unwrap_or(None),
                    "prepaid_until": prepaid_until,
                },
                "error": null
            }))
        }
        _ => HttpResponse::Ok().json(json!({
            "data": { "has_btc_subscription": false },
            "error": null
        })),
    }
}

// ---------------------------------------------------------------------------
// GET /billing/btc/prices - get BTC pricing table
// ---------------------------------------------------------------------------

pub async fn prices(platform_pool: web::Data<PlatformPool>, _user: AuthenticatedUser) -> HttpResponse {
    let btc_pct = btc_discount_percent(&platform_pool.0).await;
    let mut tiers = Vec::new();

    for (tier_slug, monthly) in TIER_PRICES {
        let mut periods = Vec::new();
        for period in [1u32, 3, 6, 12] {
            if let Some(price) = calculate_btc_price(tier_slug, period, None, None, None, btc_pct) {
                let effective_monthly = price.final_eur / period as f64;
                let total_savings_percent = if price.base_total_eur > 0.0 {
                    ((price.base_total_eur - price.final_eur) / price.base_total_eur * 100.0)
                        .round()
                } else {
                    0.0
                };
                periods.push(json!({
                    "period_months": period,
                    "total_eur": price.final_eur,
                    "effective_monthly_eur": (effective_monthly * 100.0).round() / 100.0,
                    "savings_percent": total_savings_percent,
                    "annual_discount_eur": price.annual_discount_eur,
                    "btc_discount_eur": price.btc_discount_eur,
                }));
            }
        }
        tiers.push(json!({
            "tier": tier_slug,
            "monthly_price_eur": monthly,
            "periods": periods,
        }));
    }

    HttpResponse::Ok().json(json!({
        "data": { "tiers": tiers, "btc_discount_percent": btc_pct },
        "error": null
    }))
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async fn handle_invoice_paid(pool: &PgPool, strike_invoice_id: &str) -> anyhow::Result<()> {
    // Find the payment record
    let row = sqlx::query(
        r#"SELECT id, user_id, tier, period_months, status, promo_code
           FROM btc_payments WHERE strike_invoice_id = $1"#,
    )
    .bind(strike_invoice_id)
    .fetch_optional(pool)
    .await?;

    let row = match row {
        Some(r) => r,
        None => {
            tracing::warn!(
                "Strike payment {} not found in btc_payments",
                strike_invoice_id
            );
            return Ok(());
        }
    };

    let status: String = row.try_get("status").unwrap_or_default();
    if status == "paid" {
        tracing::info!("Strike payment {} already processed", strike_invoice_id);
        return Ok(());
    }

    let payment_id: Uuid = row.try_get("id")?;
    let user_id: Uuid = row.try_get("user_id")?;
    let tier: String = row.try_get("tier")?;
    let period_months: i32 = row.try_get("period_months")?;
    let promo_code: Option<String> = row.try_get("promo_code").unwrap_or(None);

    let now = Utc::now();
    let prepaid_until = now + Duration::days(period_months as i64 * 30);

    activate_btc_payment(pool, payment_id, user_id, &tier, now, prepaid_until).await?;

    // Track promotion redemption if promo code was used
    if let Some(ref code) = promo_code {
        let promo_row = sqlx::query("SELECT id FROM promotions WHERE UPPER(code) = $1")
            .bind(code)
            .fetch_optional(pool)
            .await;

        if let Ok(Some(pr)) = promo_row {
            let promo_id: Uuid = pr.try_get("id").unwrap_or_default();
            let _ = sqlx::query(
                r#"INSERT INTO promotion_redemptions
                   (promotion_id, user_id, tier_at_redemption)
                   VALUES ($1, $2, $3)"#,
            )
            .bind(promo_id)
            .bind(user_id)
            .bind(&tier)
            .execute(pool)
            .await;

            let _ = sqlx::query(
                "UPDATE promotions SET redemption_count = redemption_count + 1, updated_at = NOW() WHERE id = $1",
            )
            .bind(promo_id)
            .execute(pool)
            .await;
        }
    }

    // Create affiliate conversion if user was referred
    {
        // BTC payment amount in cents (EUR)
        let row = sqlx::query("SELECT amount_eur FROM btc_payments WHERE id = $1")
            .bind(payment_id)
            .fetch_optional(pool)
            .await;
        if let Ok(Some(r)) = row {
            let amount_eur: f64 = r.try_get("amount_eur").unwrap_or(0.0);
            let amount_cents = (amount_eur * 100.0) as i32;
            if amount_cents > 0 {
                crate::handlers::affiliate::create_affiliate_conversion(
                    pool,
                    user_id,
                    amount_cents,
                )
                .await;
            }
        }
    }

    tracing::info!(
        "BTC payment {} activated: user={} tier={} until={}",
        payment_id,
        user_id,
        tier,
        prepaid_until
    );

    Ok(())
}

async fn activate_btc_payment(
    pool: &PgPool,
    payment_id: Uuid,
    user_id: Uuid,
    tier: &str,
    now: chrono::DateTime<Utc>,
    prepaid_until: chrono::DateTime<Utc>,
) -> anyhow::Result<()> {
    // Update payment record
    sqlx::query(
        r#"UPDATE btc_payments SET
           status = 'paid', paid_at = $1,
           prepaid_from = $1, prepaid_until = $2,
           updated_at = NOW()
           WHERE id = $3"#,
    )
    .bind(now)
    .bind(prepaid_until)
    .bind(payment_id)
    .execute(pool)
    .await?;

    // Get tier_id from license_tiers
    let tier_row = sqlx::query("SELECT id FROM license_tiers WHERE slug = $1")
        .bind(tier)
        .fetch_optional(pool)
        .await?;

    let tier_id: Uuid = match tier_row {
        Some(r) => r.try_get("id")?,
        None => return Ok(()), // unknown tier
    };

    // Check for admin override
    let has_override: bool = sqlx::query_scalar(
        "SELECT COALESCE(admin_override, false) FROM user_licenses WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .unwrap_or(false);

    if has_override {
        tracing::info!(
            "Skipping BTC tier update for user {} - admin override active",
            user_id
        );
        return Ok(());
    }

    // Update user_licenses
    sqlx::query(
        r#"INSERT INTO user_licenses (user_id, tier_id, status, payment_method, started_at)
           VALUES ($1, $2, 'active', 'strike_btc', NOW())
           ON CONFLICT (user_id) DO UPDATE SET
            tier_id = $2,
            status = 'active',
            payment_method = 'strike_btc',
            grace_period_ends = NULL,
            downgraded_at = NULL,
            updated_at = NOW()"#,
    )
    .bind(user_id)
    .bind(tier_id)
    .execute(pool)
    .await?;

    Ok(())
}
