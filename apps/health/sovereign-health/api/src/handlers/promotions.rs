// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::{error::AppError, middleware::auth::AdminUser, services::stripe::StripeService};

// ---------------------------------------------------------------------------
// Public: POST /promotions/validate
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct ValidateRequest {
    pub code: String,
    pub tier: Option<String>,
}

pub async fn validate(
    pool: web::Data<PgPool>,
    body: web::Json<ValidateRequest>,
) -> Result<HttpResponse, AppError> {
    let code = body.code.trim().to_uppercase();

    let row = sqlx::query(
        r#"SELECT id, code, name, discount_type, discount_value::float8 as discount_value,
                  currency, duration, duration_months, applicable_tiers,
                  max_redemptions, redemption_count, starts_at, expires_at, is_active
           FROM promotions WHERE UPPER(code) = $1"#,
    )
    .bind(&code)
    .fetch_optional(pool.get_ref())
    .await?;

    let row = match row {
        Some(r) => r,
        None => {
            return Ok(HttpResponse::Ok().json(json!({
                "data": { "valid": false, "reason": "invalid_code" },
                "error": null
            })));
        }
    };

    let is_active: bool = row.try_get("is_active").unwrap_or(false);
    if !is_active {
        return Ok(HttpResponse::Ok().json(json!({
            "data": { "valid": false, "reason": "code_disabled" },
            "error": null
        })));
    }

    let now = Utc::now();

    let starts_at: Option<chrono::DateTime<Utc>> = row.try_get("starts_at").ok().flatten();
    if let Some(start) = starts_at {
        if now < start {
            return Ok(HttpResponse::Ok().json(json!({
                "data": { "valid": false, "reason": "not_yet_active" },
                "error": null
            })));
        }
    }

    let expires_at: Option<chrono::DateTime<Utc>> = row.try_get("expires_at").ok().flatten();
    if let Some(exp) = expires_at {
        if now > exp {
            return Ok(HttpResponse::Ok().json(json!({
                "data": { "valid": false, "reason": "expired" },
                "error": null
            })));
        }
    }

    let max_redemptions: Option<i32> = row.try_get("max_redemptions").ok().flatten();
    let redemption_count: i32 = row.try_get("redemption_count").unwrap_or(0);
    if let Some(max) = max_redemptions {
        if redemption_count >= max {
            return Ok(HttpResponse::Ok().json(json!({
                "data": { "valid": false, "reason": "max_redemptions_reached" },
                "error": null
            })));
        }
    }

    let applicable_tiers: Option<Vec<String>> = row.try_get("applicable_tiers").ok().flatten();
    if let Some(ref tiers) = applicable_tiers {
        if let Some(ref requested_tier) = body.tier {
            if !tiers.contains(requested_tier) {
                return Ok(HttpResponse::Ok().json(json!({
                    "data": { "valid": false, "reason": "not_applicable_to_tier" },
                    "error": null
                })));
            }
        }
    }

    let discount_type: String = row.try_get("discount_type").unwrap_or_default();
    let discount_value: f64 = row.try_get("discount_value").unwrap_or(0.0);
    let currency: String = row
        .try_get("currency")
        .unwrap_or_else(|_| "eur".to_string());
    let duration: String = row.try_get("duration").unwrap_or_default();
    let duration_months: Option<i32> = row.try_get("duration_months").ok().flatten();

    let discount_label = if discount_type == "percent_off" {
        format!("{}% off", discount_value as i64)
    } else {
        format!("€{:.2} off", discount_value)
    };

    let duration_label = match duration.as_str() {
        "once" => "first payment".to_string(),
        "forever" => "forever".to_string(),
        "repeating" => {
            if let Some(months) = duration_months {
                format!("first {} months", months)
            } else {
                "limited time".to_string()
            }
        }
        _ => duration.clone(),
    };

    // Calculate example prices for each applicable tier
    let tier_prices = get_tier_prices(&pool).await;
    let mut price_examples = Vec::new();
    let check_tiers = applicable_tiers.as_deref().unwrap_or(&[]);
    for (tier_slug, monthly_price) in &tier_prices {
        if !check_tiers.is_empty() && !check_tiers.contains(tier_slug) {
            continue;
        }
        let discounted = if discount_type == "percent_off" {
            monthly_price * (1.0 - discount_value / 100.0)
        } else {
            (monthly_price - discount_value).max(0.0)
        };
        price_examples.push(json!({
            "tier": tier_slug,
            "original_price": (monthly_price * 100.0).round() / 100.0,
            "discounted_price": (discounted * 100.0).round() / 100.0,
            "currency": currency,
        }));
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "valid": true,
            "code": code,
            "name": row.try_get::<String, _>("name").unwrap_or_default(),
            "discount": discount_label,
            "discount_type": discount_type,
            "discount_value": discount_value,
            "duration": duration_label,
            "duration_raw": duration,
            "duration_months": duration_months,
            "applicable_tiers": applicable_tiers,
            "prices": price_examples,
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Admin: GET /admin/promotions
// ---------------------------------------------------------------------------

pub async fn admin_list(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let rows = sqlx::query(
        r#"SELECT p.id, p.code, p.name, p.discount_type, p.discount_value::float8 as discount_value,
                  p.currency, p.duration, p.duration_months, p.applicable_tiers,
                  p.max_redemptions, p.redemption_count, p.starts_at, p.expires_at,
                  p.is_active, p.stripe_coupon_id, p.stripe_promo_code_id,
                  p.created_at, u.email as created_by_email
           FROM promotions p
           LEFT JOIN users u ON u.id = p.created_by
           ORDER BY p.created_at DESC"#,
    )
    .fetch_all(pool.get_ref())
    .await?;

    let promos: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            let expires: Option<chrono::DateTime<Utc>> = r.try_get("expires_at").ok().flatten();
            let is_active: bool = r.try_get("is_active").unwrap_or(false);
            let now = Utc::now();
            let status = if !is_active {
                "disabled"
            } else if expires.is_some_and(|e| e < now) {
                "expired"
            } else if expires.is_some_and(|e| (e - now).num_days() <= 7) {
                "expiring_soon"
            } else {
                "active"
            };

            json!({
                "id": r.try_get::<Uuid, _>("id").unwrap_or_default(),
                "code": r.try_get::<String, _>("code").unwrap_or_default(),
                "name": r.try_get::<String, _>("name").unwrap_or_default(),
                "discount_type": r.try_get::<String, _>("discount_type").unwrap_or_default(),
                "discount_value": r.try_get::<f64, _>("discount_value").unwrap_or(0.0),
                "currency": r.try_get::<String, _>("currency").unwrap_or_default(),
                "duration": r.try_get::<String, _>("duration").unwrap_or_default(),
                "duration_months": r.try_get::<Option<i32>, _>("duration_months").ok().flatten(),
                "applicable_tiers": r.try_get::<Option<Vec<String>>, _>("applicable_tiers").ok().flatten(),
                "max_redemptions": r.try_get::<Option<i32>, _>("max_redemptions").ok().flatten(),
                "redemption_count": r.try_get::<i32, _>("redemption_count").unwrap_or(0),
                "starts_at": r.try_get::<Option<chrono::DateTime<Utc>>, _>("starts_at").ok().flatten().map(|d| d.to_rfc3339()),
                "expires_at": expires.map(|d| d.to_rfc3339()),
                "is_active": is_active,
                "status": status,
                "stripe_coupon_id": r.try_get::<String, _>("stripe_coupon_id").unwrap_or_default(),
                "stripe_promo_code_id": r.try_get::<Option<String>, _>("stripe_promo_code_id").ok().flatten(),
                "created_at": r.try_get::<chrono::DateTime<Utc>, _>("created_at").unwrap_or_else(|_| Utc::now()).to_rfc3339(),
                "created_by_email": r.try_get::<Option<String>, _>("created_by_email").ok().flatten(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": promos,
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Admin: POST /admin/promotions
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct CreatePromotionRequest {
    pub code: String,
    pub name: String,
    pub discount_type: String,
    pub discount_value: f64,
    pub currency: Option<String>,
    pub duration: String,
    pub duration_months: Option<i32>,
    pub applicable_tiers: Option<Vec<String>>,
    pub max_redemptions: Option<i32>,
    pub starts_at: Option<String>,
    pub expires_at: Option<String>,
}

pub async fn admin_create(
    pool: web::Data<PgPool>,
    stripe: Option<web::Data<StripeService>>,
    admin: AdminUser,
    body: web::Json<CreatePromotionRequest>,
) -> Result<HttpResponse, AppError> {
    let stripe =
        stripe.ok_or_else(|| AppError::Validation("Stripe is not configured".to_string()))?;

    let code = body.code.trim().to_uppercase();
    if code.is_empty() || code.len() > 50 {
        return Err(AppError::Validation(
            "Code must be 1-50 characters".to_string(),
        ));
    }

    // Check for duplicate
    let existing = sqlx::query("SELECT id FROM promotions WHERE UPPER(code) = $1")
        .bind(&code)
        .fetch_optional(pool.get_ref())
        .await?;
    if existing.is_some() {
        return Err(AppError::Validation(format!(
            "Code '{}' already exists",
            code
        )));
    }

    let currency = body.currency.as_deref().unwrap_or("eur");

    // Parse dates
    let starts_at = body.starts_at.as_deref().and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
            .or_else(|| {
                chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d")
                    .ok()
                    .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default().and_utc())
            })
    });
    let expires_at = body.expires_at.as_deref().and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
            .or_else(|| {
                chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d")
                    .ok()
                    .map(|d| d.and_hms_opt(23, 59, 59).unwrap_or_default().and_utc())
            })
    });

    // 1. Create Stripe coupon
    let mut coupon_params: Vec<(String, String)> = Vec::new();

    if body.discount_type == "percent_off" {
        coupon_params.push((
            "percent_off".to_string(),
            format!("{}", body.discount_value),
        ));
    } else {
        coupon_params.push((
            "amount_off".to_string(),
            format!("{}", (body.discount_value * 100.0) as i64),
        ));
        coupon_params.push(("currency".to_string(), currency.to_string()));
    }

    match body.duration.as_str() {
        "once" => coupon_params.push(("duration".to_string(), "once".to_string())),
        "forever" => coupon_params.push(("duration".to_string(), "forever".to_string())),
        "repeating" => {
            coupon_params.push(("duration".to_string(), "repeating".to_string()));
            if let Some(months) = body.duration_months {
                coupon_params.push(("duration_in_months".to_string(), months.to_string()));
            }
        }
        _ => return Err(AppError::Validation("Invalid duration".to_string())),
    }

    if let Some(max) = body.max_redemptions {
        coupon_params.push(("max_redemptions".to_string(), max.to_string()));
    }
    if let Some(exp) = expires_at {
        coupon_params.push(("redeem_by".to_string(), exp.timestamp().to_string()));
    }
    coupon_params.push(("name".to_string(), body.name.clone()));

    let coupon_res = stripe
        .raw_post("coupons", &coupon_params)
        .await
        .map_err(|e| AppError::Validation(format!("Stripe coupon creation failed: {}", e)))?;

    let coupon_id = coupon_res["id"]
        .as_str()
        .ok_or_else(|| {
            AppError::Validation(format!("Stripe returned no coupon id: {}", coupon_res))
        })?
        .to_string();

    // 2. Create Stripe promotion code
    let mut promo_params: Vec<(String, String)> = vec![
        ("coupon".to_string(), coupon_id.clone()),
        ("code".to_string(), code.clone()),
    ];
    if let Some(max) = body.max_redemptions {
        promo_params.push(("max_redemptions".to_string(), max.to_string()));
    }
    if let Some(exp) = expires_at {
        promo_params.push(("expires_at".to_string(), exp.timestamp().to_string()));
    }

    let promo_res = stripe
        .raw_post("promotion_codes", &promo_params)
        .await
        .map_err(|e| AppError::Validation(format!("Stripe promo code creation failed: {}", e)))?;

    let promo_code_id = promo_res["id"].as_str().map(|s| s.to_string());

    // 3. Store locally
    let row = sqlx::query(
        r#"INSERT INTO promotions (
            stripe_coupon_id, stripe_promo_code_id, code, name,
            discount_type, discount_value, currency, duration, duration_months,
            applicable_tiers, max_redemptions, starts_at, expires_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id"#,
    )
    .bind(&coupon_id)
    .bind(&promo_code_id)
    .bind(&code)
    .bind(&body.name)
    .bind(&body.discount_type)
    .bind(body.discount_value)
    .bind(currency)
    .bind(&body.duration)
    .bind(body.duration_months)
    .bind(&body.applicable_tiers)
    .bind(body.max_redemptions)
    .bind(starts_at)
    .bind(expires_at)
    .bind(admin.user_id)
    .fetch_one(pool.get_ref())
    .await?;

    let promo_id: Uuid = row.try_get("id").map_err(|_| AppError::Internal)?;

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "id": promo_id,
            "code": code,
            "stripe_coupon_id": coupon_id,
            "stripe_promo_code_id": promo_code_id,
            "message": "Promotion created successfully"
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Admin: PUT /admin/promotions/{id}
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct UpdatePromotionRequest {
    pub is_active: Option<bool>,
    pub max_redemptions: Option<i32>,
    pub expires_at: Option<String>,
    pub name: Option<String>,
    pub applicable_tiers: Option<Vec<String>>,
}

pub async fn admin_update(
    pool: web::Data<PgPool>,
    stripe: Option<web::Data<StripeService>>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdatePromotionRequest>,
) -> Result<HttpResponse, AppError> {
    let promo_id = path.into_inner();

    let row =
        sqlx::query("SELECT stripe_promo_code_id, stripe_coupon_id FROM promotions WHERE id = $1")
            .bind(promo_id)
            .fetch_optional(pool.get_ref())
            .await?
            .ok_or(AppError::NotFound)?;

    let stripe_promo_id: Option<String> = row.try_get("stripe_promo_code_id").ok().flatten();

    // If deactivating, also deactivate in Stripe
    if let (Some(false), Some(ref stripe_svc), Some(ref pid)) =
        (body.is_active, &stripe, &stripe_promo_id)
    {
        let params = vec![("active".to_string(), "false".to_string())];
        let _ = stripe_svc
            .raw_post(&format!("promotion_codes/{}", pid), &params)
            .await;
    }

    // Update local record
    let expires_at = body.expires_at.as_deref().and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
            .or_else(|| {
                chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d")
                    .ok()
                    .map(|d| d.and_hms_opt(23, 59, 59).unwrap_or_default().and_utc())
            })
    });

    sqlx::query(
        r#"UPDATE promotions SET
           is_active = COALESCE($1, is_active),
           max_redemptions = COALESCE($2, max_redemptions),
           expires_at = COALESCE($3, expires_at),
           name = COALESCE($4, name),
           applicable_tiers = COALESCE($5, applicable_tiers),
           updated_at = NOW()
           WHERE id = $6"#,
    )
    .bind(body.is_active)
    .bind(body.max_redemptions)
    .bind(expires_at)
    .bind(&body.name)
    .bind(&body.applicable_tiers)
    .bind(promo_id)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "message": "Promotion updated" },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Admin: DELETE /admin/promotions/{id}
// ---------------------------------------------------------------------------

pub async fn admin_deactivate(
    pool: web::Data<PgPool>,
    stripe: Option<web::Data<StripeService>>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let promo_id = path.into_inner();

    let row = sqlx::query("SELECT stripe_promo_code_id FROM promotions WHERE id = $1")
        .bind(promo_id)
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or(AppError::NotFound)?;

    let stripe_promo_id: Option<String> = row.try_get("stripe_promo_code_id").ok().flatten();

    // Deactivate in Stripe
    if let (Some(ref stripe_svc), Some(ref pid)) = (&stripe, &stripe_promo_id) {
        let params = vec![("active".to_string(), "false".to_string())];
        let _ = stripe_svc
            .raw_post(&format!("promotion_codes/{}", pid), &params)
            .await;
    }

    sqlx::query("UPDATE promotions SET is_active = false, updated_at = NOW() WHERE id = $1")
        .bind(promo_id)
        .execute(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "message": "Promotion deactivated" },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Admin: GET /admin/promotions/{id}/redemptions
// ---------------------------------------------------------------------------

pub async fn admin_redemptions(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let promo_id = path.into_inner();

    let rows = sqlx::query(
        r#"SELECT pr.id, pr.user_id, u.email, u.display_name,
                  pr.tier_at_redemption, pr.stripe_subscription_id, pr.redeemed_at
           FROM promotion_redemptions pr
           LEFT JOIN users u ON u.id = pr.user_id
           WHERE pr.promotion_id = $1
           ORDER BY pr.redeemed_at DESC"#,
    )
    .bind(promo_id)
    .fetch_all(pool.get_ref())
    .await?;

    let redemptions: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "id": r.try_get::<Uuid, _>("id").unwrap_or_default(),
                "user_id": r.try_get::<Uuid, _>("user_id").unwrap_or_default(),
                "email": r.try_get::<Option<String>, _>("email").ok().flatten(),
                "display_name": r.try_get::<Option<String>, _>("display_name").ok().flatten(),
                "tier": r.try_get::<Option<String>, _>("tier_at_redemption").ok().flatten(),
                "stripe_subscription_id": r.try_get::<Option<String>, _>("stripe_subscription_id").ok().flatten(),
                "redeemed_at": r.try_get::<chrono::DateTime<Utc>, _>("redeemed_at")
                    .unwrap_or_else(|_| Utc::now()).to_rfc3339(),
            })
        })
        .collect();

    // Get promo summary
    let promo = sqlx::query(
        "SELECT code, name, discount_type, discount_value::float8 as dv, redemption_count FROM promotions WHERE id = $1",
    )
    .bind(promo_id)
    .fetch_optional(pool.get_ref())
    .await?;

    let summary = promo.map(|p| {
        json!({
            "code": p.try_get::<String, _>("code").unwrap_or_default(),
            "name": p.try_get::<String, _>("name").unwrap_or_default(),
            "redemption_count": p.try_get::<i32, _>("redemption_count").unwrap_or(0),
        })
    });

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "promotion": summary,
            "redemptions": redemptions,
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Admin: POST /admin/promo/preview
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct PromoPreviewRequest {
    pub discount_pct: f64,
}

pub async fn admin_promo_preview(
    _admin: AdminUser,
    body: web::Json<PromoPreviewRequest>,
) -> Result<HttpResponse, AppError> {
    if body.discount_pct < 0.0 || body.discount_pct > 100.0 {
        return Err(AppError::Validation(
            "Discount must be between 0 and 100".to_string(),
        ));
    }

    let (tiers, warnings) = crate::payments::pricing::admin_promo_preview(body.discount_pct);

    Ok(HttpResponse::Ok().json(json!({
        "data": { "tiers": tiers, "warnings": warnings },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Public: POST /api/payments/preview
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct PaymentPreviewRequest {
    pub tier: String,
    pub interval: String,
    pub payment_method: Option<String>,
    pub promo_code: Option<String>,
}

pub async fn payment_preview(
    pool: web::Data<PgPool>,
    user: crate::middleware::auth::AuthenticatedUser,
    body: web::Json<PaymentPreviewRequest>,
) -> Result<HttpResponse, AppError> {
    use crate::payments::gateway::GatewayId;
    use crate::payments::pricing::{
        PricingBreakdown, PricingInput, AFFILIATE_COMMISSION_PCT, BTC_DISCOUNT_PCT,
    };
    use rust_decimal::Decimal;
    use rust_decimal_macros::dec;

    let list_price = crate::payments::pricing::tier_price_cents(&body.tier, &body.interval)
        .ok_or_else(|| AppError::Validation("Invalid tier or interval".to_string()))?;

    let is_btc = body.payment_method.as_deref() == Some("btc");
    let btc_pct = if is_btc { BTC_DISCOUNT_PCT } else { dec!(0) };

    // Look up promo code
    let mut promo_pct = dec!(0);
    let mut promo_fixed: i64 = 0;
    let mut promo_is_percent = true;
    let mut promo_name: Option<String> = None;

    if let Some(ref code) = body.promo_code {
        let code_upper = code.trim().to_uppercase();
        let row = sqlx::query(
            r#"SELECT discount_type, discount_value::float8 as discount_value, applicable_tiers,
                      is_active, starts_at, expires_at, max_redemptions, redemption_count
               FROM promotions WHERE UPPER(code) = $1"#,
        )
        .bind(&code_upper)
        .fetch_optional(pool.get_ref())
        .await?;

        if let Some(r) = row {
            let is_active: bool = r.try_get("is_active").unwrap_or(false);
            let discount_type: String = r.try_get("discount_type").unwrap_or_default();
            let discount_value: f64 = r.try_get("discount_value").unwrap_or(0.0);
            let applicable_tiers: Option<Vec<String>> =
                r.try_get("applicable_tiers").unwrap_or(None);
            let max_redemptions: Option<i32> = r.try_get("max_redemptions").unwrap_or(None);
            let redemption_count: i32 = r.try_get("redemption_count").unwrap_or(0);
            let starts_at: Option<chrono::DateTime<Utc>> = r.try_get("starts_at").unwrap_or(None);
            let expires_at: Option<chrono::DateTime<Utc>> = r.try_get("expires_at").unwrap_or(None);

            let now = Utc::now();
            let valid = is_active
                && starts_at.is_none_or(|s| now >= s)
                && expires_at.is_none_or(|e| now <= e)
                && max_redemptions.is_none_or(|m| redemption_count < m)
                && applicable_tiers
                    .as_ref()
                    .is_none_or(|tiers| tiers.contains(&body.tier));

            if valid {
                if discount_type == "percent_off" {
                    promo_pct = Decimal::try_from(discount_value).unwrap_or(dec!(0));
                    promo_is_percent = true;
                } else {
                    promo_fixed = (discount_value * 100.0) as i64;
                    promo_is_percent = false;
                }
                promo_name = Some(code_upper);
            }
        }
    }

    // Check if user has affiliate referrer and no prior payments
    let has_affiliate = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM affiliate_conversions WHERE user_id = $1)",
    )
    .bind(user.user_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(false);

    let has_prior_payment = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM payment_events WHERE user_id = $1 AND status = 'succeeded')",
    )
    .bind(user.user_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(false);

    let gateway = if is_btc {
        GatewayId::Strike
    } else {
        GatewayId::Stripe
    };

    let breakdown = PricingBreakdown::calculate(&PricingInput {
        list_price_cents: list_price,
        promo_discount_pct: promo_pct,
        promo_discount_fixed_cents: promo_fixed,
        promo_is_percent,
        btc_discount_pct: btc_pct,
        gateway,
        is_first_payment: has_affiliate && !has_prior_payment,
        has_affiliate,
        affiliate_commission_pct: AFFILIATE_COMMISSION_PCT,
    });

    // Format cents to EUR strings for the response
    let fmt = |c: i64| format!("{:.2}", c as f64 / 100.0);

    let mut resp = json!({
        "breakdown": {
            "list_price": fmt(breakdown.list_price_cents),
            "promo_discount": fmt(breakdown.promo_discount_cents),
            "btc_discount": fmt(breakdown.btc_discount_cents),
            "charged_amount": fmt(breakdown.charged_amount_cents),
            "savings": fmt(breakdown.user_savings_cents),
            "savings_pct": breakdown.user_savings_pct,
            "floor_applied": breakdown.floor_applied,
        }
    });

    if let Some(ref code) = promo_name {
        resp["breakdown"]["promo_code"] = json!(code);
        resp["breakdown"]["promo_pct"] = json!(promo_pct.to_string().parse::<f64>().unwrap_or(0.0));
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": resp,
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async fn get_tier_prices(pool: &PgPool) -> Vec<(String, f64)> {
    let rows = sqlx::query(
        "SELECT slug, monthly_price_eur::float8 as price FROM license_tiers WHERE monthly_price_eur > 0 ORDER BY sort_order",
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    rows.iter()
        .map(|r| {
            let slug: String = r.try_get("slug").unwrap_or_default();
            let price: f64 = r.try_get("price").unwrap_or(0.0);
            (slug, price)
        })
        .collect()
}
