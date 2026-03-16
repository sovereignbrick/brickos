// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpRequest, HttpResponse};
use serde_json::json;
use sqlx::PgPool;

use crate::config::Config;

// ---------------------------------------------------------------------------
// Helper: extract client IP
// ---------------------------------------------------------------------------

fn client_ip(req: &HttpRequest) -> String {
    // Cloudflare sets CF-Connecting-IP with the real client IP
    let raw = if let Some(cf_ip) = req.headers().get("CF-Connecting-IP") {
        cf_ip
            .to_str()
            .map(|s| s.trim().to_string())
            .unwrap_or_else(|_| {
                req.connection_info()
                    .realip_remote_addr()
                    .unwrap_or("unknown")
                    .to_string()
            })
    } else {
        // Fallback: X-Forwarded-For, X-Real-IP, then peer address
        req.connection_info()
            .realip_remote_addr()
            .unwrap_or("unknown")
            .to_string()
    };
    // Normalize: strip IPv6-mapped IPv4 prefix
    crate::handlers::admin_settings::normalize_ip(&raw)
}

// ---------------------------------------------------------------------------
// GET /v1/payments/status (public, no auth)
// ---------------------------------------------------------------------------

pub async fn payment_status(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    config: web::Data<Config>,
) -> HttpResponse {
    let payment_enabled =
        crate::handlers::admin_settings::get_setting_bool(pool.get_ref(), "payment_enabled", false)
            .await;

    // Determine Stripe mode from the secret key
    let stripe_mode = config
        .stripe
        .as_ref()
        .map(|s| {
            if s.secret_key.starts_with("sk_test_") {
                "test"
            } else {
                "live"
            }
        })
        .unwrap_or("unconfigured");

    if payment_enabled {
        return HttpResponse::Ok().json(json!({
            "data": {
                "allowed": true,
                "mode": "live",
                "stripe_mode": stripe_mode
            },
            "error": null
        }));
    }

    // Not globally enabled - check IP whitelists
    let ip = client_ip(&req);

    // Log all relevant headers for debugging IP detection
    let cf_ip_header = req
        .headers()
        .get("CF-Connecting-IP")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("(not set)");
    let xff_header = req
        .headers()
        .get("X-Forwarded-For")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("(not set)");
    tracing::info!(
        resolved_ip = %ip,
        cf_connecting_ip = %cf_ip_header,
        x_forwarded_for = %xff_header,
        "Payment status: IP detection"
    );

    // Check unified admin whitelist first
    if crate::handlers::admin_settings::is_ip_admin_whitelisted(pool.get_ref(), &ip).await {
        return HttpResponse::Ok().json(json!({
            "data": {
                "allowed": true,
                "mode": "test",
                "stripe_mode": stripe_mode
            },
            "error": null
        }));
    }

    // Check feature-specific whitelist
    let whitelisted = crate::handlers::admin_settings::is_ip_in_feature_whitelist(
        pool.get_ref(),
        &ip,
        "payment_whitelist_ips",
    )
    .await;

    if whitelisted {
        return HttpResponse::Ok().json(json!({
            "data": {
                "allowed": true,
                "mode": "test",
                "stripe_mode": stripe_mode
            },
            "error": null
        }));
    }

    let admin_wl = crate::handlers::admin_settings::get_setting(
        pool.get_ref(),
        "admin_whitelist_ips",
        json!([]),
    )
    .await;
    let feature_wl = crate::handlers::admin_settings::get_setting(
        pool.get_ref(),
        "payment_whitelist_ips",
        json!([]),
    )
    .await;
    tracing::warn!(
        ip = %ip,
        admin_whitelist = %admin_wl,
        payment_whitelist = %feature_wl,
        "Payment DENIED - IP not in any whitelist"
    );

    HttpResponse::Ok().json(json!({
        "data": {
            "allowed": false,
            "mode": null,
            "stripe_mode": stripe_mode
        },
        "error": null
    }))
}

// ---------------------------------------------------------------------------
// Guard: check payment whitelist for billing endpoints
// Returns Ok(()) if allowed, or an HttpResponse with 403 if not.
// ---------------------------------------------------------------------------

pub async fn check_payment_allowed(req: &HttpRequest, pool: &PgPool) -> Result<(), HttpResponse> {
    let payment_enabled =
        crate::handlers::admin_settings::get_setting_bool(pool, "payment_enabled", false).await;

    if payment_enabled {
        return Ok(());
    }

    let ip = client_ip(req);

    // Check unified admin whitelist first
    if crate::handlers::admin_settings::is_ip_admin_whitelisted(pool, &ip).await {
        return Ok(());
    }

    // Check feature-specific whitelist
    let whitelisted = crate::handlers::admin_settings::is_ip_in_feature_whitelist(
        pool,
        &ip,
        "payment_whitelist_ips",
    )
    .await;

    if whitelisted {
        return Ok(());
    }

    Err(HttpResponse::Forbidden().json(json!({
        "data": null,
        "error": {
            "code": "PAYMENTS_DISABLED",
            "message": "Payments are not currently available."
        }
    })))
}
