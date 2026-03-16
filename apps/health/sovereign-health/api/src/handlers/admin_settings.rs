// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;

use crate::{error::AppError, middleware::auth::AdminUser};

// ---------------------------------------------------------------------------
// GET /admin/settings
// ---------------------------------------------------------------------------

pub async fn list_settings(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    let rows = sqlx::query(
        r#"SELECT key, value, description, category, updated_at, updated_by
           FROM app_settings
           ORDER BY category, key"#,
    )
    .fetch_all(pool.get_ref())
    .await?;

    let mut categories: std::collections::BTreeMap<String, Vec<serde_json::Value>> =
        std::collections::BTreeMap::new();

    for row in &rows {
        let category: String = row
            .try_get("category")
            .unwrap_or_else(|_| "general".to_string());
        let entry = json!({
            "key": row.try_get::<String, _>("key").unwrap_or_default(),
            "value": row.try_get::<serde_json::Value, _>("value").unwrap_or(json!(null)),
            "description": row.try_get::<Option<String>, _>("description").ok().flatten(),
            "category": &category,
            "updated_at": row.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at")
                .ok().flatten().map(|d| d.to_rfc3339()),
            "updated_by": row.try_get::<Option<uuid::Uuid>, _>("updated_by").ok().flatten(),
        });
        categories.entry(category).or_default().push(entry);
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": categories,
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// PUT /admin/settings/:key
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct UpdateSettingBody {
    pub value: serde_json::Value,
}

pub async fn update_setting(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    path: web::Path<String>,
    body: web::Json<UpdateSettingBody>,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    let key = path.into_inner();

    // Verify setting exists
    let existing = sqlx::query("SELECT key, value FROM app_settings WHERE key = $1")
        .bind(&key)
        .fetch_optional(pool.get_ref())
        .await?;

    let existing =
        existing.ok_or_else(|| AppError::Validation(format!("Unknown setting: {}", key)))?;

    // Type-check: ensure new value matches existing value type
    let old_value: serde_json::Value = existing.try_get("value").unwrap_or(json!(null));

    if !types_compatible(&old_value, &body.value) {
        return Err(AppError::Validation(format!(
            "Type mismatch: expected {}, got {}",
            json_type_name(&old_value),
            json_type_name(&body.value)
        )));
    }

    sqlx::query(
        r#"UPDATE app_settings
           SET value = $1, updated_at = NOW(), updated_by = $2
           WHERE key = $3"#,
    )
    .bind(&body.value)
    .bind(admin.user_id)
    .bind(&key)
    .execute(pool.get_ref())
    .await?;

    tracing::info!(
        admin_id = %admin.user_id,
        setting_key = %key,
        old_value = %old_value,
        new_value = %body.value,
        "Admin setting updated"
    );

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "key": key,
            "value": body.value,
            "updated_by": admin.user_id,
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /admin/debug-whitelist - diagnostic endpoint for IP whitelist issues
// ---------------------------------------------------------------------------

pub async fn debug_whitelist(
    req: actix_web::HttpRequest,
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    let cf_ip = req
        .headers()
        .get("CF-Connecting-IP")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    let xff = req
        .headers()
        .get("X-Forwarded-For")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    let x_real = req
        .headers()
        .get("X-Real-IP")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    let peer = req
        .connection_info()
        .realip_remote_addr()
        .unwrap_or("unknown")
        .to_string();

    let resolved = cf_ip.as_deref().map(|s| s.trim()).unwrap_or(&peer);
    let normalized = normalize_ip(resolved);

    let admin_wl = get_setting(pool.get_ref(), "admin_whitelist_ips", json!([])).await;
    let reg_wl = get_setting(pool.get_ref(), "registration_whitelist_ips", json!([])).await;
    let pay_wl = get_setting(pool.get_ref(), "payment_whitelist_ips", json!([])).await;
    let reg_enabled = get_setting_bool(pool.get_ref(), "registration_enabled", false).await;
    let pay_enabled = get_setting_bool(pool.get_ref(), "payment_enabled", false).await;

    let admin_match = ip_matches_whitelist(&normalized, &admin_wl);
    let reg_match = ip_matches_whitelist(&normalized, &reg_wl);
    let pay_match = ip_matches_whitelist(&normalized, &pay_wl);

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "ip_detection": {
                "cf_connecting_ip": cf_ip,
                "x_forwarded_for": xff,
                "x_real_ip": x_real,
                "peer_addr": peer,
                "resolved": resolved,
                "normalized": normalized,
            },
            "settings": {
                "registration_enabled": reg_enabled,
                "payment_enabled": pay_enabled,
                "admin_whitelist_ips": admin_wl,
                "registration_whitelist_ips": reg_wl,
                "payment_whitelist_ips": pay_wl,
            },
            "whitelist_match": {
                "admin": admin_match,
                "registration": reg_match,
                "payment": pay_match,
            },
            "effective_access": {
                "registration": reg_enabled || admin_match || reg_match,
                "payment": pay_enabled || admin_match || pay_match,
            },
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// Utility: read a setting from the DB with fallback
// ---------------------------------------------------------------------------

pub async fn get_setting(
    pool: &PgPool,
    key: &str,
    default: serde_json::Value,
) -> serde_json::Value {
    use sqlx::Row;
    let row = sqlx::query("SELECT value FROM app_settings WHERE key = $1")
        .bind(key)
        .fetch_optional(pool)
        .await;
    match row {
        Ok(Some(r)) => r
            .try_get::<serde_json::Value, _>("value")
            .unwrap_or(default),
        _ => default,
    }
}

pub async fn get_setting_bool(pool: &PgPool, key: &str, default: bool) -> bool {
    let val = get_setting(pool, key, json!(default)).await;
    val.as_bool().unwrap_or(default)
}

pub async fn get_setting_string(pool: &PgPool, key: &str, default: &str) -> String {
    let val = get_setting(pool, key, json!(default)).await;
    val.as_str().unwrap_or(default).to_string()
}

pub async fn get_setting_i64(pool: &PgPool, key: &str, default: i64) -> i64 {
    let val = get_setting(pool, key, json!(default)).await;
    val.as_i64().unwrap_or(default)
}

/// Normalize an IP address for comparison:
/// - Strip IPv6-mapped IPv4 prefix (`::ffff:`)
/// - Strip port suffix (e.g., `1.2.3.4:8080` → `1.2.3.4`)
/// - Trim whitespace
pub fn normalize_ip(ip: &str) -> String {
    let s = ip.strip_prefix("::ffff:").unwrap_or(ip).trim();
    // Strip port from IPv4 addresses (e.g., "1.2.3.4:8080" → "1.2.3.4")
    // Only strip if it looks like IPv4:port (contains exactly one colon and dots)
    if s.contains('.') && s.matches(':').count() == 1 {
        if let Some(idx) = s.rfind(':') {
            return s[..idx].to_string();
        }
    }
    s.to_string()
}

/// Check if an IP matches any entry in a JSONB whitelist value.
/// Handles: proper JSONB arrays, double-encoded JSON strings, trimming, IPv6-mapped IPv4.
pub fn ip_matches_whitelist(ip: &str, whitelist_val: &serde_json::Value) -> bool {
    let clean_ip = normalize_ip(ip);

    // Try as JSONB array first, then as double-encoded JSON string
    let entries: Vec<String> = if let Some(arr) = whitelist_val.as_array() {
        arr.iter()
            .filter_map(|v| v.as_str().map(|s| s.trim().to_string()))
            .collect()
    } else if let Some(s) = whitelist_val.as_str() {
        // Double-encoded: the JSONB value is a string containing a JSON array
        serde_json::from_str::<Vec<String>>(s)
            .unwrap_or_default()
            .into_iter()
            .map(|ip| ip.trim().to_string())
            .collect()
    } else {
        return false;
    };

    entries.iter().any(|stored| {
        !stored.is_empty() && (stored == &clean_ip || clean_ip.starts_with(stored.as_str()))
    })
}

/// Check if an IP is in the unified admin whitelist (`admin_whitelist_ips`).
/// IPs in this list bypass ALL feature gates (registration, payments, etc.).
pub async fn is_ip_admin_whitelisted(pool: &PgPool, ip: &str) -> bool {
    let whitelist_val = get_setting(pool, "admin_whitelist_ips", json!([])).await;
    let result = ip_matches_whitelist(ip, &whitelist_val);
    if !result {
        tracing::debug!(
            ip = %ip,
            normalized_ip = %normalize_ip(ip),
            whitelist = %whitelist_val,
            "IP not in admin whitelist"
        );
    }
    result
}

/// Check if an IP is in a specific feature whitelist (e.g., `registration_whitelist_ips`).
pub async fn is_ip_in_feature_whitelist(pool: &PgPool, ip: &str, key: &str) -> bool {
    let whitelist_val = get_setting(pool, key, json!([])).await;
    ip_matches_whitelist(ip, &whitelist_val)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn types_compatible(old: &serde_json::Value, new: &serde_json::Value) -> bool {
    use serde_json::Value::*;
    matches!(
        (old, new),
        (Bool(_), Bool(_))
            | (Number(_), Number(_))
            | (String(_), String(_))
            | (Array(_), Array(_))
            | (Object(_), Object(_))
            | (Null, _)
    )
}

fn json_type_name(v: &serde_json::Value) -> &'static str {
    match v {
        serde_json::Value::Null => "null",
        serde_json::Value::Bool(_) => "boolean",
        serde_json::Value::Number(_) => "number",
        serde_json::Value::String(_) => "string",
        serde_json::Value::Array(_) => "array",
        serde_json::Value::Object(_) => "object",
    }
}
