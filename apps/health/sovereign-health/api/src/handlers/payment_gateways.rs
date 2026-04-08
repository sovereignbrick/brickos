// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use serde::Deserialize;
use serde_json::json;
use sqlx::Row;

use crate::middleware::auth::AdminUser;
use crate::payments::PaymentRouter;
use crate::PlatformPool;

// ---------------------------------------------------------------------------
// GET /api/payments/gateways  (public - needed by pricing page)
// ---------------------------------------------------------------------------

pub async fn public_gateways(
    platform_pool: web::Data<PlatformPool>,
    router: Option<web::Data<PaymentRouter>>,
) -> HttpResponse {
    let btc_discount: f64 = crate::handlers::admin_settings::get_setting(
        &platform_pool.0,
        "btc_discount_percent",
        json!(5),
    )
    .await
    .as_f64()
    .unwrap_or(5.0);

    let fiat_gateway: String = crate::handlers::admin_settings::get_setting(
        &platform_pool.0,
        "payment_fiat_gateway",
        json!("stripe"),
    )
    .await
    .as_str()
    .unwrap_or("stripe")
    .to_string();

    let btc_gateway: String = crate::handlers::admin_settings::get_setting(
        &platform_pool.0,
        "payment_btc_gateway",
        json!("strike"),
    )
    .await
    .as_str()
    .unwrap_or("strike")
    .to_string();

    let fiat_enabled = crate::handlers::admin_settings::get_setting_bool(
        &platform_pool.0,
        &format!("gateway_{}_enabled", fiat_gateway),
        true,
    )
    .await;

    let btc_enabled = crate::handlers::admin_settings::get_setting_bool(
        &platform_pool.0,
        &format!("gateway_{}_enabled", btc_gateway),
        true,
    )
    .await;

    let mut fiat_available = vec![];
    let mut btc_available = vec![];

    if let Some(ref _router) = router {
        if fiat_enabled {
            fiat_available.push(&fiat_gateway);
        }
        if btc_enabled {
            btc_available.push(&btc_gateway);
        }
    }

    HttpResponse::Ok().json(json!({
        "data": {
            "fiat": {
                "active": if fiat_enabled { Some(&fiat_gateway) } else { None },
                "available": fiat_available,
            },
            "btc": {
                "active": if btc_enabled { Some(&btc_gateway) } else { None },
                "available": btc_available,
                "discount_percent": btc_discount,
            }
        },
        "error": null
    }))
}

// ---------------------------------------------------------------------------
// GET /admin/payments/gateways  (admin only)
// ---------------------------------------------------------------------------

pub async fn admin_list_gateways(
    platform_pool: web::Data<PlatformPool>,
    router: Option<web::Data<PaymentRouter>>,
    _admin: AdminUser,
) -> HttpResponse {
    let rows = sqlx::query(
        r#"SELECT gateway_id, enabled, is_active_fiat, is_active_btc,
                  last_success_at, last_failure_at, failure_count, config_valid
           FROM payment_gateway_status
           ORDER BY gateway_id"#,
    )
    .fetch_all(&platform_pool.0)
    .await;

    match rows {
        Ok(rows) => {
            let gateways: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    let gid: String = r.try_get("gateway_id").unwrap_or_default();
                    let config_valid = if let Some(ref router) = router {
                        crate::payments::GatewayId::from_str(&gid)
                            .and_then(|id| router.get(&id))
                            .map(|g| g.config_valid())
                            .unwrap_or(false)
                    } else {
                        false
                    };

                    json!({
                        "id": gid,
                        "enabled": r.try_get::<bool, _>("enabled").unwrap_or(false),
                        "is_active_fiat": r.try_get::<bool, _>("is_active_fiat").unwrap_or(false),
                        "is_active_btc": r.try_get::<bool, _>("is_active_btc").unwrap_or(false),
                        "config_valid": config_valid,
                        "last_success": r.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("last_success_at")
                            .ok().flatten().map(|d| d.to_rfc3339()),
                        "last_failure": r.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("last_failure_at")
                            .ok().flatten().map(|d| d.to_rfc3339()),
                        "failure_count": r.try_get::<i32, _>("failure_count").unwrap_or(0),
                    })
                })
                .collect();

            HttpResponse::Ok().json(json!({
                "data": { "gateways": gateways },
                "error": null
            }))
        }
        Err(e) => {
            tracing::error!("DB error fetching gateways: {}", e);
            HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "INTERNAL", "message": "Database error." }
            }))
        }
    }
}

// ---------------------------------------------------------------------------
// POST /admin/payments/gateways/{id}/activate  (admin only)
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct ActivateRequest {
    pub role: String, // "fiat" or "btc"
}

pub async fn admin_activate_gateway(
    platform_pool: web::Data<PlatformPool>,
    _admin: AdminUser,
    path: web::Path<String>,
    body: web::Json<ActivateRequest>,
) -> HttpResponse {
    let gateway_id = path.into_inner();
    let role = &body.role;

    if role != "fiat" && role != "btc" {
        return HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "INVALID_ROLE", "message": "Role must be 'fiat' or 'btc'." }
        }));
    }

    // Verify gateway exists
    let exists = sqlx::query("SELECT 1 FROM payment_gateway_status WHERE gateway_id = $1")
        .bind(&gateway_id)
        .fetch_optional(&platform_pool.0)
        .await
        .ok()
        .flatten();

    if exists.is_none() {
        return HttpResponse::NotFound().json(json!({
            "data": null,
            "error": { "code": "NOT_FOUND", "message": "Gateway not found." }
        }));
    }

    // Deactivate all gateways for this role, then activate the chosen one
    let (column, setting_key) = if role == "fiat" {
        ("is_active_fiat", "payment_fiat_gateway")
    } else {
        ("is_active_btc", "payment_btc_gateway")
    };

    let _ = sqlx::query(&format!(
        "UPDATE payment_gateway_status SET {} = false, updated_at = NOW()",
        column
    ))
    .execute(&platform_pool.0)
    .await;

    let _ = sqlx::query(&format!(
        "UPDATE payment_gateway_status SET {} = true, updated_at = NOW() WHERE gateway_id = $1",
        column
    ))
    .bind(&gateway_id)
    .execute(&platform_pool.0)
    .await;

    // Update the app_setting
    let _ = sqlx::query("UPDATE app_settings SET value = $1, updated_at = NOW() WHERE key = $2")
        .bind(json!(gateway_id))
        .bind(setting_key)
        .execute(&platform_pool.0)
        .await;

    HttpResponse::Ok().json(json!({
        "data": { "message": format!("{} is now the active {} gateway.", gateway_id, role) },
        "error": null
    }))
}

// ---------------------------------------------------------------------------
// POST /admin/payments/gateways/{id}/toggle  (admin only)
// ---------------------------------------------------------------------------

pub async fn admin_toggle_gateway(
    platform_pool: web::Data<PlatformPool>,
    _admin: AdminUser,
    path: web::Path<String>,
) -> HttpResponse {
    let gateway_id = path.into_inner();

    let row = sqlx::query(
        "UPDATE payment_gateway_status SET enabled = NOT enabled, updated_at = NOW() \
         WHERE gateway_id = $1 RETURNING enabled",
    )
    .bind(&gateway_id)
    .fetch_optional(&platform_pool.0)
    .await;

    match row {
        Ok(Some(r)) => {
            let enabled: bool = r.try_get("enabled").unwrap_or(false);
            // Also update app_settings
            let setting_key = format!("gateway_{}_enabled", gateway_id);
            let _ = sqlx::query(
                "UPDATE app_settings SET value = $1, updated_at = NOW() WHERE key = $2",
            )
            .bind(json!(enabled))
            .bind(&setting_key)
            .execute(&platform_pool.0)
            .await;

            HttpResponse::Ok().json(json!({
                "data": { "gateway_id": gateway_id, "enabled": enabled },
                "error": null
            }))
        }
        Ok(None) => HttpResponse::NotFound().json(json!({
            "data": null,
            "error": { "code": "NOT_FOUND", "message": "Gateway not found." }
        })),
        Err(e) => {
            tracing::error!("DB error toggling gateway: {}", e);
            HttpResponse::InternalServerError().json(json!({
                "data": null,
                "error": { "code": "INTERNAL", "message": "Database error." }
            }))
        }
    }
}

// ---------------------------------------------------------------------------
// POST /admin/payments/gateways/{id}/test  (admin only)
// ---------------------------------------------------------------------------

pub async fn admin_test_gateway(
    router: Option<web::Data<PaymentRouter>>,
    platform_pool: web::Data<PlatformPool>,
    _admin: AdminUser,
    path: web::Path<String>,
) -> HttpResponse {
    let gateway_id_str = path.into_inner();

    let router = match router {
        Some(r) => r,
        None => {
            return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "NO_ROUTER", "message": "Payment router not configured." }
            }))
        }
    };

    let gateway_id = match crate::payments::GatewayId::from_str(&gateway_id_str) {
        Some(id) => id,
        None => {
            return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "INVALID_ID", "message": "Unknown gateway." }
            }))
        }
    };

    let gateway = match router.get(&gateway_id) {
        Some(g) => g,
        None => {
            return HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "NOT_CONFIGURED", "message": "Gateway not configured in this instance." }
            }))
        }
    };

    match gateway.test_connection().await {
        Ok(latency_ms) => {
            router.record_success(&platform_pool.0, &gateway_id).await;

            // Update config_valid
            let _ = sqlx::query(
                "UPDATE payment_gateway_status SET config_valid = true, updated_at = NOW() WHERE gateway_id = $1",
            )
            .bind(gateway_id.as_str())
            .execute(&platform_pool.0)
            .await;

            HttpResponse::Ok().json(json!({
                "data": { "success": true, "latency_ms": latency_ms },
                "error": null
            }))
        }
        Err(e) => {
            router.record_failure(&platform_pool.0, &gateway_id).await;

            HttpResponse::Ok().json(json!({
                "data": { "success": false, "error": e.to_string() },
                "error": null
            }))
        }
    }
}
