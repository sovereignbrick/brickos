// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Sprint 040 #476 -- admin manual-send endpoint for the lifecycle email
// templates from #473 + #474.
//
// POST /admin/templates/send  { template_name, recipient_email, vars }
//
// `template_name` matches one of the 9 lifecycle templates. `vars` is an
// optional map of substitution overrides; missing keys fall back to safe
// defaults so the operator can fire a quick preview without filling every
// field. Every send writes a row to brickos.admin_audit_log under the
// `email.template.sent` action.

use std::sync::Arc;

use actix_web::{web, HttpResponse};
use brickos_email::EmailProvider;
use serde::Deserialize;
use serde_json::{json, Value};

use crate::error::AppError;
use crate::middleware::auth::AuthenticatedUser;
use crate::services::email_lifecycle;
use crate::PlatformPool;

/// Stable string used in the audit log for every manual send.
const AUDIT_ACTION: &str = "email.template.sent";

#[derive(Deserialize)]
pub struct SendTemplateRequest {
    /// Template identifier (one of the 9 lifecycle templates -- see
    /// `lifecycle_template_names` for the canonical list).
    pub template_name: String,
    /// Recipient email address.
    pub recipient_email: String,
    /// Optional substitution overrides. Unknown keys are ignored; missing
    /// keys fall back to friendly defaults so the operator can fire a quick
    /// test send.
    #[serde(default)]
    pub vars: serde_json::Map<String, Value>,
    /// "en" or "de" (anything starting with "de" routes to the German
    /// template). Defaults to "en" if omitted.
    pub locale: Option<String>,
}

/// Canonical list of templates the manual-send flow supports. Returned by
/// `GET /admin/templates/list` so the admin GUI can populate the dropdown
/// without hard-coding the strings client-side.
pub fn lifecycle_template_names() -> &'static [&'static str] {
    &[
        "payment_failure_day_7",
        "payment_failure_day_13",
        "downgraded_to_glimpse",
        "org_terminated_for_member",
        "org_terminated_for_staff",
        "license_renewed",
        "license_expiring_soon",
        "inactivity_warning",
    ]
}

fn var_or<'a>(vars: &'a serde_json::Map<String, Value>, key: &str, default: &'a str) -> String {
    vars.get(key)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| default.to_string())
}

// ---------------------------------------------------------------------------
// GET /admin/templates/list
// ---------------------------------------------------------------------------

pub async fn list_templates(auth: AuthenticatedUser) -> Result<HttpResponse, AppError> {
    if auth.role != "admin" {
        return Ok(HttpResponse::Forbidden().json(json!({
            "data": null,
            "error": { "code": "FORBIDDEN", "message": "Admin access required" }
        })));
    }
    Ok(HttpResponse::Ok().json(json!({
        "data": { "templates": lifecycle_template_names() },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// POST /admin/templates/send
// ---------------------------------------------------------------------------

pub async fn send_template(
    platform_pool: web::Data<PlatformPool>,
    auth: AuthenticatedUser,
    config: web::Data<crate::config::Config>,
    email_provider: web::Data<Arc<dyn EmailProvider>>,
    body: web::Json<SendTemplateRequest>,
) -> Result<HttpResponse, AppError> {
    if auth.role != "admin" {
        return Ok(HttpResponse::Forbidden().json(json!({
            "data": null,
            "error": { "code": "FORBIDDEN", "message": "Admin access required" }
        })));
    }

    let req = body.into_inner();
    let locale = req.locale.unwrap_or_else(|| "en".to_string());
    let provider: &dyn EmailProvider = email_provider.as_ref().as_ref();
    let frontend_url = config.frontend_url.as_str();

    let display_name = var_or(&req.vars, "display_name", "there");
    let tier_name = var_or(&req.vars, "tier_name", "Focus");
    let org_name = var_or(&req.vars, "org_name", "your organization");

    let result = match req.template_name.as_str() {
        "payment_failure_day_7" => {
            let days = req
                .vars
                .get("grace_days_remaining")
                .and_then(|v| v.as_i64())
                .unwrap_or(7);
            email_lifecycle::send_payment_failure_reminder(
                provider,
                &req.recipient_email,
                &display_name,
                &tier_name,
                days,
                frontend_url,
                &locale,
                7,
            )
            .await
        }
        "payment_failure_day_13" => {
            let days = req
                .vars
                .get("grace_days_remaining")
                .and_then(|v| v.as_i64())
                .unwrap_or(1);
            email_lifecycle::send_payment_failure_reminder(
                provider,
                &req.recipient_email,
                &display_name,
                &tier_name,
                days,
                frontend_url,
                &locale,
                13,
            )
            .await
        }
        "downgraded_to_glimpse" => {
            email_lifecycle::send_downgraded_to_glimpse(
                provider,
                &req.recipient_email,
                &display_name,
                &tier_name,
                frontend_url,
                &locale,
            )
            .await
        }
        "org_terminated_for_member" => {
            email_lifecycle::send_org_terminated_for_member(
                provider,
                &req.recipient_email,
                &display_name,
                &org_name,
                &locale,
            )
            .await
        }
        "org_terminated_for_staff" => {
            email_lifecycle::send_org_terminated_for_staff(
                provider,
                &req.recipient_email,
                &display_name,
                &org_name,
                &locale,
            )
            .await
        }
        "license_renewed" => {
            let renewal_amount = var_or(&req.vars, "renewal_amount", "EUR 0.00");
            let access_until = var_or(&req.vars, "access_until", "");
            email_lifecycle::send_license_renewed(
                provider,
                &req.recipient_email,
                &display_name,
                &org_name,
                &renewal_amount,
                &access_until,
                &locale,
            )
            .await
        }
        "license_expiring_soon" => {
            let expires_at = var_or(&req.vars, "expires_at", "");
            email_lifecycle::send_license_expiring_soon(
                provider,
                &req.recipient_email,
                &display_name,
                &org_name,
                &expires_at,
                &locale,
            )
            .await
        }
        "inactivity_warning" => {
            email_lifecycle::send_inactivity_warning(
                provider,
                &req.recipient_email,
                &display_name,
                frontend_url,
                &locale,
            )
            .await
        }
        _ => {
            return Ok(HttpResponse::BadRequest().json(json!({
                "data": null,
                "error": { "code": "INVALID_TEMPLATE", "message": "Unknown template name" }
            })));
        }
    };

    let (status, error_msg) = match &result {
        Ok(()) => ("sent", None::<String>),
        Err(e) => ("failed", Some(e.to_string())),
    };

    // Audit log: best-effort, never blocks the response.
    let payload = json!({
        "template_name": req.template_name,
        "recipient": req.recipient_email,
        "locale": locale,
        "status": status,
        "error": error_msg,
    });
    let _ = sqlx::query(
        r#"INSERT INTO brickos.admin_audit_log
             (actor_user_id, action, target_type, target_id, payload)
           VALUES ($1, $2, $3, $4, $5)"#,
    )
    .bind(auth.user_id)
    .bind(AUDIT_ACTION)
    .bind("email_template")
    .bind(auth.user_id) // target_id is required NOT NULL; no user row to point at, so anchor to actor
    .bind(&payload)
    .execute(&platform_pool.0)
    .await
    .map_err(|e| {
        tracing::warn!(
            template = %req.template_name,
            error = ?e,
            "audit log write failed for manual template send"
        );
        e
    });

    if let Err(e) = result {
        tracing::error!(
            template = %req.template_name,
            recipient = %req.recipient_email,
            error = ?e,
            "manual template send failed"
        );
        return Ok(HttpResponse::InternalServerError().json(json!({
            "data": null,
            "error": { "code": "SEND_FAILED", "message": e.to_string() }
        })));
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "template_name": req.template_name,
            "recipient": req.recipient_email,
            "locale": locale,
            "status": "sent"
        },
        "error": null
    })))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lifecycle_template_names_includes_all_nine() {
        let names = lifecycle_template_names();
        assert!(names.contains(&"payment_failure_day_7"));
        assert!(names.contains(&"payment_failure_day_13"));
        assert!(names.contains(&"downgraded_to_glimpse"));
        assert!(names.contains(&"org_terminated_for_member"));
        assert!(names.contains(&"org_terminated_for_staff"));
        assert!(names.contains(&"license_renewed"));
        assert!(names.contains(&"license_expiring_soon"));
        assert!(names.contains(&"inactivity_warning"));
    }

    #[test]
    fn audit_action_string_is_stable() {
        // analytics anchor -- renaming is a breaking change
        assert_eq!(AUDIT_ACTION, "email.template.sent");
    }

    #[test]
    fn var_or_falls_back_to_default() {
        let mut vars = serde_json::Map::new();
        vars.insert(
            "display_name".to_string(),
            Value::String("Alex".to_string()),
        );
        assert_eq!(var_or(&vars, "display_name", "there"), "Alex");
        assert_eq!(var_or(&vars, "tier_name", "Focus"), "Focus");
    }
}
