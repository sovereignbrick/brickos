// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpRequest, HttpResponse};
use serde::Deserialize;
use serde_json::json;
use sqlx::{PgPool, Row};
use std::collections::HashMap;
use std::sync::{LazyLock, Mutex};
use uuid::Uuid;

use crate::{
    error::AppError,
    middleware::auth::{AdminUser, AuthenticatedUser},
    models::affiliate::{
        AffiliateClickRequest, AffiliateSettingsRequest, MarkPaidRequest, RejectConversionRequest,
    },
    models::doctor_chat::PaginationQuery,
};

// ---------------------------------------------------------------------------
// Click rate limiter (in-memory, hashed IP, no IP storage)
// ---------------------------------------------------------------------------

/// In-memory rate limiter: SHA256(IP + affiliate_code) → last click timestamp.
/// Limit: 1 click per code per IP-hash per hour.
static CLICK_RATE_LIMITER: LazyLock<Mutex<HashMap<String, i64>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

fn hash_ip_code(ip: &str, code: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(ip.as_bytes());
    hasher.update(b"::");
    hasher.update(code.as_bytes());
    hex::encode(hasher.finalize())
}

fn is_click_rate_limited(ip: &str, code: &str) -> bool {
    let key = hash_ip_code(ip, code);
    let now = chrono::Utc::now().timestamp();
    let mut map = match CLICK_RATE_LIMITER.lock() {
        Ok(m) => m,
        Err(_) => return false, // poisoned mutex - allow the click
    };

    // Clean up old entries (older than 1 hour) periodically
    if map.len() > 10_000 {
        map.retain(|_, &mut ts| now - ts < 3600);
    }

    if let Some(&last) = map.get(&key) {
        if now - last < 3600 {
            return true; // rate limited
        }
    }

    map.insert(key, now);
    false
}

// ---------------------------------------------------------------------------
// POST /api/affiliate/click (public, no auth)
// ---------------------------------------------------------------------------

pub async fn click(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    body: web::Json<AffiliateClickRequest>,
) -> HttpResponse {
    let code = body.affiliate_code.trim().to_lowercase();

    // Validate code exists
    let exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM users WHERE affiliate_code = $1 AND is_deleted = false)",
    )
    .bind(&code)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(false);

    if !exists {
        // Return 200 silently (don't reveal whether code exists or not to limit probing)
        return HttpResponse::Ok().json(json!({ "ok": true }));
    }

    // Rate limit by hashed IP (CF-Connecting-IP for Cloudflare)
    let ip = req
        .headers()
        .get("CF-Connecting-IP")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| {
            req.connection_info()
                .realip_remote_addr()
                .unwrap_or("unknown")
                .to_string()
        });

    if is_click_rate_limited(&ip, &code) {
        return HttpResponse::Ok().json(json!({ "ok": true }));
    }

    // Insert click
    let _ = sqlx::query("INSERT INTO affiliate_clicks (affiliate_code) VALUES ($1)")
        .bind(&code)
        .execute(pool.get_ref())
        .await;

    HttpResponse::Ok().json(json!({ "ok": true }))
}

// ---------------------------------------------------------------------------
// GET /api/affiliate/me (authenticated)
// ---------------------------------------------------------------------------

pub async fn me(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    config: web::Data<crate::config::Config>,
) -> Result<HttpResponse, AppError> {
    // Get user's affiliate code and settings
    let row = sqlx::query(
        "SELECT affiliate_code, affiliate_settings FROM users WHERE id = $1 AND is_deleted = false",
    )
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    let affiliate_code: String = match row
        .try_get::<Option<String>, _>("affiliate_code")
        .map_err(|_| AppError::Internal)?
    {
        Some(code) => code,
        None => {
            // Auto-generate missing affiliate code on first access
            let code = generate_affiliate_code(pool.get_ref()).await?;
            let _ = sqlx::query("UPDATE users SET affiliate_code = $1 WHERE id = $2")
                .bind(&code)
                .bind(auth.user_id)
                .execute(pool.get_ref())
                .await;
            code
        }
    };

    let affiliate_settings: Option<serde_json::Value> = row
        .try_get::<Option<serde_json::Value>, _>("affiliate_settings")
        .unwrap_or(None);

    // Count clicks
    let total_clicks: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM affiliate_clicks WHERE affiliate_code = $1")
            .bind(&affiliate_code)
            .fetch_one(pool.get_ref())
            .await
            .unwrap_or(0);

    // Count signups
    let total_signups: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM users WHERE referred_by = $1 AND is_deleted = false",
    )
    .bind(&affiliate_code)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    // Count paid conversions
    let paid_conversions: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM affiliate_conversions WHERE affiliate_code = $1 AND status = 'paid'",
    )
    .bind(&affiliate_code)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    // Commission sums by status — split by payout method
    // EUR: payout_method_snapshot IS NULL or != 'btc_onchain'
    // BTC: payout_method_snapshot = 'btc_onchain'
    let commission_row = sqlx::query(
        r#"SELECT
            COALESCE(SUM(CASE WHEN status = 'pending' AND (payout_method_snapshot IS NULL OR payout_method_snapshot != 'btc_onchain') THEN commission_amount_cents ELSE 0 END), 0) as eur_pending_cents,
            COALESCE(SUM(CASE WHEN status = 'approved' AND (payout_method_snapshot IS NULL OR payout_method_snapshot != 'btc_onchain') THEN commission_amount_cents ELSE 0 END), 0) as eur_approved_cents,
            COALESCE(SUM(CASE WHEN status = 'paid' AND (payout_method_snapshot IS NULL OR payout_method_snapshot != 'btc_onchain') THEN commission_amount_cents ELSE 0 END), 0) as eur_paid_cents,
            COALESCE(SUM(CASE WHEN status = 'pending' AND payout_method_snapshot = 'btc_onchain' THEN commission_btc_sats ELSE 0::bigint END), 0::bigint)::bigint as btc_pending_sats,
            COALESCE(SUM(CASE WHEN status = 'approved' AND payout_method_snapshot = 'btc_onchain' THEN commission_btc_sats ELSE 0::bigint END), 0::bigint)::bigint as btc_approved_sats,
            COALESCE(SUM(CASE WHEN status = 'paid' AND payout_method_snapshot = 'btc_onchain' THEN commission_btc_sats ELSE 0::bigint END), 0::bigint)::bigint as btc_paid_sats,
            EXISTS(SELECT 1 FROM affiliate_conversions WHERE affiliate_code = $1 AND (payout_method_snapshot IS NULL OR payout_method_snapshot != 'btc_onchain')) as has_eur,
            EXISTS(SELECT 1 FROM affiliate_conversions WHERE affiliate_code = $1 AND payout_method_snapshot = 'btc_onchain') as has_btc
        FROM affiliate_conversions WHERE affiliate_code = $1"#,
    )
    .bind(&affiliate_code)
    .fetch_one(pool.get_ref())
    .await?;

    let eur_pending: i64 = commission_row.try_get("eur_pending_cents").unwrap_or(0);
    let eur_approved: i64 = commission_row.try_get("eur_approved_cents").unwrap_or(0);
    let eur_paid: i64 = commission_row.try_get("eur_paid_cents").unwrap_or(0);
    let btc_pending_sats: i64 = commission_row.try_get("btc_pending_sats").unwrap_or(0);
    let btc_approved_sats: i64 = commission_row.try_get("btc_approved_sats").unwrap_or(0);
    let btc_paid_sats: i64 = commission_row.try_get("btc_paid_sats").unwrap_or(0);
    let has_eur: bool = commission_row.try_get("has_eur").unwrap_or(false);
    let has_btc: bool = commission_row.try_get("has_btc").unwrap_or(false);

    // Parse payout settings from JSONB
    let payout_settings = affiliate_settings.as_ref().map(|s| {
        json!({
            "method": s.get("payout_method").and_then(|v| v.as_str()),
            "btc_address": s.get("btc_address").and_then(|v| v.as_str()),
        })
    });

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "affiliate_code": affiliate_code,
            "referral_link": format!("https://brickos.io/r/sh{}", affiliate_code),
            "referral_link_direct": format!("{}/?ref={}", config.frontend_url.trim_end_matches('/'), affiliate_code),
            "stats": {
                "total_clicks": total_clicks,
                "total_signups": total_signups,
                "paid_conversions": paid_conversions,
                "pending_commission_cents": eur_pending,
                "approved_commission_cents": eur_approved,
                "paid_commission_cents": eur_paid,
            },
            "btc": {
                "pending_sats": btc_pending_sats,
                "approved_sats": btc_approved_sats,
                "paid_sats": btc_paid_sats,
            },
            "has_eur_commissions": has_eur,
            "has_btc_commissions": has_btc,
            "payout_settings": payout_settings,
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// PUT /api/affiliate/me/settings (authenticated)
// ---------------------------------------------------------------------------

pub async fn update_settings(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    body: web::Json<AffiliateSettingsRequest>,
) -> Result<HttpResponse, AppError> {
    // Validate payout method
    let valid_methods = ["btc_onchain", "bank"];
    if !valid_methods.contains(&body.payout_method.as_str()) {
        return Err(AppError::Validation(format!(
            "Invalid payout method. Allowed: {}",
            valid_methods.join(", ")
        )));
    }

    // Validate BTC address if method is btc_onchain
    if body.payout_method == "btc_onchain" {
        if let Some(ref addr) = body.btc_address {
            let addr = addr.trim();
            let valid = (addr.starts_with("bc1") || addr.starts_with('1') || addr.starts_with('3'))
                && addr.len() >= 26
                && addr.len() <= 90
                && addr.chars().all(|c| c.is_alphanumeric());
            if !valid {
                return Err(AppError::Validation(
                    "Invalid Bitcoin address format".to_string(),
                ));
            }
        } else {
            return Err(AppError::Validation(
                "btc_address is required for btc_onchain payout method".to_string(),
            ));
        }
    }

    let settings = json!({
        "payout_method": body.payout_method,
        "btc_address": body.btc_address,
    });

    sqlx::query("UPDATE users SET affiliate_settings = $1, updated_at = NOW() WHERE id = $2")
        .bind(&settings)
        .bind(auth.user_id)
        .execute(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "message": "Payout settings updated." },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /api/affiliate/me/conversions (authenticated)
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct ConversionsQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub sort: Option<String>,
    pub order: Option<String>,
}

pub async fn my_conversions(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    query: web::Query<ConversionsQuery>,
) -> Result<HttpResponse, AppError> {
    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * per_page;

    let order_dir = match query.order.as_deref() {
        Some("asc") => "ASC",
        _ => "DESC",
    };

    let order_clause = match query.sort.as_deref() {
        Some("amount") => format!("COALESCE(ac.commission_amount_cents, 0) {}", order_dir),
        Some("status") => format!("ac.status {}", order_dir),
        Some("method") => format!("ac.payout_method_snapshot {}", order_dir),
        _ => format!("ac.created_at {}", order_dir),
    };

    // Get affiliate code
    let affiliate_code: Option<String> =
        sqlx::query_scalar("SELECT affiliate_code FROM users WHERE id = $1")
            .bind(auth.user_id)
            .fetch_optional(pool.get_ref())
            .await?
            .flatten();

    let affiliate_code = match affiliate_code {
        Some(c) => c,
        None => {
            return Ok(HttpResponse::Ok().json(json!({
                "data": { "conversions": [], "total": 0, "page": page, "per_page": per_page },
                "error": null
            })))
        }
    };

    // Count total
    let total: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM affiliate_conversions WHERE affiliate_code = $1")
            .bind(&affiliate_code)
            .fetch_one(pool.get_ref())
            .await
            .unwrap_or(0);

    // Fetch page - join with users to get masked email
    let sql = format!(
        r#"SELECT ac.id, ac.status, ac.commission_amount_cents, ac.commission_btc_sats,
                  ac.payout_method_snapshot, ac.created_at, u.email as referred_email
           FROM affiliate_conversions ac
           LEFT JOIN users u ON u.id = ac.referred_user_id
           WHERE ac.affiliate_code = $1
           ORDER BY {}
           LIMIT $2 OFFSET $3"#,
        order_clause
    );

    let rows = sqlx::query(&sql)
        .bind(&affiliate_code)
        .bind(per_page)
        .bind(offset)
        .fetch_all(pool.get_ref())
        .await?;

    let conversions: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            let email: Option<String> = r.try_get("referred_email").unwrap_or(None);
            let masked = email.map(|e| mask_email(&e));
            json!({
                "id": r.try_get::<Uuid, _>("id").unwrap_or_default(),
                "status": r.try_get::<String, _>("status").unwrap_or_default(),
                "commission_amount_cents": r.try_get::<Option<i32>, _>("commission_amount_cents").unwrap_or(None),
                "commission_btc_sats": r.try_get::<Option<i64>, _>("commission_btc_sats").unwrap_or(None),
                "payout_method_snapshot": r.try_get::<Option<String>, _>("payout_method_snapshot").unwrap_or(None),
                "referred_email": masked,
                "created_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "conversions": conversions,
            "total": total,
            "page": page,
            "per_page": per_page,
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Admin: GET /api/admin/affiliates
// ---------------------------------------------------------------------------

pub async fn admin_list(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    query: web::Query<PaginationQuery>,
) -> Result<HttpResponse, AppError> {
    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(50).clamp(1, 100);
    let offset = (page - 1) * per_page;

    let rows = sqlx::query(
        r#"SELECT
               ac.affiliate_code,
               COUNT(*) as total_conversions,
               COALESCE(SUM(ac.commission_amount_cents), 0) as total_commission_cents,
               COALESCE(SUM(CASE WHEN ac.status IN ('pending', 'approved') THEN ac.commission_amount_cents ELSE 0 END), 0) as unpaid_commission_cents
           FROM affiliate_conversions ac
           GROUP BY ac.affiliate_code
           ORDER BY total_conversions DESC
           LIMIT $1 OFFSET $2"#,
    )
    .bind(per_page)
    .bind(offset)
    .fetch_all(pool.get_ref())
    .await?;

    let affiliates: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "affiliate_code": r.try_get::<String, _>("affiliate_code").unwrap_or_default(),
                "total_conversions": r.try_get::<i64, _>("total_conversions").unwrap_or(0),
                "total_commission_cents": r.try_get::<i64, _>("total_commission_cents").unwrap_or(0),
                "unpaid_commission_cents": r.try_get::<i64, _>("unpaid_commission_cents").unwrap_or(0),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": { "affiliates": affiliates },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Admin: GET /api/admin/affiliates/queue
// ---------------------------------------------------------------------------

pub async fn admin_queue(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let rows = sqlx::query(
        r#"SELECT id, affiliate_code, commission_amount_cents, evaluation_ends_at, created_at
           FROM affiliate_conversions
           WHERE status = 'pending' AND (evaluation_ends_at IS NULL OR evaluation_ends_at < NOW())
           ORDER BY created_at ASC"#,
    )
    .fetch_all(pool.get_ref())
    .await?;

    let queue: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "conversion_id": r.try_get::<Uuid, _>("id").unwrap_or_default(),
                "affiliate_code": r.try_get::<String, _>("affiliate_code").unwrap_or_default(),
                "commission_amount_cents": r.try_get::<Option<i32>, _>("commission_amount_cents").unwrap_or(None),
                "evaluation_ends_at": r.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("evaluation_ends_at").unwrap_or(None),
                "created_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": { "queue": queue },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Admin: POST /api/admin/conversions/:id/approve
// ---------------------------------------------------------------------------

pub async fn admin_approve(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let conversion_id = path.into_inner();

    let result = sqlx::query(
        r#"UPDATE affiliate_conversions
           SET status = 'approved', updated_at = NOW()
           WHERE id = $1 AND status = 'pending'
           RETURNING id, affiliate_code, status, commission_amount_cents, created_at"#,
    )
    .bind(conversion_id)
    .fetch_optional(pool.get_ref())
    .await?;

    match result {
        Some(row) => Ok(HttpResponse::Ok().json(json!({
            "data": {
                "id": row.try_get::<Uuid, _>("id").unwrap_or_default(),
                "affiliate_code": row.try_get::<String, _>("affiliate_code").unwrap_or_default(),
                "status": row.try_get::<String, _>("status").unwrap_or_default(),
                "commission_amount_cents": row.try_get::<Option<i32>, _>("commission_amount_cents").unwrap_or(None),
                "created_at": row.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
            },
            "error": null
        }))),
        None => Err(AppError::NotFound),
    }
}

// ---------------------------------------------------------------------------
// Admin: POST /api/admin/conversions/:id/reject
// ---------------------------------------------------------------------------

pub async fn admin_reject(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
    body: web::Json<RejectConversionRequest>,
) -> Result<HttpResponse, AppError> {
    let conversion_id = path.into_inner();

    let result = sqlx::query(
        r#"UPDATE affiliate_conversions
           SET status = 'rejected', rejection_reason = $1, updated_at = NOW()
           WHERE id = $2 AND status = 'pending'
           RETURNING id, affiliate_code, status, commission_amount_cents, rejection_reason, created_at"#,
    )
    .bind(&body.reason)
    .bind(conversion_id)
    .fetch_optional(pool.get_ref())
    .await?;

    match result {
        Some(row) => Ok(HttpResponse::Ok().json(json!({
            "data": {
                "id": row.try_get::<Uuid, _>("id").unwrap_or_default(),
                "affiliate_code": row.try_get::<String, _>("affiliate_code").unwrap_or_default(),
                "status": row.try_get::<String, _>("status").unwrap_or_default(),
                "commission_amount_cents": row.try_get::<Option<i32>, _>("commission_amount_cents").unwrap_or(None),
                "rejection_reason": row.try_get::<Option<String>, _>("rejection_reason").unwrap_or(None),
                "created_at": row.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
            },
            "error": null
        }))),
        None => Err(AppError::NotFound),
    }
}

// ---------------------------------------------------------------------------
// Admin: POST /api/admin/payouts/create
// ---------------------------------------------------------------------------

pub async fn admin_create_payouts(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    // Group approved conversions by affiliate_code, only where total >= 2500 cents (€25)
    let groups = sqlx::query(
        r#"SELECT affiliate_code,
               SUM(commission_amount_cents) as total_cents,
               array_agg(id) as conversion_ids
           FROM affiliate_conversions
           WHERE status = 'approved'
           GROUP BY affiliate_code
           HAVING SUM(commission_amount_cents) >= 2500"#,
    )
    .fetch_all(pool.get_ref())
    .await?;

    let mut created_payouts = Vec::new();

    for group in &groups {
        let affiliate_code: String = group.try_get("affiliate_code").unwrap_or_default();
        let total_cents: i64 = group.try_get("total_cents").unwrap_or(0);
        let conversion_ids: Vec<Uuid> = group.try_get("conversion_ids").unwrap_or_default();

        // Determine payout method from user's affiliate settings
        let settings_row =
            sqlx::query("SELECT affiliate_settings FROM users WHERE affiliate_code = $1")
                .bind(&affiliate_code)
                .fetch_optional(pool.get_ref())
                .await?;

        let payout_method = settings_row
            .and_then(|r| {
                r.try_get::<Option<serde_json::Value>, _>("affiliate_settings")
                    .unwrap_or(None)
            })
            .and_then(|s| {
                s.get("payout_method")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            })
            .unwrap_or_else(|| "btc_onchain".to_string());

        // Create payout record
        let payout_row = sqlx::query(
            r#"INSERT INTO affiliate_payouts (affiliate_code, amount_cents, payout_method, status)
               VALUES ($1, $2, $3, 'pending')
               RETURNING id, affiliate_code, amount_cents, payout_method, status, created_at"#,
        )
        .bind(&affiliate_code)
        .bind(total_cents as i32)
        .bind(&payout_method)
        .fetch_one(pool.get_ref())
        .await?;

        // Mark conversions as paid
        sqlx::query(
            "UPDATE affiliate_conversions SET status = 'paid', updated_at = NOW() WHERE id = ANY($1)",
        )
        .bind(&conversion_ids)
        .execute(pool.get_ref())
        .await?;

        created_payouts.push(json!({
            "id": payout_row.try_get::<Uuid, _>("id").unwrap_or_default(),
            "affiliate_code": affiliate_code,
            "amount_cents": total_cents,
            "payout_method": payout_method,
            "status": "pending",
            "created_at": payout_row.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
        }));
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": { "payouts": created_payouts },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Admin: POST /api/admin/payouts/:id/mark-paid
// ---------------------------------------------------------------------------

pub async fn admin_mark_paid(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
    body: web::Json<MarkPaidRequest>,
) -> Result<HttpResponse, AppError> {
    let payout_id = path.into_inner();

    let result = sqlx::query(
        r#"UPDATE affiliate_payouts
           SET status = 'paid', payout_reference = $1, paid_at = NOW()
           WHERE id = $2 AND status = 'pending'
           RETURNING id, affiliate_code, amount_cents, payout_method, payout_reference, status, paid_at, created_at"#,
    )
    .bind(&body.payout_reference)
    .bind(payout_id)
    .fetch_optional(pool.get_ref())
    .await?;

    match result {
        Some(row) => Ok(HttpResponse::Ok().json(json!({
            "data": {
                "id": row.try_get::<Uuid, _>("id").unwrap_or_default(),
                "affiliate_code": row.try_get::<String, _>("affiliate_code").unwrap_or_default(),
                "amount_cents": row.try_get::<Option<i32>, _>("amount_cents").unwrap_or(None),
                "payout_method": row.try_get::<String, _>("payout_method").unwrap_or_default(),
                "payout_reference": row.try_get::<Option<String>, _>("payout_reference").unwrap_or(None),
                "status": row.try_get::<String, _>("status").unwrap_or_default(),
                "paid_at": row.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("paid_at").unwrap_or(None),
                "created_at": row.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
            },
            "error": null
        }))),
        None => Err(AppError::NotFound),
    }
}

// ---------------------------------------------------------------------------
// Admin: GET /api/admin/affiliates/queue/count
// ---------------------------------------------------------------------------

pub async fn admin_queue_count(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM affiliate_conversions WHERE status = 'pending' AND (evaluation_ends_at IS NULL OR evaluation_ends_at < NOW())",
    )
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    Ok(HttpResponse::Ok().json(json!({
        "data": { "count": count },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Admin: GET /api/admin/payouts
// ---------------------------------------------------------------------------

pub async fn admin_list_payouts(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let rows = sqlx::query(
        r#"SELECT id, affiliate_code, amount_cents, payout_method, payout_reference, status, paid_at, created_at
           FROM affiliate_payouts
           ORDER BY created_at DESC
           LIMIT 100"#,
    )
    .fetch_all(pool.get_ref())
    .await?;

    let payouts: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "id": r.try_get::<Uuid, _>("id").unwrap_or_default(),
                "affiliate_code": r.try_get::<String, _>("affiliate_code").unwrap_or_default(),
                "amount_cents": r.try_get::<Option<i32>, _>("amount_cents").unwrap_or(None),
                "payout_method": r.try_get::<String, _>("payout_method").unwrap_or_default(),
                "payout_reference": r.try_get::<Option<String>, _>("payout_reference").unwrap_or(None),
                "status": r.try_get::<String, _>("status").unwrap_or_default(),
                "paid_at": r.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("paid_at").unwrap_or(None),
                "created_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": { "payouts": payouts },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Cron: auto-approve expired pending conversions
// ---------------------------------------------------------------------------

pub async fn cron_auto_approve(pool: &PgPool) {
    let result = sqlx::query(
        r#"UPDATE affiliate_conversions
           SET status = 'approved', updated_at = NOW()
           WHERE status = 'pending' AND evaluation_ends_at IS NOT NULL AND evaluation_ends_at < NOW()
           RETURNING id"#,
    )
    .fetch_all(pool)
    .await;

    match result {
        Ok(rows) if !rows.is_empty() => {
            tracing::info!("Affiliate cron: auto-approved {} conversions", rows.len());
        }
        Ok(_) => {
            tracing::debug!("Affiliate cron: no conversions to auto-approve");
        }
        Err(e) => {
            tracing::warn!("Affiliate cron: failed to auto-approve: {e}");
        }
    }
}

// ---------------------------------------------------------------------------
// Helper: mask email for privacy (e.g., "h***@example.com")
// ---------------------------------------------------------------------------

fn mask_email(email: &str) -> String {
    if let Some(at) = email.find('@') {
        let local = &email[..at];
        let domain = &email[at..];
        if local.len() <= 1 {
            format!("*{domain}")
        } else {
            format!("{}***{domain}", &local[..1])
        }
    } else {
        "***".to_string()
    }
}

// ---------------------------------------------------------------------------
// Helper: BTC/EUR rate from CoinGecko (free, no API key)
// ---------------------------------------------------------------------------

/// Cached BTC/EUR rate to avoid hammering CoinGecko on every conversion
static BTC_EUR_CACHE: LazyLock<Mutex<(f64, i64)>> = LazyLock::new(|| Mutex::new((0.0, 0))); // (rate, unix_timestamp)

async fn get_btc_eur_rate() -> Result<f64, anyhow::Error> {
    // Check cache (valid for 5 minutes)
    {
        let cache = BTC_EUR_CACHE
            .lock()
            .map_err(|_| anyhow::anyhow!("cache lock"))?;
        let now = chrono::Utc::now().timestamp();
        if cache.0 > 0.0 && now - cache.1 < 300 {
            return Ok(cache.0);
        }
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let resp = client
        .get("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur")
        .send()
        .await?;

    let data: serde_json::Value = resp.json().await?;
    let rate = data["bitcoin"]["eur"]
        .as_f64()
        .ok_or_else(|| anyhow::anyhow!("Failed to parse BTC/EUR rate from CoinGecko"))?;

    // Update cache
    if let Ok(mut cache) = BTC_EUR_CACHE.lock() {
        *cache = (rate, chrono::Utc::now().timestamp());
    }

    Ok(rate)
}

fn eur_cents_to_sats(eur_cents: i32, btc_eur_rate: f64) -> i64 {
    let eur_amount = eur_cents as f64 / 100.0;
    let btc_amount = eur_amount / btc_eur_rate;
    (btc_amount * 100_000_000.0).round() as i64
}

// ---------------------------------------------------------------------------
// Helper: generate unique affiliate code
// ---------------------------------------------------------------------------

pub async fn generate_affiliate_code(pool: &PgPool) -> Result<String, AppError> {
    use rand::Rng;
    let charset: &[u8] = b"abcdefghijklmnopqrstuvwxyz0123456789";

    for _ in 0..10 {
        let code: String = (0..8)
            .map(|_| {
                let idx = rand::rng().random_range(0..charset.len());
                charset[idx] as char
            })
            .collect();

        let exists: bool =
            sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM users WHERE affiliate_code = $1)")
                .bind(&code)
                .fetch_one(pool)
                .await
                .unwrap_or(true);

        if !exists {
            return Ok(code);
        }
    }

    Err(AppError::Internal)
}

// ---------------------------------------------------------------------------
// Helper: create affiliate conversion on subscription purchase
// ---------------------------------------------------------------------------

pub async fn create_affiliate_conversion(pool: &PgPool, user_id: Uuid, order_amount_cents: i32) {
    // Check if user was referred
    let referred_by: Option<String> = match sqlx::query_scalar::<_, Option<String>>(
        "SELECT referred_by FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await
    {
        Ok(Some(code)) => code,
        _ => return,
    };

    let affiliate_code = match referred_by {
        Some(c) if !c.is_empty() => c,
        _ => return,
    };

    // Check for duplicate: one-time commission per affiliate+user pair
    let existing: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM affiliate_conversions WHERE affiliate_code = $1 AND referred_user_id = $2)",
    )
    .bind(&affiliate_code)
    .bind(user_id)
    .fetch_one(pool)
    .await
    .unwrap_or(true);

    if existing {
        return;
    }

    // Fetch configurable commission rate (default 20% = 2000 bps)
    let direct_rate_bps: i32 =
        sqlx::query_scalar("SELECT rate_bps FROM affiliate_commission_rates WHERE level = 1")
            .fetch_optional(pool)
            .await
            .ok()
            .flatten()
            .unwrap_or(2000);

    let commission_cents = (order_amount_cents as f64 * (direct_rate_bps as f64 / 10000.0)) as i32;
    let evaluation_ends_at = chrono::Utc::now() + chrono::Duration::days(30);

    // Check for parent referrer (hierarchical commission)
    let parent_info: Option<(String,)> = sqlx::query_as(
        "SELECT grandparent.affiliate_code \
         FROM users u \
         JOIN users referrer ON u.referred_by = referrer.affiliate_code \
         JOIN users grandparent ON referrer.referred_by = grandparent.affiliate_code \
         WHERE u.id = $1 AND referrer.referred_by IS NOT NULL",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();

    let (parent_affiliate_code, parent_commission_cents) = if let Some((parent_code,)) = parent_info
    {
        let parent_rate_bps: i32 =
            sqlx::query_scalar("SELECT rate_bps FROM affiliate_commission_rates WHERE level = 2")
                .fetch_optional(pool)
                .await
                .ok()
                .flatten()
                .unwrap_or(200);
        let parent_cents = (order_amount_cents as f64 * (parent_rate_bps as f64 / 10000.0)) as i32;
        (Some(parent_code), parent_cents)
    } else {
        (None, 0)
    };

    // Snapshot the affiliate's current payout method
    let payout_method_snapshot = sqlx::query_scalar::<_, Option<serde_json::Value>>(
        "SELECT affiliate_settings FROM users WHERE affiliate_code = $1",
    )
    .bind(&affiliate_code)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten()
    .flatten()
    .and_then(|s| {
        s.get("payout_method")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    })
    .unwrap_or_else(|| "btc_onchain".to_string());

    // If payout is BTC, lock the rate and calculate sats
    let (btc_sats, btc_rate) = if payout_method_snapshot == "btc_onchain" {
        match get_btc_eur_rate().await {
            Ok(rate) => {
                let sats = eur_cents_to_sats(commission_cents, rate);
                (Some(sats), Some(rate))
            }
            Err(e) => {
                tracing::warn!("Failed to fetch BTC/EUR rate for affiliate conversion: {e}");
                (None, None)
            }
        }
    } else {
        (None, None)
    };

    let rate_locked_at = btc_rate.map(|_| chrono::Utc::now());

    let _ = sqlx::query(
        r#"INSERT INTO affiliate_conversions
           (affiliate_code, referred_user_id, commission_amount_cents, commission_btc_sats,
            btc_eur_rate, rate_locked_at, payout_method_snapshot, status, evaluation_ends_at,
            parent_affiliate_code, parent_commission_cents)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10)"#,
    )
    .bind(&affiliate_code)
    .bind(user_id)
    .bind(commission_cents)
    .bind(btc_sats)
    .bind(btc_rate)
    .bind(rate_locked_at)
    .bind(&payout_method_snapshot)
    .bind(evaluation_ends_at)
    .bind(&parent_affiliate_code)
    .bind(parent_commission_cents)
    .execute(pool)
    .await;

    tracing::info!(
        "Affiliate conversion created: code={} user={} commission={}c method={} sats={:?}",
        affiliate_code,
        user_id,
        commission_cents,
        payout_method_snapshot,
        btc_sats
    );
}
