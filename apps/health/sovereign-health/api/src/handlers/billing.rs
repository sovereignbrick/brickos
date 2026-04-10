// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpRequest, HttpResponse};
use chrono::{Duration, Utc};
use serde::Deserialize;
use serde_json::json;
use sqlx::{PgPool, Row};
use std::sync::Arc;
use uuid::Uuid;

use brickos_billing::stripe::StripeService;
use brickos_email::EmailProvider;

use crate::{
    config::Config,
    middleware::auth::{AdminUser, AuthenticatedUser},
    PlatformPool,
};

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct CheckoutRequest {
    pub tier: String,
    pub interval: String,
    pub promo_code: Option<String>,
    pub customer_type: Option<String>,
    pub company_name: Option<String>,
    pub vat_id: Option<String>,
}

#[derive(Deserialize)]
pub struct ChangePlanRequest {
    pub tier: String,
    pub interval: String,
}

#[derive(Deserialize)]
pub struct ChangeIntervalRequest {
    pub interval: String,
}

#[derive(Deserialize)]
pub struct CancelRequest {
    pub reason: Option<String>,
}

#[derive(Deserialize)]
pub struct RefundRequest {
    pub reason: Option<String>,
    pub full_refund: Option<bool>,
    pub force: Option<bool>,
}

// ---------------------------------------------------------------------------
// POST /billing/checkout
// ---------------------------------------------------------------------------

pub async fn checkout(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    config: web::Data<Config>,
    stripe: Option<web::Data<StripeService>>,
    user: AuthenticatedUser,
    body: web::Json<CheckoutRequest>,
) -> HttpResponse {
    // Check payment whitelist gate
    if let Err(resp) =
        crate::handlers::payments::check_payment_allowed(&req, &platform_pool.0).await
    {
        return resp;
    }

    let stripe =
        match stripe {
            Some(s) => s,
            None => return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "STRIPE_DISABLED", "message": "Payments are not configured." }
            })),
        };

    // Validate tier + interval
    let price_id =
        match stripe.price_id_for_tier(&body.tier, &body.interval) {
            Some(p) => p,
            None => return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "INVALID_PLAN", "message": "Invalid tier or billing interval." }
            })),
        };

    // Store billing fields (customer_type, company_name, vat_id) in user_profile
    let customer_type = body.customer_type.as_deref().unwrap_or("private");
    if customer_type != "private" && customer_type != "organization" {
        return HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "INVALID_CUSTOMER_TYPE", "message": "customer_type must be 'private' or 'organization'." }
        }));
    }

    let _ = sqlx::query(
        "UPDATE user_profile SET customer_type = $1, company_name = $2, vat_id = $3 WHERE user_id = $4",
    )
    .bind(customer_type)
    .bind(body.company_name.as_deref())
    .bind(body.vat_id.as_deref())
    .bind(user.user_id)
    .execute(&platform_pool.0)
    .await;

    // If organization with VAT ID, store in customer_tax_ids
    if customer_type == "organization" {
        if let Some(ref vat_id) = body.vat_id {
            let vat_id = vat_id.trim();
            if !vat_id.is_empty() {
                let tax_type = if vat_id.len() >= 2 {
                    let prefix = vat_id[..2].to_uppercase();
                    if prefix.chars().all(|c| c.is_ascii_uppercase()) {
                        format!("{}_vat", prefix.to_lowercase())
                    } else {
                        "eu_vat".to_string()
                    }
                } else {
                    "eu_vat".to_string()
                };

                let _ = sqlx::query(
                    r#"INSERT INTO customer_tax_ids (user_id, tax_type, tax_value, verification_status)
                       VALUES ($1, $2, $3, 'pending')
                       ON CONFLICT (stripe_tax_id) DO NOTHING"#,
                )
                .bind(user.user_id)
                .bind(&tax_type)
                .bind(vat_id)
                .execute(&platform_pool.0)
                .await;
            }
        }
    }

    // Get or create Stripe customer
    let customer_id = match get_or_create_customer(&platform_pool.0, &stripe, user.user_id).await {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Stripe customer creation failed: {}", e);
            return HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "STRIPE_ERROR", "message": "Could not initialize payment." }
            }));
        }
    };

    let frontend_url = config.frontend_url.clone();

    let mut metadata = std::collections::HashMap::new();
    metadata.insert("user_id".to_string(), user.user_id.to_string());
    metadata.insert("tier_slug".to_string(), body.tier.clone());
    metadata.insert("interval".to_string(), body.interval.clone());

    // Look up Stripe promotion code ID if a promo code was provided
    let stripe_promo_code_id: Option<String> = if let Some(ref code) = body.promo_code {
        let code_upper = code.trim().to_uppercase();
        sqlx::query_scalar::<_, Option<String>>(
            "SELECT stripe_promo_code_id FROM promotions WHERE UPPER(code) = $1 AND is_active = true",
        )
        .bind(&code_upper)
        .fetch_optional(&platform_pool.0)
        .await
        .ok()
        .flatten()
        .flatten()
    } else {
        None
    };

    if let Some(ref promo_code) = body.promo_code {
        metadata.insert("promo_code".to_string(), promo_code.clone());
    }

    match stripe
        .create_checkout_session_with_promo(
            &customer_id,
            &price_id,
            &format!("{}/settings?tab=license&payment=success", frontend_url),
            &format!("{}/settings?tab=license&payment=canceled", frontend_url),
            &metadata,
            stripe_promo_code_id.as_deref(),
        )
        .await
    {
        Ok(url) => HttpResponse::Ok().json(json!({
            "data": { "checkout_url": url },
            "error": null
        })),
        Err(e) => {
            tracing::error!("Stripe checkout session failed: {}", e);
            HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "STRIPE_ERROR", "message": "Could not create checkout session." }
            }))
        }
    }
}

// ---------------------------------------------------------------------------
// GET /billing/portal
// ---------------------------------------------------------------------------

pub async fn portal(
    platform_pool: web::Data<PlatformPool>,
    config: web::Data<Config>,
    stripe: Option<web::Data<StripeService>>,
    user: AuthenticatedUser,
) -> HttpResponse {
    let stripe =
        match stripe {
            Some(s) => s,
            None => return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "STRIPE_DISABLED", "message": "Payments are not configured." }
            })),
        };

    let customer_id = match get_stripe_customer_id(&platform_pool.0, user.user_id).await {
        Ok(Some(c)) => c,
        Ok(None) => {
            return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "NO_CUSTOMER", "message": "No billing account found." }
            }))
        }
        Err(e) => {
            tracing::error!("DB error fetching customer: {}", e);
            return HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "INTERNAL", "message": "Database error." }
            }));
        }
    };

    let frontend_url = config.frontend_url.clone();

    match stripe
        .create_billing_portal_session(&customer_id, &format!("{}/billing", frontend_url))
        .await
    {
        Ok(url) => HttpResponse::Ok().json(json!({
            "data": { "portal_url": url },
            "error": null
        })),
        Err(e) => {
            tracing::error!("Stripe portal session failed: {}", e);
            HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "STRIPE_ERROR", "message": "Could not open billing portal." }
            }))
        }
    }
}

// ---------------------------------------------------------------------------
// GET /billing/status
// ---------------------------------------------------------------------------

pub async fn status(
    platform_pool: web::Data<PlatformPool>,
    stripe: Option<web::Data<StripeService>>,
    user: AuthenticatedUser,
) -> HttpResponse {
    let stripe_enabled = stripe.is_some();

    let sub = sqlx::query(
        r#"SELECT stripe_subscription_id, stripe_price_id, tier_slug,
               billing_interval, status, current_period_start, current_period_end,
               cancel_at_period_end, cancelled_at, grace_period_end
           FROM subscriptions
           WHERE user_id = $1
           ORDER BY created_at DESC LIMIT 1"#,
    )
    .bind(user.user_id)
    .fetch_optional(&platform_pool.0)
    .await;

    // Check for active BTC prepaid payment
    let btc_info = sqlx::query(
        r#"SELECT tier, period_months, amount_eur, amount_sats,
                  paid_at, prepaid_from, prepaid_until
           FROM btc_payments
           WHERE user_id = $1 AND status = 'paid' AND prepaid_until > NOW()
           ORDER BY prepaid_until DESC LIMIT 1"#,
    )
    .bind(user.user_id)
    .fetch_optional(&platform_pool.0)
    .await;

    let btc_payment = match btc_info {
        Ok(Some(row)) => Some(json!({
            "tier": row.try_get::<String, _>("tier").unwrap_or_default(),
            "period_months": row.try_get::<i32, _>("period_months").unwrap_or(0),
            "amount_eur": row.try_get::<f64, _>("amount_eur").unwrap_or(0.0),
            "amount_sats": row.try_get::<Option<i64>, _>("amount_sats").unwrap_or(None),
            "paid_at": row.try_get::<Option<chrono::DateTime<Utc>>, _>("paid_at").unwrap_or(None),
            "prepaid_from": row.try_get::<Option<chrono::DateTime<Utc>>, _>("prepaid_from").unwrap_or(None),
            "prepaid_until": row.try_get::<Option<chrono::DateTime<Utc>>, _>("prepaid_until").unwrap_or(None),
        })),
        _ => None,
    };

    // Also get payment_method from user_licenses
    let payment_method: String = sqlx::query_scalar(
        "SELECT COALESCE(payment_method, 'stripe') FROM user_licenses WHERE user_id = $1",
    )
    .bind(user.user_id)
    .fetch_optional(&platform_pool.0)
    .await
    .unwrap_or(None)
    .unwrap_or_else(|| "stripe".to_string());

    match sub {
        Ok(Some(row)) => {
            let period_end: chrono::DateTime<Utc> = row.try_get("current_period_end").unwrap();
            let cancel_at_end: bool = row.try_get("cancel_at_period_end").unwrap_or(false);
            let grace_end: Option<chrono::DateTime<Utc>> =
                row.try_get("grace_period_end").ok().flatten();

            HttpResponse::Ok().json(json!({
                "data": {
                    "stripe_enabled": stripe_enabled,
                    "has_subscription": true,
                    "payment_method": payment_method,
                    "btc_payment": btc_payment,
                    "subscription": {
                        "tier_slug": row.try_get::<String, _>("tier_slug").unwrap_or_default(),
                        "billing_interval": row.try_get::<String, _>("billing_interval").unwrap_or_default(),
                        "status": row.try_get::<String, _>("status").unwrap_or_default(),
                        "current_period_end": period_end.to_rfc3339(),
                        "cancel_at_period_end": cancel_at_end,
                        "cancelled_at": row.try_get::<Option<chrono::DateTime<Utc>>, _>("cancelled_at").ok().flatten().map(|d| d.to_rfc3339()),
                        "grace_period_end": grace_end.map(|d| d.to_rfc3339()),
                    }
                },
                "error": null
            }))
        }
        Ok(None) => HttpResponse::Ok().json(json!({
            "data": {
                "stripe_enabled": stripe_enabled,
                "has_subscription": btc_payment.is_some(),
                "payment_method": payment_method,
                "btc_payment": btc_payment,
                "subscription": null
            },
            "error": null
        })),
        Err(e) => {
            tracing::error!("DB error fetching subscription: {}", e);
            HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "INTERNAL", "message": "Database error." }
            }))
        }
    }
}

// ---------------------------------------------------------------------------
// POST /billing/sync  — Fetch subscription from Stripe, update local DB
// ---------------------------------------------------------------------------

pub async fn sync(
    platform_pool: web::Data<PlatformPool>,
    stripe: Option<web::Data<StripeService>>,
    user: AuthenticatedUser,
) -> HttpResponse {
    let stripe =
        match stripe {
            Some(s) => s,
            None => return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "STRIPE_DISABLED", "message": "Payments are not configured." }
            })),
        };

    // Get stripe_customer_id from DB
    let customer_id: Option<String> =
        sqlx::query_scalar("SELECT stripe_customer_id FROM users WHERE id = $1")
            .bind(user.user_id)
            .fetch_optional(&platform_pool.0)
            .await
            .unwrap_or(None)
            .flatten();

    let customer_id = match customer_id {
        Some(c) if !c.is_empty() => c,
        _ => {
            return HttpResponse::Ok().json(json!({
                "data": { "synced": false, "reason": "no_stripe_customer" },
                "error": null
            }))
        }
    };

    // Fetch active subscriptions from Stripe
    let subs = match stripe.list_customer_subscriptions(&customer_id).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Stripe list subscriptions failed: {}", e);
            return HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "STRIPE_ERROR", "message": "Could not fetch subscriptions from Stripe." }
            }));
        }
    };

    let sub_data = &subs["data"];
    if !sub_data.is_array() || sub_data.as_array().map(|a| a.is_empty()).unwrap_or(true) {
        return HttpResponse::Ok().json(json!({
            "data": { "synced": false, "reason": "no_active_subscription" },
            "error": null
        }));
    }

    let sub = &sub_data[0];
    let subscription_id = sub["id"].as_str().unwrap_or("");
    let price_id = sub["items"]["data"][0]["price"]["id"]
        .as_str()
        .unwrap_or("");
    let period_start = sub["current_period_start"].as_i64().unwrap_or(0);
    let period_end = sub["current_period_end"].as_i64().unwrap_or(0);
    let cancel_at_end = sub["cancel_at_period_end"].as_bool().unwrap_or(false);
    let status_str = sub["status"].as_str().unwrap_or("active");

    // Map price_id to tier
    let (tier_slug, interval) = match stripe.tier_from_price_id(price_id) {
        Some(t) => t,
        None => {
            tracing::warn!("Unknown price_id {} from Stripe subscription", price_id);
            return HttpResponse::Ok().json(json!({
                "data": { "synced": false, "reason": "unknown_price_id" },
                "error": null
            }));
        }
    };

    let period_start_dt =
        chrono::DateTime::from_timestamp(period_start, 0).unwrap_or_else(Utc::now);
    let period_end_dt = chrono::DateTime::from_timestamp(period_end, 0).unwrap_or_else(Utc::now);

    // Upsert subscription record
    if let Err(e) = sqlx::query(
        r#"INSERT INTO subscriptions
           (user_id, stripe_subscription_id, stripe_price_id, tier_slug,
            billing_interval, status, current_period_start, current_period_end,
            cancel_at_period_end)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (stripe_subscription_id) DO UPDATE SET
            status = $6,
            stripe_price_id = $3,
            tier_slug = $4,
            billing_interval = $5,
            current_period_start = $7,
            current_period_end = $8,
            cancel_at_period_end = $9,
            updated_at = NOW()"#,
    )
    .bind(user.user_id)
    .bind(subscription_id)
    .bind(price_id)
    .bind(&tier_slug)
    .bind(&interval)
    .bind(status_str)
    .bind(period_start_dt)
    .bind(period_end_dt)
    .bind(cancel_at_end)
    .execute(&platform_pool.0)
    .await
    {
        tracing::error!("DB error upserting subscription: {}", e);
        return HttpResponse::InternalServerError().json(json!({
            "data": null,
            "error": { "code": "INTERNAL", "message": "Database error." }
        }));
    }

    // Update user tier
    if let Err(e) = update_user_tier(&platform_pool.0, user.user_id, &tier_slug).await {
        tracing::error!("Failed to update user tier: {}", e);
    }

    // Fetch payment method details
    let payment_method_info = match stripe.list_payment_methods(&customer_id).await {
        Ok(pm) => {
            let methods = pm["data"].as_array();
            methods.and_then(|arr| arr.first()).map(|m| {
                json!({
                    "brand": m["card"]["brand"].as_str().unwrap_or(""),
                    "last4": m["card"]["last4"].as_str().unwrap_or(""),
                    "exp_month": m["card"]["exp_month"].as_u64().unwrap_or(0),
                    "exp_year": m["card"]["exp_year"].as_u64().unwrap_or(0),
                })
            })
        }
        Err(_) => None,
    };

    // Fetch recent invoices from Stripe
    let stripe_invoices = match stripe.list_customer_invoices(&customer_id, 10).await {
        Ok(inv) => {
            let items = inv["data"].as_array();
            items
                .map(|arr| {
                    arr.iter()
                        .map(|i| {
                            json!({
                                "id": i["id"].as_str().unwrap_or(""),
                                "number": i["number"].as_str().unwrap_or(""),
                                "amount_paid": i["amount_paid"].as_i64().unwrap_or(0),
                                "currency": i["currency"].as_str().unwrap_or("eur"),
                                "status": i["status"].as_str().unwrap_or(""),
                                "created": i["created"].as_i64().unwrap_or(0),
                                "invoice_pdf": i["invoice_pdf"].as_str().unwrap_or(""),
                                "hosted_invoice_url": i["hosted_invoice_url"].as_str().unwrap_or(""),
                            })
                        })
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default()
        }
        Err(_) => vec![],
    };

    HttpResponse::Ok().json(json!({
        "data": {
            "synced": true,
            "tier_slug": tier_slug,
            "billing_interval": interval,
            "status": status_str,
            "current_period_end": period_end_dt.to_rfc3339(),
            "cancel_at_period_end": cancel_at_end,
            "payment_method": payment_method_info,
            "invoices": stripe_invoices,
        },
        "error": null
    }))
}

// ---------------------------------------------------------------------------
// POST /billing/change-plan
// ---------------------------------------------------------------------------

pub async fn change_plan(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    stripe: Option<web::Data<StripeService>>,
    user: AuthenticatedUser,
    body: web::Json<ChangePlanRequest>,
) -> HttpResponse {
    // Check payment whitelist gate
    if let Err(resp) =
        crate::handlers::payments::check_payment_allowed(&req, &platform_pool.0).await
    {
        return resp;
    }

    let stripe =
        match stripe {
            Some(s) => s,
            None => return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "STRIPE_DISABLED", "message": "Payments are not configured." }
            })),
        };

    let new_price_id =
        match stripe.price_id_for_tier(&body.tier, &body.interval) {
            Some(p) => p,
            None => return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "INVALID_PLAN", "message": "Invalid tier or billing interval." }
            })),
        };

    // Get current subscription
    let sub = sqlx::query(
        "SELECT stripe_subscription_id, tier_slug FROM subscriptions \
         WHERE user_id = $1 AND status IN ('active', 'past_due') \
         ORDER BY created_at DESC LIMIT 1",
    )
    .bind(user.user_id)
    .fetch_optional(&platform_pool.0)
    .await;

    let sub = match sub {
        Ok(Some(s)) => s,
        Ok(None) => return HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "NO_SUBSCRIPTION", "message": "No active subscription to change." }
        })),
        Err(e) => {
            tracing::error!("DB error: {}", e);
            return HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "INTERNAL", "message": "Database error." }
            }));
        }
    };

    let sub_id: String = sub.try_get("stripe_subscription_id").unwrap();
    let current_tier: String = sub.try_get("tier_slug").unwrap_or_default();

    // Determine if upgrade or downgrade
    let is_upgrade = tier_rank(&body.tier) > tier_rank(&current_tier);

    match stripe
        .update_subscription(&sub_id, &new_price_id, is_upgrade)
        .await
    {
        Ok(()) => HttpResponse::Ok().json(json!({
            "data": {
                "message": if is_upgrade {
                    "Plan upgraded. Changes take effect immediately."
                } else {
                    "Plan will change at the end of your current billing period."
                }
            },
            "error": null
        })),
        Err(e) => {
            tracing::error!("Stripe update subscription failed: {}", e);
            HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "STRIPE_ERROR", "message": "Could not update plan." }
            }))
        }
    }
}

// ---------------------------------------------------------------------------
// POST /billing/change-interval
// ---------------------------------------------------------------------------

pub async fn change_interval(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    stripe: Option<web::Data<StripeService>>,
    user: AuthenticatedUser,
    body: web::Json<ChangeIntervalRequest>,
) -> HttpResponse {
    if let Err(resp) =
        crate::handlers::payments::check_payment_allowed(&req, &platform_pool.0).await
    {
        return resp;
    }

    let stripe =
        match stripe {
            Some(s) => s,
            None => return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "STRIPE_DISABLED", "message": "Payments are not configured." }
            })),
        };

    let new_interval = body.interval.as_str();
    if new_interval != "monthly" && new_interval != "annual" {
        return HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "INVALID_INTERVAL", "message": "Interval must be 'monthly' or 'annual'." }
        }));
    }

    let sub = sqlx::query(
        "SELECT stripe_subscription_id, tier_slug, billing_interval FROM subscriptions \
         WHERE user_id = $1 AND status IN ('active', 'past_due') \
         ORDER BY created_at DESC LIMIT 1",
    )
    .bind(user.user_id)
    .fetch_optional(&platform_pool.0)
    .await;

    let sub = match sub {
        Ok(Some(s)) => s,
        Ok(None) => return HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "NO_SUBSCRIPTION", "message": "No active subscription to change." }
        })),
        Err(e) => {
            tracing::error!("DB error: {}", e);
            return HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "INTERNAL", "message": "Database error." }
            }));
        }
    };

    let sub_id: String = sub.try_get("stripe_subscription_id").unwrap();
    let tier_slug: String = sub.try_get("tier_slug").unwrap_or_default();
    let current_interval: String = sub.try_get("billing_interval").unwrap_or_default();

    if current_interval == new_interval {
        return HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "SAME_INTERVAL", "message": "Already on this billing interval." }
        }));
    }

    let new_price_id =
        match stripe.price_id_for_tier(&tier_slug, new_interval) {
            Some(p) => p,
            None => return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "INVALID_PLAN", "message": "No price found for this interval." }
            })),
        };

    // Monthly -> annual: prorate immediately (user gets yearly discount now)
    // Annual -> monthly: takes effect at next billing (no prorate)
    let prorate = new_interval == "annual";

    match stripe
        .update_subscription(&sub_id, &new_price_id, prorate)
        .await
    {
        Ok(()) => HttpResponse::Ok().json(json!({
            "data": {
                "message": if prorate {
                    "Switched to annual billing. Changes take effect immediately."
                } else {
                    "Will switch to monthly billing at the end of your current period."
                }
            },
            "error": null
        })),
        Err(e) => {
            tracing::error!("Stripe update interval failed: {}", e);
            HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "STRIPE_ERROR", "message": "Could not change billing interval." }
            }))
        }
    }
}

// ---------------------------------------------------------------------------
// GET /billing/history
// ---------------------------------------------------------------------------

pub async fn payment_history(
    platform_pool: web::Data<PlatformPool>,
    user: AuthenticatedUser,
) -> HttpResponse {
    let rows = sqlx::query(
        r#"SELECT stripe_event_id, event_type, amount_cents, status, created_at
           FROM payment_events
           WHERE user_id = $1
           AND event_type IN ('checkout.session.completed', 'invoice.payment_succeeded', 'invoice.payment_failed')
           ORDER BY created_at DESC
           LIMIT 50"#,
    )
    .bind(user.user_id)
    .fetch_all(&platform_pool.0)
    .await;

    match rows {
        Ok(rows) => {
            let payments: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    json!({
                        "event_type": r.try_get::<String, _>("event_type").unwrap_or_default(),
                        "amount_cents": r.try_get::<Option<i32>, _>("amount_cents").unwrap_or(None),
                        "status": r.try_get::<String, _>("status").unwrap_or_default(),
                        "created_at": r.try_get::<chrono::DateTime<Utc>, _>("created_at")
                            .map(|d| d.to_rfc3339())
                            .unwrap_or_default(),
                    })
                })
                .collect();

            HttpResponse::Ok().json(json!({
                "data": { "payments": payments },
                "error": null
            }))
        }
        Err(e) => {
            tracing::error!("DB error fetching payment history: {}", e);
            HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "INTERNAL", "message": "Database error." }
            }))
        }
    }
}

// ---------------------------------------------------------------------------
// POST /billing/cancel
// ---------------------------------------------------------------------------

pub async fn cancel(
    platform_pool: web::Data<PlatformPool>,
    stripe: Option<web::Data<StripeService>>,
    user: AuthenticatedUser,
    notifier: web::Data<crate::services::notify::Notifier>,
    body: Option<web::Json<CancelRequest>>,
) -> HttpResponse {
    let stripe =
        match stripe {
            Some(s) => s,
            None => return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "STRIPE_DISABLED", "message": "Payments are not configured." }
            })),
        };

    let sub = sqlx::query(
        "SELECT stripe_subscription_id, current_period_end FROM subscriptions \
         WHERE user_id = $1 AND status IN ('active', 'past_due') \
         ORDER BY created_at DESC LIMIT 1",
    )
    .bind(user.user_id)
    .fetch_optional(&platform_pool.0)
    .await;

    let sub = match sub {
        Ok(Some(s)) => s,
        Ok(None) => {
            return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "NO_SUBSCRIPTION", "message": "No active subscription." }
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

    let sub_id: String = sub.try_get("stripe_subscription_id").unwrap();
    let period_end: chrono::DateTime<Utc> = sub.try_get("current_period_end").unwrap();

    let cancel_reason = body
        .as_ref()
        .and_then(|b| b.reason.as_deref())
        .unwrap_or("")
        .to_string();

    match stripe.cancel_subscription(&sub_id, true).await {
        Ok(()) => {
            // Update local record with optional cancellation reason
            let _ = sqlx::query(
                "UPDATE subscriptions SET cancel_at_period_end = true, \
                 cancelled_at = NOW(), cancellation_reason = NULLIF($2, ''), updated_at = NOW() \
                 WHERE stripe_subscription_id = $1",
            )
            .bind(&sub_id)
            .bind(&cancel_reason)
            .execute(&platform_pool.0)
            .await;

            // Notify admins
            notifier.send(
                crate::services::notify::Channel::Billing,
                crate::services::notify::Priority::High,
                "Cancellation requested",
                &format!(
                    "user_id={} ends={} reason={}",
                    user.user_id,
                    period_end.format("%Y-%m-%d"),
                    if cancel_reason.is_empty() {
                        "none"
                    } else {
                        &cancel_reason
                    }
                ),
            );

            HttpResponse::Ok().json(json!({
                "data": {
                    "message": format!("Subscription will end on {}.", period_end.format("%B %d, %Y")),
                    "ends_at": period_end.to_rfc3339()
                },
                "error": null
            }))
        }
        Err(e) => {
            tracing::error!("Stripe cancel failed: {}", e);
            HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "STRIPE_ERROR", "message": "Could not cancel subscription." }
            }))
        }
    }
}

// ---------------------------------------------------------------------------
// POST /billing/reactivate
// ---------------------------------------------------------------------------

pub async fn reactivate(
    platform_pool: web::Data<PlatformPool>,
    stripe: Option<web::Data<StripeService>>,
    user: AuthenticatedUser,
    notifier: web::Data<crate::services::notify::Notifier>,
) -> HttpResponse {
    let stripe =
        match stripe {
            Some(s) => s,
            None => return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "STRIPE_DISABLED", "message": "Payments are not configured." }
            })),
        };

    let sub = sqlx::query(
        "SELECT stripe_subscription_id, cancel_at_period_end, status FROM subscriptions \
         WHERE user_id = $1 AND status IN ('active', 'past_due') \
         AND cancel_at_period_end = true \
         ORDER BY created_at DESC LIMIT 1",
    )
    .bind(user.user_id)
    .fetch_optional(&platform_pool.0)
    .await;

    let sub = match sub {
        Ok(Some(s)) => s,
        Ok(None) => {
            return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "NOT_CANCELLING", "message": "No pending cancellation to reactivate." }
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

    let sub_id: String = sub.try_get("stripe_subscription_id").unwrap();

    match stripe.reactivate_subscription(&sub_id).await {
        Ok(()) => {
            let _ = sqlx::query(
                "UPDATE subscriptions SET cancel_at_period_end = false, \
                 cancelled_at = NULL, updated_at = NOW() \
                 WHERE stripe_subscription_id = $1",
            )
            .bind(&sub_id)
            .execute(&platform_pool.0)
            .await;

            // Notify admins
            notifier.send(
                crate::services::notify::Channel::Billing,
                crate::services::notify::Priority::Default,
                "Subscription reactivated",
                &format!("user_id={}", user.user_id),
            );

            HttpResponse::Ok().json(json!({
                "data": { "message": "Subscription reactivated." },
                "error": null
            }))
        }
        Err(e) => {
            tracing::error!("Stripe reactivate failed: {}", e);
            HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "STRIPE_ERROR", "message": "Could not reactivate subscription." }
            }))
        }
    }
}

// ---------------------------------------------------------------------------
// POST /billing/webhook (public, no JWT)
// ---------------------------------------------------------------------------

pub async fn webhook(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    config: web::Data<Config>,
    stripe: Option<web::Data<StripeService>>,
    email_provider: web::Data<Arc<dyn EmailProvider>>,
    notifier: web::Data<crate::services::notify::Notifier>,
    body: web::Bytes,
) -> HttpResponse {
    let stripe = match stripe {
        Some(s) => s,
        None => return HttpResponse::Ok().json(json!({ "received": true })),
    };

    let signature = match req.headers().get("Stripe-Signature") {
        Some(s) => s.to_str().unwrap_or(""),
        None => {
            tracing::warn!("Webhook missing Stripe-Signature header");
            return HttpResponse::Ok().json(json!({ "received": true }));
        }
    };

    let event = match stripe.verify_webhook(&body, signature) {
        Ok(e) => e,
        Err(e) => {
            tracing::warn!("Webhook signature verification failed: {}", e);
            return HttpResponse::Ok().json(json!({ "received": true }));
        }
    };

    let event_id = event["id"].as_str().unwrap_or("").to_string();
    let event_type = event["type"].as_str().unwrap_or("").to_string();

    // Idempotency check
    let existing = sqlx::query("SELECT id FROM payment_events WHERE stripe_event_id = $1")
        .bind(&event_id)
        .fetch_optional(&platform_pool.0)
        .await;

    if matches!(existing, Ok(Some(_))) {
        tracing::info!("Webhook event {} already processed, skipping", event_id);
        return HttpResponse::Ok().json(json!({ "received": true }));
    }

    match event_type.as_str() {
        "checkout.session.completed" => {
            if let Err(e) = handle_checkout_completed(
                &platform_pool.0,
                &stripe,
                &email_provider,
                &config,
                &notifier,
                &event,
                &event_id,
            )
            .await
            {
                tracing::error!("Error handling checkout.session.completed: {}", e);
            }
        }
        "customer.subscription.updated" => {
            if let Err(e) = handle_subscription_updated(
                &platform_pool.0,
                &stripe,
                &email_provider,
                &config,
                &notifier,
                &event,
                &event_id,
            )
            .await
            {
                tracing::error!("Error handling customer.subscription.updated: {}", e);
            }
        }
        "customer.subscription.deleted" => {
            if let Err(e) = handle_subscription_deleted(
                &platform_pool.0,
                &email_provider,
                &config,
                &notifier,
                &event,
                &event_id,
            )
            .await
            {
                tracing::error!("Error handling customer.subscription.deleted: {}", e);
            }
        }
        "invoice.payment_succeeded" => {
            if let Err(e) =
                handle_invoice_payment(&platform_pool.0, &notifier, &event, &event_id, "succeeded")
                    .await
            {
                tracing::error!("Error handling invoice.payment_succeeded: {}", e);
            }
        }
        "invoice.payment_failed" => {
            if let Err(e) =
                handle_invoice_payment(&platform_pool.0, &notifier, &event, &event_id, "failed")
                    .await
            {
                tracing::error!("Error handling invoice.payment_failed: {}", e);
            }
        }
        "charge.refunded" => {
            if let Err(e) =
                handle_charge_refunded(&platform_pool.0, &notifier, &event, &event_id).await
            {
                tracing::error!("Error handling charge.refunded: {}", e);
            }
        }
        _ => {
            tracing::info!("Unhandled webhook event type: {}", event_type);
        }
    }

    HttpResponse::Ok().json(json!({ "received": true }))
}

// ---------------------------------------------------------------------------
// Webhook event handlers
// ---------------------------------------------------------------------------

async fn handle_checkout_completed(
    pool: &PgPool,
    stripe: &StripeService,
    email_provider: &Arc<dyn EmailProvider>,
    config: &Config,
    notifier: &crate::services::notify::Notifier,
    event: &serde_json::Value,
    event_id: &str,
) -> anyhow::Result<()> {
    let session = &event["data"]["object"];
    let user_id_str = session["metadata"]["user_id"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("No user_id in metadata"))?;
    let user_id: Uuid = user_id_str.parse()?;
    let tier_slug = session["metadata"]["tier_slug"]
        .as_str()
        .unwrap_or("unknown")
        .to_string();
    let interval = session["metadata"]["interval"]
        .as_str()
        .unwrap_or("monthly")
        .to_string();

    let subscription_id = session["subscription"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("No subscription in checkout session"))?;

    // Get subscription details from Stripe
    let sub = stripe.get_subscription(subscription_id).await?;
    let price_id = sub["items"]["data"][0]["price"]["id"]
        .as_str()
        .unwrap_or("")
        .to_string();
    let period_start = sub["current_period_start"].as_i64().unwrap_or(0);
    let period_end = sub["current_period_end"].as_i64().unwrap_or(0);
    let period_start_dt =
        chrono::DateTime::from_timestamp(period_start, 0).unwrap_or_else(Utc::now);
    let period_end_dt = chrono::DateTime::from_timestamp(period_end, 0).unwrap_or_else(Utc::now);

    // Create subscription record
    sqlx::query(
        r#"INSERT INTO subscriptions
           (user_id, stripe_subscription_id, stripe_price_id, tier_slug,
            billing_interval, status, current_period_start, current_period_end)
           VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
           ON CONFLICT (stripe_subscription_id) DO UPDATE SET
            status = 'active',
            stripe_price_id = $3,
            tier_slug = $4,
            billing_interval = $5,
            current_period_start = $6,
            current_period_end = $7,
            updated_at = NOW()"#,
    )
    .bind(user_id)
    .bind(subscription_id)
    .bind(&price_id)
    .bind(&tier_slug)
    .bind(&interval)
    .bind(period_start_dt)
    .bind(period_end_dt)
    .execute(pool)
    .await?;

    // Update user tier in user_licenses
    update_user_tier(pool, user_id, &tier_slug).await?;

    // Notify admins
    notifier.send(
        crate::services::notify::Channel::Billing,
        crate::services::notify::Priority::Default,
        "New subscription",
        &format!(
            "user_id={} tier={} interval={}",
            user_id, tier_slug, interval
        ),
    );

    // Track promotion redemption if promo code was used
    let promo_code = session["metadata"]["promo_code"]
        .as_str()
        .map(|s| s.to_uppercase());
    if let Some(ref code) = promo_code {
        let promo_row = sqlx::query("SELECT id FROM promotions WHERE UPPER(code) = $1")
            .bind(code)
            .fetch_optional(pool)
            .await;

        if let Ok(Some(pr)) = promo_row {
            let promo_id: Uuid = pr.try_get("id").unwrap_or_default();
            let _ = sqlx::query(
                r#"INSERT INTO promotion_redemptions (promotion_id, user_id, stripe_subscription_id, tier_at_redemption)
                   VALUES ($1, $2, $3, $4)"#,
            )
            .bind(promo_id)
            .bind(user_id)
            .bind(subscription_id)
            .bind(&tier_slug)
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
        // Determine order amount from the subscription price
        let amount_cents = sub["items"]["data"][0]["price"]["unit_amount"]
            .as_i64()
            .unwrap_or(0) as i32;
        if amount_cents > 0 {
            crate::handlers::affiliate::create_affiliate_conversion(pool, user_id, amount_cents)
                .await;
        }
    }

    // Log payment event
    log_payment_event(
        pool,
        Some(user_id),
        event_id,
        "checkout.session.completed",
        None,
        "completed",
    )
    .await?;

    // Send welcome email + update Mailgun tags (non-blocking)
    let email = get_user_email(pool, user_id).await.unwrap_or_default();
    if !email.is_empty() {
        let ep = email_provider.clone();
        let ep2 = email_provider.clone();
        let tier_name = tier_display_name(&tier_slug);
        let email_clone = email.clone();
        let tag = format!("tier:{}", tier_slug);
        let product_name = config.product_name.clone();
        let billing_url = format!("{}/billing", config.frontend_url);
        tokio::spawn(async move {
            let subject = format!("Welcome to {} - {}", tier_name, product_name);
            let html = format!(
                "<h2>Welcome to {}!</h2>\
                 <p>Your subscription is now active. You have access to all {} features.</p>\
                 <p>Visit your <a href=\"{billing_url}\">billing page</a> to manage your subscription.</p>\
                 <p>-- The {product_name} Team</p>",
                tier_name, tier_name, billing_url = billing_url, product_name = product_name
            );
            let text = format!(
                "Welcome to {}! Your subscription is now active. Visit {} to manage your subscription.",
                tier_name, billing_url
            );
            if let Err(e) = ep.send(&email_clone, &subject, &html, &text).await {
                tracing::warn!("Failed to send tier welcome email: {}", e);
            }
        });
        tokio::spawn(async move {
            let _ = ep2.update_tags(&email, &[tag], &[]).await;
        });
    }

    Ok(())
}

async fn handle_subscription_updated(
    pool: &PgPool,
    stripe: &StripeService,
    email_provider: &Arc<dyn EmailProvider>,
    config: &Config,
    notifier: &crate::services::notify::Notifier,
    event: &serde_json::Value,
    event_id: &str,
) -> anyhow::Result<()> {
    let sub = &event["data"]["object"];
    let sub_id = sub["id"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("No subscription id"))?;
    let stripe_status = sub["status"].as_str().unwrap_or("active");
    let cancel_at_end = sub["cancel_at_period_end"].as_bool().unwrap_or(false);
    let period_start = sub["current_period_start"].as_i64().unwrap_or(0);
    let period_end = sub["current_period_end"].as_i64().unwrap_or(0);
    let period_start_dt =
        chrono::DateTime::from_timestamp(period_start, 0).unwrap_or_else(Utc::now);
    let period_end_dt = chrono::DateTime::from_timestamp(period_end, 0).unwrap_or_else(Utc::now);

    let price_id = sub["items"]["data"][0]["price"]["id"]
        .as_str()
        .unwrap_or("");

    // Check if tier changed
    let (new_tier, new_interval) = stripe
        .tier_from_price_id(price_id)
        .unwrap_or_else(|| ("unknown".to_string(), "monthly".to_string()));

    let status = map_stripe_status(stripe_status);

    // Get previous tier from our DB
    let prev = sqlx::query(
        "SELECT tier_slug, user_id FROM subscriptions WHERE stripe_subscription_id = $1",
    )
    .bind(sub_id)
    .fetch_optional(pool)
    .await?;

    let (prev_tier, user_id) = match prev {
        Some(row) => (
            row.try_get::<String, _>("tier_slug").unwrap_or_default(),
            row.try_get::<Uuid, _>("user_id").ok(),
        ),
        None => (String::new(), None),
    };

    // Update subscription record
    sqlx::query(
        r#"UPDATE subscriptions SET
           stripe_price_id = $1, tier_slug = $2, billing_interval = $3,
           status = $4, current_period_start = $5, current_period_end = $6,
           cancel_at_period_end = $7, updated_at = NOW()
           WHERE stripe_subscription_id = $8"#,
    )
    .bind(price_id)
    .bind(&new_tier)
    .bind(&new_interval)
    .bind(&status)
    .bind(period_start_dt)
    .bind(period_end_dt)
    .bind(cancel_at_end)
    .bind(sub_id)
    .execute(pool)
    .await?;

    // If tier changed, update user_licenses
    if !prev_tier.is_empty() && prev_tier != new_tier {
        if let Some(uid) = user_id {
            update_user_tier(pool, uid, &new_tier).await?;

            // Notify admins
            notifier.send(
                crate::services::notify::Channel::Billing,
                crate::services::notify::Priority::Default,
                "Plan changed",
                &format!("user_id={} {} → {}", uid, prev_tier, new_tier),
            );

            // Send tier change email
            let email = get_user_email(pool, uid).await.unwrap_or_default();
            if !email.is_empty() {
                let ep = email_provider.clone();
                let tier_name = tier_display_name(&new_tier);
                let product_name = config.product_name.clone();
                let billing_url = format!("{}/billing", config.frontend_url);
                tokio::spawn(async move {
                    let subject = format!("Your plan has changed - {}", product_name);
                    let html = format!(
                        "<h2>Plan Updated</h2>\
                         <p>Your plan has been changed to <strong>{}</strong>.</p>\
                         <p>Visit your <a href=\"{}\">billing page</a> for details.</p>",
                        tier_name, billing_url
                    );
                    let text = format!("Your plan has been changed to {}.", tier_name);
                    if let Err(e) = ep.send(&email, &subject, &html, &text).await {
                        tracing::warn!("Failed to send tier change email: {}", e);
                    }
                });
            }
        }
    }

    log_payment_event(
        pool,
        user_id,
        event_id,
        "customer.subscription.updated",
        None,
        &status,
    )
    .await?;

    Ok(())
}

async fn handle_subscription_deleted(
    pool: &PgPool,
    email_provider: &Arc<dyn EmailProvider>,
    config: &Config,
    notifier: &crate::services::notify::Notifier,
    event: &serde_json::Value,
    event_id: &str,
) -> anyhow::Result<()> {
    let sub = &event["data"]["object"];
    let sub_id = sub["id"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("No subscription id"))?;

    let grace_end = Utc::now() + Duration::days(config.grace_period_days);

    let row = sqlx::query(
        r#"UPDATE subscriptions SET
           status = 'cancelled', cancelled_at = NOW(),
           grace_period_end = $1, updated_at = NOW()
           WHERE stripe_subscription_id = $2
           RETURNING user_id, tier_slug"#,
    )
    .bind(grace_end)
    .bind(sub_id)
    .fetch_optional(pool)
    .await?;

    if let Some(row) = row {
        let user_id: Uuid = row.try_get("user_id")?;
        let tier_slug: String = row.try_get("tier_slug").unwrap_or_default();

        // Notify admins
        notifier.send(
            crate::services::notify::Channel::Billing,
            crate::services::notify::Priority::High,
            "Subscription cancelled",
            &format!(
                "user_id={} tier={} — grace period until {}",
                user_id,
                tier_slug,
                grace_end.format("%Y-%m-%d")
            ),
        );

        // Start grace period downgrade in user_licenses
        // The tier enforcement checks grace_period_end at request time (Task 7)
        let _ = sqlx::query(
            r#"UPDATE user_licenses SET
               status = 'downgrade_grace',
               previous_tier_slug = $1,
               grace_period_ends = $2,
               downgraded_at = NOW(),
               updated_at = NOW()
               WHERE user_id = $3"#,
        )
        .bind(&tier_slug)
        .bind(grace_end)
        .bind(user_id)
        .execute(pool)
        .await;

        // Send cancellation email
        let email = get_user_email(pool, user_id).await.unwrap_or_default();
        if !email.is_empty() {
            let ep = email_provider.clone();
            let tier_name = tier_display_name(&tier_slug);
            let grace_str = grace_end.format("%B %d, %Y").to_string();
            let product_name = config.product_name.clone();
            let pricing_url = format!("{}/pricing", config.frontend_url);
            let gp_days = config.grace_period_days;
            tokio::spawn(async move {
                let subject = format!("Your subscription has been cancelled - {}", product_name);
                let html = format!(
                    "<h2>Subscription Cancelled</h2>\
                     <p>Your {} subscription has been cancelled.</p>\
                     <p>You will keep your {} features until <strong>{}</strong> ({}-day grace period).</p>\
                     <p>After that, your account will switch to the free Glimpse plan. Your data is never deleted.</p>\
                     <p>You can resubscribe anytime at <a href=\"{}\">{}</a>.</p>",
                    tier_name, tier_name, grace_str, gp_days, pricing_url, pricing_url
                );
                let text = format!(
                    "Your {} subscription has been cancelled. You will keep your features until {} ({}-day grace period). After that, your account switches to the free Glimpse plan. Your data is never deleted.",
                    tier_name, grace_str, gp_days
                );
                if let Err(e) = ep.send(&email, &subject, &html, &text).await {
                    tracing::warn!("Failed to send cancellation email: {}", e);
                }
            });
        }

        log_payment_event(
            pool,
            Some(user_id),
            event_id,
            "customer.subscription.deleted",
            None,
            "cancelled",
        )
        .await?;
    }

    Ok(())
}

async fn handle_invoice_payment(
    pool: &PgPool,
    notifier: &crate::services::notify::Notifier,
    event: &serde_json::Value,
    event_id: &str,
    result: &str,
) -> anyhow::Result<()> {
    let invoice = &event["data"]["object"];
    let customer_id = invoice["customer"].as_str().unwrap_or("");
    let amount = invoice["amount_paid"]
        .as_i64()
        .or_else(|| invoice["amount_due"].as_i64());
    let _currency = invoice["currency"].as_str().unwrap_or("eur");

    // Extract invoice data for PDF/receipt
    let stripe_invoice_id = invoice["id"].as_str().unwrap_or("").to_string();
    let invoice_pdf_url = invoice["invoice_pdf"].as_str().unwrap_or("").to_string();
    let invoice_hosted_url = invoice["hosted_invoice_url"]
        .as_str()
        .unwrap_or("")
        .to_string();

    // Find user by stripe_customer_id
    let user_id = sqlx::query("SELECT id FROM users WHERE stripe_customer_id = $1")
        .bind(customer_id)
        .fetch_optional(pool)
        .await?
        .and_then(|r| r.try_get::<Uuid, _>("id").ok());

    // If payment failed, mark subscription as past_due
    if result == "failed" {
        let sub_id = invoice["subscription"].as_str().unwrap_or("");
        if !sub_id.is_empty() {
            let _ = sqlx::query(
                "UPDATE subscriptions SET status = 'past_due', updated_at = NOW() \
                 WHERE stripe_subscription_id = $1",
            )
            .bind(sub_id)
            .execute(pool)
            .await;
        }

        // Notify admins (urgent — revenue at risk)
        notifier.send(
            crate::services::notify::Channel::Billing,
            crate::services::notify::Priority::Urgent,
            "Payment failed",
            &format!("customer={} amount={}c", customer_id, amount.unwrap_or(0)),
        );
    }

    // Generate invoice number for successful payments
    let invoice_number = if result == "succeeded" {
        let year = Utc::now().format("%Y");
        let seq: Option<i64> = sqlx::query_scalar("SELECT nextval('invoice_number_seq')")
            .fetch_optional(pool)
            .await?;
        seq.map(|s| format!("SHI-{}-{:04}", year, s))
    } else {
        None
    };

    // Get tier_slug from subscription if available
    let sub_id_str = invoice["subscription"].as_str().unwrap_or("");
    let tier_slug: Option<String> = if !sub_id_str.is_empty() {
        sqlx::query_scalar("SELECT tier_slug FROM subscriptions WHERE stripe_subscription_id = $1")
            .bind(sub_id_str)
            .fetch_optional(pool)
            .await?
    } else {
        None
    };

    // Store payment event with invoice data
    sqlx::query(
        r#"INSERT INTO payment_events
           (user_id, stripe_event_id, event_type, amount_cents, status,
            stripe_invoice_id, invoice_pdf_url, invoice_hosted_url, invoice_number, tier_slug)
           VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), NULLIF($7, ''), NULLIF($8, ''), $9, $10)
           ON CONFLICT (stripe_event_id) DO NOTHING"#,
    )
    .bind(user_id)
    .bind(event_id)
    .bind(if result == "failed" {
        "invoice.payment_failed"
    } else {
        "invoice.payment_succeeded"
    })
    .bind(amount.map(|a| a as i32))
    .bind(result)
    .bind(&stripe_invoice_id)
    .bind(&invoice_pdf_url)
    .bind(&invoice_hosted_url)
    .bind(&invoice_number)
    .bind(&tier_slug)
    .execute(pool)
    .await?;

    // Mirror invoice locally for billing data sovereignty
    if result == "succeeded" {
        if let Some(uid) = user_id {
            let subtotal = invoice["subtotal"].as_i64().unwrap_or(0) as i32;
            let tax = invoice["tax"].as_i64().unwrap_or(0) as i32;
            let discount_amounts = invoice["total_discount_amounts"].as_array();
            let discount = discount_amounts
                .and_then(|arr| arr.first())
                .and_then(|d| d["amount"].as_i64())
                .unwrap_or(0) as i32;
            let total = invoice["total"].as_i64().unwrap_or(0) as i32;
            let amount_paid = invoice["amount_paid"].as_i64().unwrap_or(0) as i32;
            let amount_due = invoice["amount_due"].as_i64().unwrap_or(0) as i32;
            let currency = invoice["currency"].as_str().unwrap_or("eur");
            let status_str = invoice["status"].as_str().unwrap_or("paid");

            // Extract tax details from total_tax_amounts
            let tax_amounts = invoice["total_tax_amounts"].as_array();
            let tax_rate_pct: Option<f64> = tax_amounts
                .and_then(|arr| arr.first())
                .and_then(|t| t["tax_rate"].as_str())
                .and_then(|_| {
                    tax_amounts
                        .and_then(|arr| arr.first())
                        .and_then(|t| t["amount"].as_i64())
                        .map(|_| {
                            // Stripe provides percentage in effective_percentage or via tax_rate object
                            invoice["total_tax_amounts"][0]["tax_rate"]
                                .as_str()
                                .map(|_| 0.0)
                                .unwrap_or(0.0)
                        })
                });

            // Billing snapshot from user_profile
            let profile = sqlx::query(
                "SELECT customer_type, company_name, vat_id, country_code FROM user_profile WHERE user_id = $1"
            )
            .bind(uid)
            .fetch_optional(pool)
            .await?;

            let (cust_type, cust_company, cust_vat, cust_country) = if let Some(ref p) = profile {
                (
                    p.try_get::<String, _>("customer_type").ok(),
                    p.try_get::<Option<String>, _>("company_name")
                        .ok()
                        .flatten(),
                    p.try_get::<Option<String>, _>("vat_id").ok().flatten(),
                    p.try_get::<Option<String>, _>("country_code")
                        .ok()
                        .flatten(),
                )
            } else {
                (None, None, None, None)
            };

            let customer_email = get_user_email(pool, uid).await.ok();
            let customer_name: Option<String> =
                sqlx::query_scalar("SELECT display_name FROM users WHERE id = $1")
                    .bind(uid)
                    .fetch_optional(pool)
                    .await?
                    .flatten();

            // Period
            let period_start = invoice["lines"]["data"][0]["period"]["start"]
                .as_i64()
                .and_then(|t| chrono::DateTime::from_timestamp(t, 0));
            let period_end = invoice["lines"]["data"][0]["period"]["end"]
                .as_i64()
                .and_then(|t| chrono::DateTime::from_timestamp(t, 0));

            // Billing interval from subscription metadata or tier_slug
            let billing_interval: Option<String> = invoice["lines"]["data"][0]["metadata"]
                ["interval"]
                .as_str()
                .map(|s| s.to_string())
                .or_else(|| {
                    // Infer from period length
                    if let (Some(s), Some(e)) = (period_start, period_end) {
                        let days = (e - s).num_days();
                        if days > 60 {
                            Some("annual".to_string())
                        } else {
                            Some("monthly".to_string())
                        }
                    } else {
                        None
                    }
                });

            let _ = sqlx::query(
                r#"INSERT INTO invoices
                   (user_id, stripe_invoice_id, stripe_customer_id, invoice_number,
                    status, currency, subtotal_cents, tax_cents, discount_cents,
                    total_cents, amount_paid_cents, amount_due_cents,
                    tax_rate_percent, customer_email, customer_name,
                    customer_type, customer_company, customer_vat_id, customer_country,
                    period_start, period_end, hosted_invoice_url, invoice_pdf_url,
                    tier_slug, billing_interval, paid_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                           $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW())
                   ON CONFLICT (stripe_invoice_id) DO NOTHING"#,
            )
            .bind(uid)
            .bind(&stripe_invoice_id)
            .bind(customer_id)
            .bind(&invoice_number)
            .bind(status_str)
            .bind(currency)
            .bind(subtotal)
            .bind(tax)
            .bind(discount)
            .bind(total)
            .bind(amount_paid)
            .bind(amount_due)
            .bind(tax_rate_pct)
            .bind(&customer_email)
            .bind(&customer_name)
            .bind(&cust_type)
            .bind(&cust_company)
            .bind(&cust_vat)
            .bind(&cust_country)
            .bind(period_start)
            .bind(period_end)
            .bind(&invoice_hosted_url)
            .bind(&invoice_pdf_url)
            .bind(&tier_slug)
            .bind(&billing_interval)
            .execute(pool)
            .await;

            // Mirror line items
            if let Some(lines) = invoice["lines"]["data"].as_array() {
                for line in lines {
                    let line_id = line["id"].as_str().unwrap_or("").to_string();
                    let description = line["description"].as_str().map(|s| s.to_string());
                    let line_amount = line["amount"].as_i64().unwrap_or(0) as i32;
                    let quantity = line["quantity"].as_i64().unwrap_or(1) as i32;
                    let unit_amount = line["unit_amount_excluding_tax"]
                        .as_str()
                        .and_then(|s| s.parse::<i32>().ok())
                        .or_else(|| line["price"]["unit_amount"].as_i64().map(|a| a as i32));
                    let price_id = line["price"]["id"].as_str().map(|s| s.to_string());
                    let lp_start = line["period"]["start"]
                        .as_i64()
                        .and_then(|t| chrono::DateTime::from_timestamp(t, 0));
                    let lp_end = line["period"]["end"]
                        .as_i64()
                        .and_then(|t| chrono::DateTime::from_timestamp(t, 0));
                    let proration = line["proration"].as_bool().unwrap_or(false);

                    let _ = sqlx::query(
                        r#"INSERT INTO invoice_line_items
                           (invoice_id, stripe_line_item_id, description, amount_cents,
                            quantity, unit_amount_cents, price_id, period_start, period_end, proration)
                           SELECT id, $2, $3, $4, $5, $6, $7, $8, $9, $10
                           FROM invoices WHERE stripe_invoice_id = $1
                           LIMIT 1"#,
                    )
                    .bind(&stripe_invoice_id)
                    .bind(&line_id)
                    .bind(&description)
                    .bind(line_amount)
                    .bind(quantity)
                    .bind(unit_amount)
                    .bind(&price_id)
                    .bind(lp_start)
                    .bind(lp_end)
                    .bind(proration)
                    .execute(pool)
                    .await;
                }
            }
        }
    }

    Ok(())
}

async fn handle_charge_refunded(
    pool: &PgPool,
    notifier: &crate::services::notify::Notifier,
    event: &serde_json::Value,
    event_id: &str,
) -> anyhow::Result<()> {
    let charge = &event["data"]["object"];
    let customer_id = charge["customer"].as_str().unwrap_or("");
    let amount_refunded = charge["amount_refunded"].as_i64().unwrap_or(0);

    // Find user
    let user_row = sqlx::query("SELECT id FROM users WHERE stripe_customer_id = $1")
        .bind(customer_id)
        .fetch_optional(pool)
        .await?;

    let user_id = match user_row {
        Some(r) => r.try_get::<Uuid, _>("id")?,
        None => {
            tracing::warn!(
                "charge.refunded: no user found for customer {}",
                customer_id
            );
            return Ok(());
        }
    };

    // Update subscription status to refunded
    let _ = sqlx::query(
        "UPDATE subscriptions SET status = 'refunded', updated_at = NOW() \
         WHERE user_id = $1 AND status IN ('active', 'past_due', 'cancelled')",
    )
    .bind(user_id)
    .execute(pool)
    .await;

    // Revert user to core tier
    update_user_tier(pool, user_id, "core").await?;

    // Mark affiliate conversions as refunded
    let _ = sqlx::query(
        "UPDATE affiliate_conversions SET status = 'refunded', updated_at = NOW() \
         WHERE referred_user_id = $1 AND status IN ('pending', 'approved')",
    )
    .bind(user_id)
    .execute(pool)
    .await;

    log_payment_event(
        pool,
        Some(user_id),
        event_id,
        "charge.refunded",
        Some(amount_refunded as i32),
        "refunded",
    )
    .await?;

    // Notify admins
    notifier.send(
        crate::services::notify::Channel::Billing,
        crate::services::notify::Priority::High,
        "Refund processed",
        &format!(
            "user_id={} amount={}c — reverted to core tier",
            user_id, amount_refunded
        ),
    );

    tracing::info!(
        "Processed charge.refunded for user {}: {} cents",
        user_id,
        amount_refunded
    );
    Ok(())
}

// ---------------------------------------------------------------------------
// POST /admin/subscriptions/{user_id}/refund  (admin only)
// ---------------------------------------------------------------------------

#[allow(clippy::too_many_arguments)]
pub async fn admin_refund(
    platform_pool: web::Data<PlatformPool>,
    stripe: Option<web::Data<StripeService>>,
    email_provider: web::Data<Arc<dyn EmailProvider>>,
    config: web::Data<Config>,
    notifier: web::Data<crate::services::notify::Notifier>,
    admin: AdminUser,
    path: web::Path<String>,
    body: web::Json<RefundRequest>,
) -> HttpResponse {
    let stripe =
        match stripe {
            Some(s) => s,
            None => return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "STRIPE_DISABLED", "message": "Payments are not configured." }
            })),
        };

    let target_user_id: Uuid = match path.into_inner().parse() {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "INVALID_ID", "message": "Invalid user ID." }
            }))
        }
    };

    // Get subscription
    let sub = sqlx::query(
        r#"SELECT id, stripe_subscription_id, tier_slug, current_period_start, status
           FROM subscriptions
           WHERE user_id = $1 AND status IN ('active', 'past_due')
           ORDER BY created_at DESC LIMIT 1"#,
    )
    .bind(target_user_id)
    .fetch_optional(&platform_pool.0)
    .await;

    let sub = match sub {
        Ok(Some(s)) => s,
        Ok(None) => return HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "NO_SUBSCRIPTION", "message": "User has no active subscription." }
        })),
        Err(e) => {
            tracing::error!("DB error: {}", e);
            return HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "INTERNAL", "message": "Database error." }
            }));
        }
    };

    let sub_db_id: Uuid = sub.try_get("id").unwrap();
    let stripe_sub_id: String = sub.try_get("stripe_subscription_id").unwrap();
    let period_start: chrono::DateTime<Utc> = sub.try_get("current_period_start").unwrap();

    // Check 30-day refund window
    let days_since_start = (Utc::now() - period_start).num_days();
    let force = body.force.unwrap_or(false);
    if days_since_start > 30 && !force {
        return HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": {
                "code": "REFUND_EXPIRED",
                "message": "Refund period expired (30 days). Use force=true to override."
            }
        }));
    }

    // Get customer ID for Stripe
    let customer_id = match get_stripe_customer_id(&platform_pool.0, target_user_id).await {
        Ok(Some(c)) => c,
        _ => {
            return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "NO_CUSTOMER", "message": "User has no Stripe customer." }
            }))
        }
    };

    // Get latest charge
    let charge_id =
        match stripe.get_latest_charge(&customer_id).await {
            Ok(Some(c)) => c,
            Ok(None) => return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "NO_CHARGE", "message": "No charge found for this customer." }
            })),
            Err(e) => {
                tracing::error!("Stripe get charge failed: {}", e);
                return HttpResponse::InternalServerError().json(json!({
                    "data": null,
                    "error": { "code": "STRIPE_ERROR", "message": "Could not fetch charge." }
                }));
            }
        };

    // Create Stripe refund
    let refund_result = stripe
        .create_refund(&charge_id, body.reason.as_deref())
        .await;

    let refund = match refund_result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Stripe refund failed: {}", e);
            return HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "STRIPE_ERROR", "message": "Stripe refund failed." }
            }));
        }
    };

    let stripe_refund_id = refund["id"].as_str().unwrap_or("").to_string();
    let amount_refunded = refund["amount"].as_i64().unwrap_or(0) as i32;

    // Cancel the subscription immediately
    if let Err(e) = stripe.cancel_subscription(&stripe_sub_id, false).await {
        tracing::error!("Failed to cancel subscription after refund: {}", e);
    }

    // Update subscription status
    let _ = sqlx::query(
        "UPDATE subscriptions SET status = 'refunded', cancelled_at = NOW(), updated_at = NOW() \
         WHERE stripe_subscription_id = $1",
    )
    .bind(&stripe_sub_id)
    .execute(&platform_pool.0)
    .await;

    // Revert user to core tier
    if let Err(e) = update_user_tier(&platform_pool.0, target_user_id, "core").await {
        tracing::error!("Failed to update user tier after refund: {}", e);
    }

    // Mark affiliate conversions as refunded
    let affiliate_updated = sqlx::query(
        "UPDATE affiliate_conversions SET status = 'refunded', updated_at = NOW() \
         WHERE referred_user_id = $1 AND status IN ('pending', 'approved')",
    )
    .bind(target_user_id)
    .execute(&platform_pool.0)
    .await
    .map(|r| r.rows_affected() > 0)
    .unwrap_or(false);

    // Log refund
    let _ = sqlx::query(
        r#"INSERT INTO refunds (user_id, subscription_id, stripe_refund_id, amount_cents, reason, forced, admin_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)"#,
    )
    .bind(target_user_id)
    .bind(sub_db_id)
    .bind(&stripe_refund_id)
    .bind(amount_refunded)
    .bind(body.reason.as_deref().unwrap_or(""))
    .bind(force)
    .bind(admin.user_id)
    .execute(&platform_pool.0)
    .await;

    // Send refund email (non-blocking)
    let email = get_user_email(&platform_pool.0, target_user_id)
        .await
        .unwrap_or_default();
    if !email.is_empty() {
        let ep = email_provider.clone();
        let amount_eur = format!("{:.2}", amount_refunded as f64 / 100.0);
        let product_name = config.product_name.clone();
        tokio::spawn(async move {
            let subject = format!("Your refund has been processed - {}", product_name);
            let html = format!(
                "<h2>Refund Processed</h2>\
                 <p>Your refund of &euro;{} has been processed. It may take 5-10 business days to appear on your statement.</p>\
                 <p>Your account has been switched to the free Glimpse plan. Your data is never deleted.</p>\
                 <p>-- The {} Team</p>",
                amount_eur, product_name
            );
            let text = format!(
                "Your refund of EUR {} has been processed. It may take 5-10 business days to appear on your statement. \
                 Your account has been switched to the free Glimpse plan.",
                amount_eur
            );
            if let Err(e) = ep.send(&email, &subject, &html, &text).await {
                tracing::warn!("Failed to send refund email: {}", e);
            }
        });
    }

    // Notify admins
    notifier.send(
        crate::services::notify::Channel::Billing,
        crate::services::notify::Priority::High,
        "Admin refund issued",
        &format!(
            "admin={} user={} amount={}c reason={} force={}",
            admin.user_id,
            target_user_id,
            amount_refunded,
            body.reason.as_deref().unwrap_or("none"),
            force,
        ),
    );

    tracing::info!(
        "Admin {} refunded {} cents for user {} (force={})",
        admin.user_id,
        amount_refunded,
        target_user_id,
        force
    );

    HttpResponse::Ok().json(json!({
        "data": {
            "refund_id": stripe_refund_id,
            "amount_refunded_cents": amount_refunded,
            "subscription_cancelled": true,
            "affiliate_conversion_refunded": affiliate_updated,
            "user_tier": "core"
        },
        "error": null
    }))
}

// ---------------------------------------------------------------------------
// GET /admin/refunds  (admin only)
// ---------------------------------------------------------------------------

pub async fn admin_refund_list(
    platform_pool: web::Data<PlatformPool>,
    _admin: AdminUser,
) -> HttpResponse {
    let rows = sqlx::query(
        r#"SELECT r.id, r.user_id, r.stripe_refund_id, r.amount_cents,
                  r.reason, r.forced, r.admin_id, r.created_at
           FROM refunds r
           ORDER BY r.created_at DESC
           LIMIT 100"#,
    )
    .fetch_all(&platform_pool.0)
    .await;

    match rows {
        Ok(rows) => {
            let refunds: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    json!({
                        "id": r.try_get::<Uuid, _>("id").unwrap().to_string(),
                        "user_id": r.try_get::<Uuid, _>("user_id").unwrap().to_string(),
                        "stripe_refund_id": r.try_get::<Option<String>, _>("stripe_refund_id").unwrap_or(None),
                        "amount_cents": r.try_get::<i32, _>("amount_cents").unwrap_or(0),
                        "reason": r.try_get::<Option<String>, _>("reason").unwrap_or(None),
                        "forced": r.try_get::<bool, _>("forced").unwrap_or(false),
                        "admin_id": r.try_get::<Uuid, _>("admin_id").unwrap().to_string(),
                        "created_at": r.try_get::<chrono::DateTime<Utc>, _>("created_at")
                            .map(|d| d.to_rfc3339()).unwrap_or_default(),
                    })
                })
                .collect();

            HttpResponse::Ok().json(json!({
                "data": { "refunds": refunds },
                "error": null
            }))
        }
        Err(e) => {
            tracing::error!("DB error fetching refunds: {}", e);
            HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "INTERNAL", "message": "Database error." }
            }))
        }
    }
}

// ---------------------------------------------------------------------------
// GET /api/invoices  (auth required)
// ---------------------------------------------------------------------------

pub async fn invoices_list(
    platform_pool: web::Data<PlatformPool>,
    user: AuthenticatedUser,
) -> HttpResponse {
    let rows = sqlx::query(
        r#"SELECT id, stripe_event_id, stripe_invoice_id, event_type,
                  amount_cents, status, invoice_pdf_url, invoice_hosted_url,
                  invoice_number, tier_slug, created_at
           FROM payment_events
           WHERE user_id = $1
           AND event_type = 'invoice.payment_succeeded'
           AND status = 'succeeded'
           ORDER BY created_at DESC
           LIMIT 50"#,
    )
    .bind(user.user_id)
    .fetch_all(&platform_pool.0)
    .await;

    match rows {
        Ok(rows) => {
            let invoices: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    json!({
                        "id": r.try_get::<Uuid, _>("id").unwrap().to_string(),
                        "date": r.try_get::<chrono::DateTime<Utc>, _>("created_at")
                            .map(|d| d.to_rfc3339()).unwrap_or_default(),
                        "amount_cents": r.try_get::<Option<i32>, _>("amount_cents").unwrap_or(None),
                        "currency": "eur",
                        "tier": r.try_get::<Option<String>, _>("tier_slug").unwrap_or(None),
                        "status": r.try_get::<String, _>("status").unwrap_or_default(),
                        "pdf_url": r.try_get::<Option<String>, _>("invoice_pdf_url").unwrap_or(None),
                        "hosted_url": r.try_get::<Option<String>, _>("invoice_hosted_url").unwrap_or(None),
                        "invoice_number": r.try_get::<Option<String>, _>("invoice_number").unwrap_or(None),
                    })
                })
                .collect();

            HttpResponse::Ok().json(json!({
                "data": { "invoices": invoices },
                "error": null
            }))
        }
        Err(e) => {
            tracing::error!("DB error fetching invoices: {}", e);
            HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "INTERNAL", "message": "Database error." }
            }))
        }
    }
}

// ---------------------------------------------------------------------------
// GET /api/invoices/{id}/pdf  (auth required — redirect to Stripe PDF)
// ---------------------------------------------------------------------------

pub async fn invoice_pdf(
    platform_pool: web::Data<PlatformPool>,
    user: AuthenticatedUser,
    path: web::Path<String>,
) -> HttpResponse {
    let invoice_id: Uuid = match path.into_inner().parse() {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "INVALID_ID", "message": "Invalid invoice ID." }
            }))
        }
    };

    let row =
        sqlx::query("SELECT invoice_pdf_url FROM payment_events WHERE id = $1 AND user_id = $2")
            .bind(invoice_id)
            .bind(user.user_id)
            .fetch_optional(&platform_pool.0)
            .await;

    match row {
        Ok(Some(r)) => {
            let pdf_url: Option<String> = r.try_get("invoice_pdf_url").unwrap_or(None);
            match pdf_url {
                Some(url) if !url.is_empty() => HttpResponse::Found()
                    .insert_header(("Location", url))
                    .finish(),
                _ => HttpResponse::NotFound().json(json!({
                    "data": null,
                    "error": { "code": "NO_PDF", "message": "No PDF available for this invoice." }
                })),
            }
        }
        Ok(None) => HttpResponse::NotFound().json(json!({
            "data": null,
            "error": { "code": "NOT_FOUND", "message": "Invoice not found." }
        })),
        Err(e) => {
            tracing::error!("DB error: {}", e);
            HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "INTERNAL", "message": "Database error." }
            }))
        }
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async fn get_or_create_customer(
    pool: &PgPool,
    stripe: &StripeService,
    user_id: Uuid,
) -> anyhow::Result<String> {
    // Check existing
    if let Some(cid) = get_stripe_customer_id(pool, user_id).await? {
        return Ok(cid);
    }

    // Get user info
    let row = sqlx::query("SELECT email, display_name FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_one(pool)
        .await?;
    let email: String = row.try_get("email")?;
    let name: Option<String> = row.try_get("display_name").ok().flatten();

    // Get country_code from user_profile
    let country: Option<String> =
        sqlx::query_scalar("SELECT country_code FROM user_profile WHERE user_id = $1")
            .bind(user_id)
            .fetch_optional(pool)
            .await?
            .flatten();

    // Create Stripe customer with country
    let customer_id = stripe
        .create_customer(&email, name.as_deref(), user_id, country.as_deref())
        .await?;

    // Store in users table
    sqlx::query("UPDATE users SET stripe_customer_id = $1 WHERE id = $2")
        .bind(&customer_id)
        .bind(user_id)
        .execute(pool)
        .await?;

    Ok(customer_id)
}

async fn get_stripe_customer_id(pool: &PgPool, user_id: Uuid) -> anyhow::Result<Option<String>> {
    let row = sqlx::query("SELECT stripe_customer_id FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_optional(pool)
        .await?;
    Ok(row.and_then(|r| {
        r.try_get::<Option<String>, _>("stripe_customer_id")
            .ok()
            .flatten()
    }))
}

async fn get_user_email(pool: &PgPool, user_id: Uuid) -> anyhow::Result<String> {
    let row = sqlx::query("SELECT email FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_one(pool)
        .await?;
    Ok(row.try_get("email")?)
}

async fn update_user_tier(pool: &PgPool, user_id: Uuid, tier_slug: &str) -> anyhow::Result<()> {
    // Check if user has admin override - skip Stripe tier update
    let has_override: bool = sqlx::query_scalar(
        "SELECT COALESCE(admin_override, false) FROM user_licenses WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .unwrap_or(false);

    if has_override {
        tracing::info!(
            "Skipping Stripe tier update for user {} - admin override active",
            user_id
        );
        return Ok(());
    }

    // Get tier_id from license_tiers
    let tier_row = sqlx::query("SELECT id FROM license_tiers WHERE slug = $1")
        .bind(tier_slug)
        .fetch_optional(pool)
        .await?;

    let tier_id: Uuid = match tier_row {
        Some(r) => r.try_get("id")?,
        None => return Ok(()), // unknown tier, skip
    };

    sqlx::query(
        r#"INSERT INTO user_licenses (user_id, tier_id, status, started_at)
           VALUES ($1, $2, 'active', NOW())
           ON CONFLICT (user_id) DO UPDATE SET
            tier_id = $2,
            status = 'active',
            previous_tier_slug = user_licenses.previous_tier_slug,
            grace_period_ends = NULL,
            downgraded_at = NULL,
            updated_at = NOW()"#,
    )
    .bind(user_id)
    .bind(tier_id)
    .execute(pool)
    .await?;

    // Also update users.tier column for consistency
    sqlx::query("UPDATE users SET tier = $1, updated_at = NOW() WHERE id = $2")
        .bind(tier_slug)
        .bind(user_id)
        .execute(pool)
        .await?;

    Ok(())
}

async fn log_payment_event(
    pool: &PgPool,
    user_id: Option<Uuid>,
    event_id: &str,
    event_type: &str,
    amount_cents: Option<i32>,
    status: &str,
) -> anyhow::Result<()> {
    sqlx::query(
        r#"INSERT INTO payment_events (user_id, stripe_event_id, event_type, amount_cents, status)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (stripe_event_id) DO NOTHING"#,
    )
    .bind(user_id)
    .bind(event_id)
    .bind(event_type)
    .bind(amount_cents)
    .bind(status)
    .execute(pool)
    .await?;

    Ok(())
}

fn map_stripe_status(s: &str) -> String {
    match s {
        "active" => "active",
        "past_due" => "past_due",
        "canceled" => "cancelled",
        "incomplete" => "incomplete",
        "trialing" => "trialing",
        "incomplete_expired" => "cancelled",
        "unpaid" => "past_due",
        _ => "active",
    }
    .to_string()
}

fn tier_rank(slug: &str) -> u8 {
    match slug {
        "glimpse" => 0,
        "core" => 1,
        "focus" => 2,
        "insight" => 3,
        "clarity" => 4,
        "horizon" => 5,
        _ => 0,
    }
}

fn tier_display_name(slug: &str) -> String {
    match slug {
        "glimpse" => "Glimpse",
        "core" => "Core",
        "focus" => "Focus",
        "insight" => "Insight",
        "clarity" => "Clarity",
        "horizon" => "Horizon",
        _ => slug,
    }
    .to_string()
}
