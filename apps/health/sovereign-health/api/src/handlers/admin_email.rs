// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use std::collections::HashMap;
use std::sync::Arc;

use actix_web::{web, HttpResponse};
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;
use brickos_email::EmailProvider;

use crate::error::AppError;
use crate::middleware::auth::AuthenticatedUser;
use crate::services::segments::get_users_by_segments;
use crate::templates::emails;
use crate::PlatformPool;

// ---------------------------------------------------------------------------
// POST /admin/email/send
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct SendCampaignRequest {
    pub subject: String,
    pub template_name: String,
    pub template_vars: Option<serde_json::Value>,
    pub segment_filters: Option<serde_json::Value>,
    pub dry_run: Option<bool>,
}

pub async fn send_campaign(
    platform_pool: web::Data<PlatformPool>,
    auth: AuthenticatedUser,
    config: web::Data<crate::config::Config>,
    email_provider: web::Data<Arc<dyn EmailProvider>>,
    body: web::Json<SendCampaignRequest>,
) -> Result<HttpResponse, AppError> {
    // Admin only
    if auth.role != "admin" {
        return Ok(HttpResponse::Forbidden().json(json!({
            "data": null,
            "error": { "code": "FORBIDDEN", "message": "Admin access required" }
        })));
    }

    // Rate limit: 1 campaign per hour
    let recent: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM email_campaigns WHERE sent_by = $1 AND created_at > now() - interval '1 hour' AND status != 'draft')",
    )
    .bind(auth.user_id)
    .fetch_one(&platform_pool.0)
    .await
    .unwrap_or(false);

    if recent {
        return Ok(HttpResponse::TooManyRequests().json(json!({
            "data": null,
            "error": { "code": "RATE_LIMITED", "message": "Maximum 1 campaign per hour" }
        })));
    }

    let filters = body.segment_filters.clone().unwrap_or(json!({}));
    let dry_run = body.dry_run.unwrap_or(false);

    // Find matching users
    let recipients = get_users_by_segments(&platform_pool.0, &filters)
        .await
        .map_err(|e| {
            tracing::error!("Segment query failed: {e}");
            AppError::Internal
        })?;

    if dry_run {
        return Ok(HttpResponse::Ok().json(json!({
            "data": {
                "dry_run": true,
                "recipient_count": recipients.len(),
                "segment_filters": filters
            },
            "error": null
        })));
    }

    // Create campaign record
    let campaign_id: uuid::Uuid = sqlx::query_scalar(
        r#"INSERT INTO email_campaigns (subject, template_name, segment_filters, recipient_count, status, sent_by, sent_at)
        VALUES ($1, $2, $3, $4, 'sending', $5, $6) RETURNING id"#,
    )
    .bind(&body.subject)
    .bind(&body.template_name)
    .bind(&filters)
    .bind(recipients.len() as i32)
    .bind(auth.user_id)
    .bind(Utc::now())
    .fetch_one(&platform_pool.0)
    .await
    .map_err(|e| {
        tracing::error!("Failed to create campaign: {e}");
        AppError::Internal
    })?;

    // Render template
    let template = match body.template_name.as_str() {
        "newsletter" => emails::newsletter(),
        "welcome" => emails::welcome(),
        "tier_change" => emails::tier_change(),
        _ => {
            return Ok(HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "INVALID_TEMPLATE", "message": "Unknown template name" }
            })));
        }
    };

    let frontend_url = config.frontend_url.clone();

    let mut vars = HashMap::new();
    vars.insert("subject", body.subject.clone());
    vars.insert("frontend_url", frontend_url);

    // Merge template_vars
    if let Some(ref tv) = body.template_vars {
        if let Some(obj) = tv.as_object() {
            for (k, v) in obj {
                if let Some(s) = v.as_str() {
                    vars.insert(k.as_str(), s.to_string());
                }
            }
        }
    }

    // Send emails with per-user unsubscribe URLs
    let recipient_emails: Vec<String> = recipients.iter().map(|(_, email)| email.clone()).collect();
    let mut sent_count = 0;
    let mut fail_count = 0;
    let api_base = config.api_base_url.clone();

    for (user_id, email) in &recipients {
        let mut render_vars: HashMap<&str, String> =
            vars.iter().map(|(k, v)| (*k, v.clone())).collect();
        render_vars.insert(
            "unsubscribe_url",
            crate::handlers::auth::unsubscribe_url(*user_id, &config.jwt_secret, &api_base),
        );
        let (subject, html, text) = emails::render_template(&template, &render_vars);
        let result = email_provider.send(email, &subject, &html, &text).await;

        let status = if result.is_ok() {
            sent_count += 1;
            "sent"
        } else {
            fail_count += 1;
            "failed"
        };

        let error_msg = result.err().map(|e| e.to_string());

        let _ = sqlx::query(
            "INSERT INTO email_sends (campaign_id, user_id, email, template, status, error_msg) VALUES ($1, $2, $3, $4, $5, $6)",
        )
        .bind(campaign_id)
        .bind(user_id)
        .bind(email)
        .bind(&body.template_name)
        .bind(status)
        .bind(error_msg)
        .execute(&platform_pool.0)
        .await;
    }

    // Update campaign status
    let final_status = if fail_count == 0 { "sent" } else { "failed" };
    let _ = sqlx::query("UPDATE email_campaigns SET status = $1, updated_at = now() WHERE id = $2")
        .bind(final_status)
        .bind(campaign_id)
        .execute(&platform_pool.0)
        .await;

    tracing::info!(
        campaign_id = %campaign_id,
        sent = sent_count,
        failed = fail_count,
        "Campaign complete"
    );

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "campaign_id": campaign_id,
            "sent": sent_count,
            "failed": fail_count,
            "total_recipients": recipient_emails.len()
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /admin/email/stats (Task 8)
// ---------------------------------------------------------------------------

pub async fn email_stats(
    platform_pool: web::Data<PlatformPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    if auth.role != "admin" {
        return Ok(HttpResponse::Forbidden().json(json!({
            "data": null,
            "error": { "code": "FORBIDDEN", "message": "Admin access required" }
        })));
    }

    use sqlx::Row;

    // Campaign stats
    let campaigns_row = sqlx::query(
        r#"SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'sent') as sent,
            COUNT(*) FILTER (WHERE status = 'failed') as failed,
            COALESCE(SUM(recipient_count), 0) as total_recipients
        FROM email_campaigns"#,
    )
    .fetch_one(&platform_pool.0)
    .await
    .map_err(|_| AppError::Internal)?;

    // Send stats (last 30 days)
    let sends_row = sqlx::query(
        r#"SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'sent') as sent,
            COUNT(*) FILTER (WHERE status = 'failed') as failed,
            COUNT(*) FILTER (WHERE status = 'bounced') as bounced
        FROM email_sends
        WHERE created_at > now() - interval '30 days'"#,
    )
    .fetch_one(&platform_pool.0)
    .await
    .map_err(|_| AppError::Internal)?;

    // Recent campaigns
    let recent = sqlx::query(
        r#"SELECT id, subject, template_name, recipient_count, status, sent_at, created_at
        FROM email_campaigns
        ORDER BY created_at DESC
        LIMIT 10"#,
    )
    .fetch_all(&platform_pool.0)
    .await
    .map_err(|_| AppError::Internal)?;

    let recent_campaigns: Vec<serde_json::Value> = recent
        .iter()
        .map(|r| {
            json!({
                "id": r.try_get::<uuid::Uuid, _>("id").ok(),
                "subject": r.try_get::<String, _>("subject").unwrap_or_default(),
                "template_name": r.try_get::<String, _>("template_name").unwrap_or_default(),
                "recipient_count": r.try_get::<i32, _>("recipient_count").unwrap_or(0),
                "status": r.try_get::<String, _>("status").unwrap_or_default(),
                "sent_at": r.try_get::<Option<chrono::DateTime<Utc>>, _>("sent_at").ok().flatten(),
                "created_at": r.try_get::<chrono::DateTime<Utc>, _>("created_at").ok(),
            })
        })
        .collect();

    // Consent stats
    let consent_row = sqlx::query(
        r#"SELECT
            COUNT(*) as total_users,
            COUNT(*) FILTER (WHERE consent_newsletter = true) as newsletter,
            COUNT(*) FILTER (WHERE consent_partner_offers = true) as partner_offers,
            COUNT(*) FILTER (WHERE mailgun_synced = true) as mailgun_synced
        FROM user_profile"#,
    )
    .fetch_one(&platform_pool.0)
    .await
    .map_err(|_| AppError::Internal)?;

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "campaigns": {
                "total": campaigns_row.try_get::<i64, _>("total").unwrap_or(0),
                "sent": campaigns_row.try_get::<i64, _>("sent").unwrap_or(0),
                "failed": campaigns_row.try_get::<i64, _>("failed").unwrap_or(0),
                "total_recipients": campaigns_row.try_get::<i64, _>("total_recipients").unwrap_or(0),
            },
            "sends_30d": {
                "total": sends_row.try_get::<i64, _>("total").unwrap_or(0),
                "sent": sends_row.try_get::<i64, _>("sent").unwrap_or(0),
                "failed": sends_row.try_get::<i64, _>("failed").unwrap_or(0),
                "bounced": sends_row.try_get::<i64, _>("bounced").unwrap_or(0),
            },
            "consent": {
                "total_users": consent_row.try_get::<i64, _>("total_users").unwrap_or(0),
                "newsletter": consent_row.try_get::<i64, _>("newsletter").unwrap_or(0),
                "partner_offers": consent_row.try_get::<i64, _>("partner_offers").unwrap_or(0),
                "mailgun_synced": consent_row.try_get::<i64, _>("mailgun_synced").unwrap_or(0),
            },
            "recent_campaigns": recent_campaigns,
        },
        "error": null
    })))
}
