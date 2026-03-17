// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpRequest, HttpResponse};
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;

use brickos_email::EmailProvider;

use crate::error::AppError;

#[derive(Deserialize)]
pub struct EarlyAccessRequest {
    pub email: String,
}

const LOG_PATHS: &[&str] = &[
    "/app/data/early-access.log",
    "/data/early-access.log",
    "early-access.log",
];

fn log_file_path() -> Option<&'static str> {
    LOG_PATHS
        .iter()
        .find(|path| {
            std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(path)
                .is_ok()
        })
        .copied()
}

/// POST /early-access
pub async fn submit(
    _req: HttpRequest,
    body: web::Json<EarlyAccessRequest>,
    email_provider: web::Data<Arc<dyn EmailProvider>>,
) -> Result<HttpResponse, AppError> {
    let email = body.email.trim().to_lowercase();

    if !email.contains('@') || !email.contains('.') || email.len() < 5 {
        return Ok(HttpResponse::BadRequest().json(json!({
            "data": null,
            "error": {"code": "INVALID_EMAIL", "message": "Please enter a valid email address"}
        })));
    }

    // 1. Add to Mailgun mailing list
    let mailgun_key = std::env::var("MAILGUN_API_KEY").unwrap_or_default();
    let mailgun_base = std::env::var("MAILGUN_API_BASE")
        .unwrap_or_else(|_| "https://api.eu.mailgun.net".to_string());
    let mailgun_domain =
        std::env::var("MAILGUN_DOMAIN").unwrap_or_else(|_| "sovereignhealth.io".to_string());
    let list_address = format!("early-access@{}", mailgun_domain);

    if !mailgun_key.is_empty() {
        let client = reqwest::Client::new();
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
                tracing::info!(email = %email, "Early access signup added to Mailgun list");
            }
            Ok(r) => {
                let body = r.text().await.unwrap_or_default();
                tracing::warn!(email = %email, "Mailgun list add failed: {}", body);
            }
            Err(e) => {
                tracing::warn!(email = %email, "Mailgun list request failed: {}", e);
            }
        }

        // 2. Send welcome email (non-blocking, don't fail signup)
        let provider = email_provider.get_ref().clone();
        let email_clone = email.clone();
        tokio::spawn(async move {
            let tmpl = crate::templates::emails::early_access_welcome();
            let vars = std::collections::HashMap::new();
            let (subject, html, text) = crate::templates::emails::render_template(&tmpl, &vars);
            if let Err(e) = provider.send(&email_clone, &subject, &html, &text).await {
                tracing::warn!("Early access welcome email failed: {e}");
            }
        });
    } else {
        tracing::info!(email = %email, "Early access signup (Mailgun not configured)");
    }

    // 3. File backup - always log regardless of Mailgun result
    let timestamp = chrono::Utc::now().to_rfc3339();
    let log_line = format!("{} | {}\n", timestamp, email);
    if let Some(path) = log_file_path() {
        if let Ok(mut file) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
        {
            use std::io::Write;
            let _ = file.write_all(log_line.as_bytes());
        }
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": {"message": "success"},
        "error": null
    })))
}

/// GET /admin/early-access (admin only)
pub async fn list_early_access(request: HttpRequest) -> Result<HttpResponse, AppError> {
    let token = request
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));

    if token.is_none() {
        return Ok(HttpResponse::Unauthorized().json(json!({
            "data": null,
            "error": {"code": "UNAUTHORIZED", "message": "Authentication required"}
        })));
    }

    let mut entries: Vec<serde_json::Value> = Vec::new();

    for path in LOG_PATHS {
        if let Ok(content) = std::fs::read_to_string(path) {
            for line in content.lines() {
                let parts: Vec<&str> = line.splitn(2, " | ").collect();
                if parts.len() == 2 {
                    entries.push(json!({
                        "timestamp": parts[0],
                        "email": parts[1],
                    }));
                }
            }
            break;
        }
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "count": entries.len(),
            "entries": entries
        },
        "error": null
    })))
}
