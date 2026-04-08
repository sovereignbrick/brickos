// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Push notification subscription management for PWA.
// Stores Web Push API subscriptions and serves VAPID public key.

use actix_web::{web, HttpRequest, HttpResponse};
use serde::Deserialize;
use serde_json::json;
use crate::{config::Config, error::AppError, middleware::auth::AuthenticatedUser, PlatformPool};

#[derive(Debug, Deserialize)]
pub struct SubscribeRequest {
    pub endpoint: String,
    pub keys: SubscriptionKeys,
}

#[derive(Debug, Deserialize)]
pub struct SubscriptionKeys {
    pub p256dh: String,
    pub auth: String,
}

/// GET /api/v1/push/vapid-key
/// Returns the VAPID public key for client-side push subscription.
pub async fn vapid_key(config: web::Data<Config>) -> Result<HttpResponse, AppError> {
    let key = config.vapid_public_key.as_deref().unwrap_or_default();

    Ok(HttpResponse::Ok().json(json!({
        "data": { "vapid_public_key": key },
        "error": null
    })))
}

/// POST /api/v1/push/subscribe
/// Save a push subscription for the authenticated user.
pub async fn subscribe(
    platform_pool: web::Data<PlatformPool>,
    auth: AuthenticatedUser,
    body: web::Json<SubscribeRequest>,
    req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    let user_agent = req
        .headers()
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    sqlx::query(
        r#"INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key, user_agent)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id, endpoint) DO UPDATE SET
             p256dh_key = EXCLUDED.p256dh_key,
             auth_key = EXCLUDED.auth_key,
             user_agent = EXCLUDED.user_agent,
             updated_at = now()"#,
    )
    .bind(auth.user_id)
    .bind(&body.endpoint)
    .bind(&body.keys.p256dh)
    .bind(&body.keys.auth)
    .bind(&user_agent)
    .execute(&platform_pool.0)
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "subscribed": true },
        "error": null
    })))
}

/// DELETE /api/v1/push/unsubscribe
/// Remove a push subscription.
pub async fn unsubscribe(
    platform_pool: web::Data<PlatformPool>,
    auth: AuthenticatedUser,
    body: web::Json<UnsubscribeRequest>,
) -> Result<HttpResponse, AppError> {
    sqlx::query("DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2")
        .bind(auth.user_id)
        .bind(&body.endpoint)
        .execute(&platform_pool.0)
        .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "unsubscribed": true },
        "error": null
    })))
}

#[derive(Debug, Deserialize)]
pub struct UnsubscribeRequest {
    pub endpoint: String,
}
