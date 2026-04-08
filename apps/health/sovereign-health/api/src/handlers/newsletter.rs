// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpRequest, HttpResponse};
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;
use sqlx::{PgPool, Row};
use std::sync::Arc;
use uuid::Uuid;

use brickos_email::EmailProvider;

use crate::error::AppError;
use crate::middleware::auth::AdminUser;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn generate_confirm_token(email: &str) -> String {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;

    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "newsletter-fallback".to_string());
    let mut mac =
        Hmac::<Sha256>::new_from_slice(secret.as_bytes()).expect("HMAC can take key of any size");
    mac.update(email.as_bytes());
    mac.update(b":newsletter-confirm");
    hex::encode(mac.finalize().into_bytes())
}

fn generate_unsubscribe_token(email: &str) -> String {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;

    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "newsletter-fallback".to_string());
    let mut mac =
        Hmac::<Sha256>::new_from_slice(secret.as_bytes()).expect("HMAC can take key of any size");
    mac.update(email.as_bytes());
    mac.update(b":newsletter-unsub");
    hex::encode(mac.finalize().into_bytes())
}

fn is_valid_email(email: &str) -> bool {
    let at_pos = email.find('@');
    let dot_pos = email.rfind('.');
    match (at_pos, dot_pos) {
        (Some(at), Some(dot)) => {
            at > 0 && dot > at + 1 && dot < email.len() - 1 && email.len() >= 5
        }
        _ => false,
    }
}

// ---------------------------------------------------------------------------
// POST /api/newsletter/subscribe (public, no auth)
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct SubscribeRequest {
    pub email: String,
    pub source: Option<String>,
    #[serde(default)]
    pub website_url: String, // honeypot field - reject if filled
}

pub async fn subscribe(
    _req: HttpRequest,
    pool: web::Data<PgPool>,
    email_provider: web::Data<Arc<dyn EmailProvider>>,
    notifier: web::Data<crate::services::notify::Notifier>,
    body: web::Json<SubscribeRequest>,
) -> Result<HttpResponse, AppError> {
    // Honeypot check
    if !body.website_url.is_empty() {
        // Bot detected - return success silently
        return Ok(HttpResponse::Ok().json(json!({
            "data": { "message": "success" },
            "error": null
        })));
    }

    let email = body.email.trim().to_lowercase();
    if !is_valid_email(&email) {
        return Ok(HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "INVALID_EMAIL", "message": "Please enter a valid email address." }
        })));
    }

    let source = body.source.as_deref().unwrap_or("website");

    // Check if already exists
    let existing = sqlx::query(
        "SELECT id, confirmed, subscribed FROM newsletter_subscribers WHERE email = $1",
    )
    .bind(&email)
    .fetch_optional(pool.get_ref())
    .await?;

    let confirm_token = generate_confirm_token(&email);

    if let Some(row) = existing {
        let confirmed: bool = row.try_get("confirmed").unwrap_or(false);
        let subscribed: bool = row.try_get("subscribed").unwrap_or(false);

        if confirmed && subscribed {
            // Already confirmed and subscribed - return success silently
            return Ok(HttpResponse::Ok().json(json!({
                "data": { "message": "success" },
                "error": null
            })));
        }

        if !subscribed {
            // Re-subscribe
            sqlx::query(
                r#"UPDATE newsletter_subscribers SET
                   subscribed = true, confirm_token = $1, confirmed = false,
                   unsubscribed_at = NULL, updated_at = NOW()
                   WHERE email = $2"#,
            )
            .bind(&confirm_token)
            .bind(&email)
            .execute(pool.get_ref())
            .await?;
        } else {
            // Exists but not confirmed - update token
            sqlx::query(
                "UPDATE newsletter_subscribers SET confirm_token = $1, updated_at = NOW() WHERE email = $2",
            )
            .bind(&confirm_token)
            .bind(&email)
            .execute(pool.get_ref())
            .await?;
        }
    } else {
        // New subscriber
        sqlx::query(
            r#"INSERT INTO newsletter_subscribers (email, source, confirm_token)
               VALUES ($1, $2, $3)
               ON CONFLICT (email) DO NOTHING"#,
        )
        .bind(&email)
        .bind(source)
        .bind(&confirm_token)
        .execute(pool.get_ref())
        .await?;

        notifier.send(
            crate::services::notify::Channel::Info,
            crate::services::notify::Priority::Default,
            "New newsletter subscriber",
            &format!("source={source}"),
        );
    }

    // Send confirmation email (double opt-in)
    let provider = email_provider.get_ref().clone();
    let email_clone = email.clone();
    let token_clone = confirm_token.clone();
    tokio::spawn(async move {
        let base_url = std::env::var("FRONTEND_URL")
            .unwrap_or_else(|_| "https://sovereignhealth.io".to_string());
        let encoded_email = email_clone.replace("@", "%40").replace("+", "%2B");
        let confirm_url = format!(
            "{}/api/newsletter/confirm?token={}&email={}",
            base_url.replace("https://app.", "https://api."),
            token_clone,
            encoded_email
        );

        let subject = "Confirm your subscription to Sovereign Health";
        let html = format!(
            r#"<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #fff;">Confirm your subscription</h2>
            <p>Thank you for your interest in Sovereign Health Intelligence.</p>
            <p>Please confirm your subscription by clicking the button below:</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="{}" style="background: #3b82f6; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                    Confirm Subscription
                </a>
            </p>
            <p style="color: #888; font-size: 12px;">If you did not request this, you can safely ignore this email.</p>
            </div>"#,
            confirm_url
        );
        let text = format!(
            "Confirm your subscription to Sovereign Health Intelligence.\n\nClick here: {}\n\nIf you did not request this, ignore this email.",
            confirm_url
        );

        if let Err(e) = provider.send(&email_clone, subject, &html, &text).await {
            tracing::warn!("Newsletter confirm email failed for {}: {}", email_clone, e);
        }
    });

    Ok(HttpResponse::Ok().json(json!({
        "data": { "message": "success" },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /api/newsletter/confirm?token=xxx&email=xxx (public)
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct ConfirmQuery {
    pub token: String,
    pub email: String,
}

pub async fn confirm(pool: web::Data<PgPool>, query: web::Query<ConfirmQuery>) -> HttpResponse {
    let email = query.email.trim().to_lowercase();
    let expected_token = generate_confirm_token(&email);

    if query.token != expected_token {
        return HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "INVALID_TOKEN", "message": "Invalid or expired confirmation link." }
        }));
    }

    let result = sqlx::query(
        r#"UPDATE newsletter_subscribers SET
           confirmed = true, confirmed_at = NOW(), mailgun_synced = false, updated_at = NOW()
           WHERE email = $1 AND subscribed = true
           RETURNING id"#,
    )
    .bind(&email)
    .fetch_optional(pool.get_ref())
    .await;

    match result {
        Ok(Some(_)) => {
            // Sync to Mailgun
            let mailgun_key = std::env::var("MAILGUN_API_KEY").unwrap_or_default();
            let mailgun_base = std::env::var("MAILGUN_API_BASE")
                .unwrap_or_else(|_| "https://api.eu.mailgun.net".to_string());
            let mailgun_domain =
                std::env::var("MAILGUN_DOMAIN").unwrap_or_else(|_| "mg.sovereignhealth.io".to_string());
            let list_address = format!("newsletter@{}", mailgun_domain);

            if !mailgun_key.is_empty() {
                let client = reqwest::Client::new();
                let resp = client
                    .post(format!("{}/v3/lists/{}/members", mailgun_base, list_address))
                    .basic_auth("api", Some(&mailgun_key))
                    .form(&[
                        ("address", email.as_str()),
                        ("subscribed", "true"),
                        ("upsert", "true"),
                    ])
                    .send()
                    .await;

                if resp.is_ok() {
                    let _ = sqlx::query(
                        "UPDATE newsletter_subscribers SET mailgun_synced = true, updated_at = NOW() WHERE email = $1",
                    )
                    .bind(&email)
                    .execute(pool.get_ref())
                    .await;
                }
            }

            // Redirect to website with success
            let frontend_url = std::env::var("FRONTEND_URL")
                .unwrap_or_else(|_| "https://app.sovereignhealth.io".to_string());
            HttpResponse::Found()
                .append_header(("Location", format!("{}/?newsletter=confirmed", frontend_url)))
                .finish()
        }
        _ => HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "NOT_FOUND", "message": "Subscription not found or already confirmed." }
        })),
    }
}

// ---------------------------------------------------------------------------
// POST /api/newsletter/unsubscribe (public, token-based)
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct UnsubscribeRequest {
    pub email: String,
    pub token: String,
}

pub async fn unsubscribe(
    pool: web::Data<PgPool>,
    body: web::Json<UnsubscribeRequest>,
) -> Result<HttpResponse, AppError> {
    let email = body.email.trim().to_lowercase();
    let expected_token = generate_unsubscribe_token(&email);

    if body.token != expected_token {
        return Ok(HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": { "code": "INVALID_TOKEN", "message": "Invalid unsubscribe token." }
        })));
    }

    sqlx::query(
        r#"UPDATE newsletter_subscribers SET
           subscribed = false, unsubscribed_at = NOW(), updated_at = NOW()
           WHERE email = $1"#,
    )
    .bind(&email)
    .execute(pool.get_ref())
    .await?;

    // Remove from Mailgun
    let mailgun_key = std::env::var("MAILGUN_API_KEY").unwrap_or_default();
    let mailgun_base = std::env::var("MAILGUN_API_BASE")
        .unwrap_or_else(|_| "https://api.eu.mailgun.net".to_string());
    let mailgun_domain =
        std::env::var("MAILGUN_DOMAIN").unwrap_or_else(|_| "mg.sovereignhealth.io".to_string());
    let list_address = format!("newsletter@{}", mailgun_domain);

    if !mailgun_key.is_empty() {
        let client = reqwest::Client::new();
        let _ = client
            .delete(format!(
                "{}/v3/lists/{}/members/{}",
                mailgun_base, list_address, email
            ))
            .basic_auth("api", Some(&mailgun_key))
            .send()
            .await;
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": { "message": "Unsubscribed successfully." },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Admin: GET /admin/newsletter/subscribers
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct SubscriberQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub app_key: Option<String>,
}

pub async fn admin_subscribers(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    query: web::Query<SubscriberQuery>,
) -> Result<HttpResponse, AppError> {
    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(50).min(200);
    let offset = (page - 1) * per_page;
    let app_key = query.app_key.as_deref().unwrap_or("");

    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM newsletter_subscribers WHERE ($1 = '' OR source = $1)",
    )
    .bind(app_key)
    .fetch_one(pool.get_ref())
    .await?;

    let subscribed: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM newsletter_subscribers WHERE subscribed = true AND confirmed = true AND ($1 = '' OR source = $1)",
    )
    .bind(app_key)
    .fetch_one(pool.get_ref())
    .await?;

    let unsubscribed: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM newsletter_subscribers WHERE subscribed = false AND ($1 = '' OR source = $1)",
    )
    .bind(app_key)
    .fetch_one(pool.get_ref())
    .await?;

    let pending: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM newsletter_subscribers WHERE subscribed = true AND confirmed = false AND ($1 = '' OR source = $1)",
    )
    .bind(app_key)
    .fetch_one(pool.get_ref())
    .await?;

    let rows = sqlx::query(
        r#"SELECT id, email, source, subscribed, confirmed, confirmed_at,
                  unsubscribed_at, mailgun_synced, created_at
           FROM newsletter_subscribers
           WHERE ($3 = '' OR source = $3)
           ORDER BY created_at DESC
           LIMIT $1 OFFSET $2"#,
    )
    .bind(per_page)
    .bind(offset)
    .bind(app_key)
    .fetch_all(pool.get_ref())
    .await?;

    let subscribers: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "id": r.try_get::<Uuid, _>("id").unwrap_or_default(),
                "email": r.try_get::<String, _>("email").unwrap_or_default(),
                "source": r.try_get::<String, _>("source").unwrap_or_default(),
                "subscribed": r.try_get::<bool, _>("subscribed").unwrap_or(false),
                "confirmed": r.try_get::<bool, _>("confirmed").unwrap_or(false),
                "confirmed_at": r.try_get::<Option<chrono::DateTime<Utc>>, _>("confirmed_at").ok().flatten().map(|d| d.to_rfc3339()),
                "unsubscribed_at": r.try_get::<Option<chrono::DateTime<Utc>>, _>("unsubscribed_at").ok().flatten().map(|d| d.to_rfc3339()),
                "mailgun_synced": r.try_get::<bool, _>("mailgun_synced").unwrap_or(false),
                "created_at": r.try_get::<chrono::DateTime<Utc>, _>("created_at").unwrap_or_else(|_| Utc::now()).to_rfc3339(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "subscribers": subscribers,
            "meta": {
                "total": total,
                "subscribed": subscribed,
                "unsubscribed": unsubscribed,
                "pending": pending,
                "page": page,
                "per_page": per_page,
            }
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Admin: GET /admin/newsletter/export (CSV download)
// ---------------------------------------------------------------------------

pub async fn admin_export(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let rows = sqlx::query(
        r#"SELECT email, source, subscribed, confirmed, confirmed_at, created_at
           FROM newsletter_subscribers
           WHERE subscribed = true AND confirmed = true
           ORDER BY created_at DESC"#,
    )
    .fetch_all(pool.get_ref())
    .await?;

    let mut csv = String::from("email,source,subscribed,confirmed,confirmed_at,created_at\n");
    for r in &rows {
        let email: String = r.try_get("email").unwrap_or_default();
        let source: String = r.try_get("source").unwrap_or_default();
        let subscribed: bool = r.try_get("subscribed").unwrap_or(false);
        let confirmed: bool = r.try_get("confirmed").unwrap_or(false);
        let confirmed_at: Option<chrono::DateTime<Utc>> = r.try_get("confirmed_at").ok().flatten();
        let created_at: chrono::DateTime<Utc> =
            r.try_get("created_at").unwrap_or_else(|_| Utc::now());

        csv.push_str(&format!(
            "{},{},{},{},{},{}\n",
            email,
            source,
            subscribed,
            confirmed,
            confirmed_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
            created_at.to_rfc3339()
        ));
    }

    Ok(HttpResponse::Ok()
        .insert_header(("Content-Type", "text/csv"))
        .insert_header((
            "Content-Disposition",
            "attachment; filename=\"newsletter-subscribers.csv\"",
        ))
        .body(csv))
}

// ---------------------------------------------------------------------------
// Admin: POST /admin/newsletter/sync (sync all confirmed to Mailgun)
// ---------------------------------------------------------------------------

pub async fn admin_sync(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let mailgun_key = std::env::var("MAILGUN_API_KEY").unwrap_or_default();
    let mailgun_base = std::env::var("MAILGUN_API_BASE")
        .unwrap_or_else(|_| "https://api.eu.mailgun.net".to_string());
    let mailgun_domain =
        std::env::var("MAILGUN_DOMAIN").unwrap_or_else(|_| "mg.sovereignhealth.io".to_string());
    let list_address = format!("newsletter@{}", mailgun_domain);

    if mailgun_key.is_empty() {
        return Err(AppError::Validation(
            "Mailgun is not configured".to_string(),
        ));
    }

    let rows = sqlx::query(
        r#"SELECT id, email FROM newsletter_subscribers
           WHERE subscribed = true AND confirmed = true AND mailgun_synced = false"#,
    )
    .fetch_all(pool.get_ref())
    .await?;

    let client = reqwest::Client::new();
    let mut synced = 0i64;
    let mut failed = 0i64;

    for r in &rows {
        let id: Uuid = r.try_get("id").unwrap_or_default();
        let email: String = r.try_get("email").unwrap_or_default();

        let resp = client
            .post(format!(
                "{}/v3/lists/{}/members",
                mailgun_base, list_address
            ))
            .basic_auth("api", Some(&mailgun_key))
            .form(&[
                ("address", email.as_str()),
                ("subscribed", "true"),
                ("upsert", "true"),
            ])
            .send()
            .await;

        match resp {
            Ok(r) if r.status().is_success() => {
                let _ = sqlx::query(
                    "UPDATE newsletter_subscribers SET mailgun_synced = true, updated_at = NOW() WHERE id = $1",
                )
                .bind(id)
                .execute(pool.get_ref())
                .await;
                synced += 1;
            }
            _ => {
                failed += 1;
            }
        }
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "message": format!("Synced {} subscribers, {} failed", synced, failed),
            "synced": synced,
            "failed": failed,
        },
        "error": null
    })))
}
