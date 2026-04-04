// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpRequest, HttpResponse};
use serde::Deserialize;
use serde_json::json;
use sha2::{Digest, Sha256};
use std::sync::Arc;

use brickos_email::EmailProvider;

use crate::error::AppError;
use crate::handlers::admin_settings::get_setting_string;

#[derive(Deserialize)]
pub struct ContactRequest {
    pub name: String,
    pub email: String,
    pub subject: String,
    pub message: String,
}

const VALID_SUBJECTS: &[&str] = &[
    "general",
    "support",
    "partnership",
    "bug",
    "feature",
    "security",
    "billing",
];

fn hash_ip(ip: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(ip.as_bytes());
    hasher.update(b"sovereign-contact-salt");
    hex::encode(hasher.finalize())
}

fn extract_ip(req: &HttpRequest) -> String {
    req.headers()
        .get("X-Forwarded-For")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.split(',').next())
        .map(|s| s.trim().to_string())
        .or_else(|| {
            req.headers()
                .get("X-Real-IP")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string())
        })
        .unwrap_or_else(|| {
            req.peer_addr()
                .map(|a| a.ip().to_string())
                .unwrap_or_else(|| "unknown".to_string())
        })
}

/// POST /api/contact
pub async fn submit(
    req: HttpRequest,
    body: web::Json<ContactRequest>,
    pool: web::Data<sqlx::PgPool>,
    email_provider: web::Data<Arc<dyn EmailProvider>>,
    enc: web::Data<crate::services::encryption::Encryptor>,
    notifier: web::Data<crate::services::notify::Notifier>,
) -> Result<HttpResponse, AppError> {
    let name = body.name.trim().to_string();
    let email = body.email.trim().to_lowercase();
    let subject = body.subject.trim().to_lowercase();
    let message = body.message.trim().to_string();

    // Validate fields
    if name.is_empty() || name.len() > 200 {
        return Err(AppError::Validation(
            "Name is required (max 200 characters)".to_string(),
        ));
    }
    if !email.contains('@') || !email.contains('.') || email.len() < 5 || email.len() > 320 {
        return Err(AppError::Validation(
            "Please enter a valid email address".to_string(),
        ));
    }
    if !VALID_SUBJECTS.contains(&subject.as_str()) {
        return Err(AppError::Validation("Invalid subject category".to_string()));
    }
    if message.is_empty() || message.len() > 5000 {
        return Err(AppError::Validation(
            "Message is required (max 5000 characters)".to_string(),
        ));
    }

    // Rate limit: 3 submissions per IP per hour
    let ip = extract_ip(&req);
    let ip_hash = hash_ip(&ip);
    let one_hour_ago = chrono::Utc::now() - chrono::Duration::hours(1);

    let recent_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM contact_submissions WHERE ip_hash = $1 AND created_at > $2",
    )
    .bind(&ip_hash)
    .bind(one_hour_ago)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    if recent_count >= 3 {
        return Ok(HttpResponse::TooManyRequests().json(json!({
            "data": null,
            "error": {"code": "RATE_LIMIT", "message": "Too many submissions. Please try again later."}
        })));
    }

    // Encrypt PII before storing (GDPR Art. 32 — security of processing)
    let encrypted_name = enc.encrypt(&name);
    let encrypted_email = enc.encrypt(&email);

    // Store in database with encrypted name/email
    sqlx::query(
        "INSERT INTO contact_submissions (name, email, subject, message, ip_hash) VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(&encrypted_name)
    .bind(&encrypted_email)
    .bind(&subject)
    .bind(&message)
    .bind(&ip_hash)
    .execute(pool.get_ref())
    .await
    .map_err(|e| {
        tracing::error!("Failed to store contact submission: {e}");
        AppError::Internal
    })?;

    // Resolve contact form recipient: app_settings → env var → default
    let env_fallback = std::env::var("CONTACT_FORM_RECIPIENT")
        .unwrap_or_else(|_| "sovereignhealthintelligence@proton.me".to_string());
    let admin_email =
        get_setting_string(pool.get_ref(), "contact_form_recipient", &env_fallback).await;

    // Send notification email to admin (non-blocking)
    let provider = email_provider.get_ref().clone();
    let name_clone = name.clone();
    let email_clone = email.clone();
    let subject_clone = subject.clone();
    let message_clone = message.clone();

    tokio::spawn(async move {
        let mut vars = std::collections::HashMap::new();
        vars.insert("name", name_clone.clone());
        vars.insert("email", email_clone.clone());
        vars.insert("subject", subject_clone.clone());
        vars.insert("message", message_clone.clone());

        let tmpl = crate::templates::emails::contact_notification();
        let (subj, html, text) = crate::templates::emails::render_template(&tmpl, &vars);

        // Set Reply-To to submitter's email by sending with custom from
        if let Err(e) = provider.send(&admin_email, &subj, &html, &text).await {
            tracing::warn!("Contact notification email failed: {e}");
        }
    });

    // Send confirmation to submitter (non-blocking)
    let provider2 = email_provider.get_ref().clone();
    let email_for_confirm = email.clone();
    let name_for_confirm = name.clone();

    tokio::spawn(async move {
        let mut vars = std::collections::HashMap::new();
        vars.insert("name", name_for_confirm);

        let tmpl = crate::templates::emails::contact_confirmation();
        let (subj, html, text) = crate::templates::emails::render_template(&tmpl, &vars);

        if let Err(e) = provider2
            .send(&email_for_confirm, &subj, &html, &text)
            .await
        {
            tracing::warn!("Contact confirmation email failed: {e}");
        }
    });

    tracing::info!(subject = %subject, "Contact form submission received");

    notifier.send(
        crate::services::notify::Channel::Info,
        crate::services::notify::Priority::Default,
        "Contact form submission",
        &format!("subject={subject}"),
    );

    Ok(HttpResponse::Ok().json(json!({
        "data": {"message": "Your message has been sent successfully. We'll get back to you soon."},
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Admin: list contact submissions
// ---------------------------------------------------------------------------

use crate::middleware::auth::AdminUser;
use sqlx::PgPool;

pub async fn admin_list(
    pool: web::Data<PgPool>,
    enc: web::Data<crate::services::encryption::Encryptor>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    let rows = sqlx::query(
        r#"SELECT id, name, email, subject, message, status, created_at
           FROM contact_submissions
           ORDER BY created_at DESC
           LIMIT 100"#,
    )
    .fetch_all(pool.get_ref())
    .await?;

    let entries: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            let raw_name = r.try_get::<String, _>("name").unwrap_or_default();
            let raw_email = r.try_get::<String, _>("email").unwrap_or_default();
            let raw_message = r.try_get::<String, _>("message").unwrap_or_default();
            json!({
                "id": r.try_get::<uuid::Uuid, _>("id").unwrap_or_default(),
                "name": enc.decrypt(&raw_name).unwrap_or(raw_name),
                "email": enc.decrypt(&raw_email).unwrap_or(raw_email),
                "subject": r.try_get::<String, _>("subject").unwrap_or_default(),
                "message": enc.decrypt(&raw_message).unwrap_or(raw_message),
                "status": r.try_get::<String, _>("status").unwrap_or_default(),
                "created_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                    .map(|d| d.to_rfc3339()).unwrap_or_default(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": entries,
        "error": null
    })))
}

pub async fn admin_update_status(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<uuid::Uuid>,
    body: web::Json<serde_json::Value>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let status = body
        .get("status")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AppError::Validation("status required".into()))?;

    if !["new", "read", "replied", "archived"].contains(&status) {
        return Err(AppError::Validation("Invalid status".into()));
    }

    sqlx::query("UPDATE contact_submissions SET status = $1, processed_at = CASE WHEN $1 != 'new' THEN NOW() ELSE processed_at END WHERE id = $2")
        .bind(status)
        .bind(id)
        .execute(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "updated": true },
        "error": null
    })))
}
