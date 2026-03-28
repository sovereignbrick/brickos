// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;

use crate::{error::AppError, middleware::auth::AdminUser};

// ---------------------------------------------------------------------------
// GET /admin/dashboard
// ---------------------------------------------------------------------------

pub async fn dashboard(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    let total_users: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE is_deleted = false")
            .fetch_one(pool.get_ref())
            .await
            .unwrap_or(0);

    let verified_users: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM users WHERE is_deleted = false AND email_verified = true",
    )
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    let total_measurements: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM measurements WHERE is_deleted = false")
            .fetch_one(pool.get_ref())
            .await
            .unwrap_or(0);

    let active_7d: i64 = sqlx::query_scalar(
        "SELECT COUNT(DISTINCT user_id) FROM measurements WHERE is_deleted = false AND created_at > NOW() - INTERVAL '7 days'",
    )
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    let active_30d: i64 = sqlx::query_scalar(
        "SELECT COUNT(DISTINCT user_id) FROM measurements WHERE is_deleted = false AND created_at > NOW() - INTERVAL '30 days'",
    )
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    // Signups in last 7 days
    let signups_7d: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days'",
    )
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    // Tier distribution
    let tier_rows = sqlx::query(
        r#"SELECT COALESCE(lt.slug, 'glimpse') as tier, COUNT(*) as count
           FROM users u
           LEFT JOIN user_licenses ul ON ul.user_id = u.id
           LEFT JOIN license_tiers lt ON lt.id = ul.tier_id
           WHERE u.is_deleted = false
           GROUP BY COALESCE(lt.slug, 'glimpse')
           ORDER BY count DESC"#,
    )
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    let tiers: Vec<serde_json::Value> = tier_rows
        .iter()
        .map(|r| {
            json!({
                "tier": r.try_get::<String, _>("tier").unwrap_or_default(),
                "count": r.try_get::<i64, _>("count").unwrap_or(0),
            })
        })
        .collect();

    // Early access signups
    let early_access_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM early_access_signups")
        .fetch_one(pool.get_ref())
        .await
        .unwrap_or(0);

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "total_users": total_users,
            "verified_users": verified_users,
            "total_measurements": total_measurements,
            "active_7d": active_7d,
            "active_30d": active_30d,
            "signups_7d": signups_7d,
            "early_access_count": early_access_count,
            "tier_distribution": tiers,
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// GET /admin/users
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct UserListQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub search: Option<String>,
    pub sort: Option<String>,
    pub order: Option<String>,
}

pub async fn list_users(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    query: web::Query<UserListQuery>,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(25).clamp(1, 100);
    let offset = (page - 1) * per_page;

    // Validate sort/order to prevent SQL injection - only allow known column names
    let order_clause = {
        let sort_col = match query.sort.as_deref() {
            Some("email") => "u.email",
            Some("tier") => "tier",
            Some("created_at") | None => "u.created_at",
            _ => "u.created_at",
        };
        let direction = match query.order.as_deref() {
            Some("asc") => "ASC",
            Some("desc") | None => "DESC",
            _ => "DESC",
        };
        format!("{} {}", sort_col, direction)
    };

    let (rows, total) = if let Some(ref search) = query.search {
        let pattern = format!("%{}%", search);
        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM users WHERE is_deleted = false AND (email ILIKE $1 OR display_name ILIKE $1)",
        )
        .bind(&pattern)
        .fetch_one(pool.get_ref())
        .await
        .unwrap_or(0);

        let sql = format!(
            r#"SELECT u.id, u.email, u.display_name, u.role, u.email_verified,
                      u.created_at, u.updated_at as last_login_at,
                      COALESCE(lt.slug, 'glimpse') as tier,
                      COALESCE(ul.admin_override, false) as admin_override,
                      ul.admin_override_note, ul.admin_override_by, ul.admin_override_at,
                      COALESCE(ul.payment_method, 'stripe') as payment_method,
                      (SELECT COUNT(*) FROM measurements m WHERE m.user_id = u.id AND m.is_deleted = false) as measurement_count
               FROM users u
               LEFT JOIN user_licenses ul ON ul.user_id = u.id
               LEFT JOIN license_tiers lt ON lt.id = ul.tier_id
               WHERE u.is_deleted = false AND (u.email ILIKE $1 OR u.display_name ILIKE $1)
               ORDER BY {}
               LIMIT $2 OFFSET $3"#,
            order_clause
        );

        let rows = sqlx::query(&sql)
            .bind(&pattern)
            .bind(per_page)
            .bind(offset)
            .fetch_all(pool.get_ref())
            .await?;

        (rows, total)
    } else {
        let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE is_deleted = false")
            .fetch_one(pool.get_ref())
            .await
            .unwrap_or(0);

        let sql = format!(
            r#"SELECT u.id, u.email, u.display_name, u.role, u.email_verified,
                      u.created_at, u.updated_at as last_login_at,
                      COALESCE(lt.slug, 'glimpse') as tier,
                      COALESCE(ul.admin_override, false) as admin_override,
                      ul.admin_override_note, ul.admin_override_by, ul.admin_override_at,
                      COALESCE(ul.payment_method, 'stripe') as payment_method,
                      (SELECT COUNT(*) FROM measurements m WHERE m.user_id = u.id AND m.is_deleted = false) as measurement_count
               FROM users u
               LEFT JOIN user_licenses ul ON ul.user_id = u.id
               LEFT JOIN license_tiers lt ON lt.id = ul.tier_id
               WHERE u.is_deleted = false
               ORDER BY {}
               LIMIT $1 OFFSET $2"#,
            order_clause
        );

        let rows = sqlx::query(&sql)
            .bind(per_page)
            .bind(offset)
            .fetch_all(pool.get_ref())
            .await?;

        (rows, total)
    };

    let users: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "id": r.try_get::<uuid::Uuid, _>("id").unwrap_or_default(),
                "email": r.try_get::<String, _>("email").unwrap_or_default(),
                "display_name": r.try_get::<Option<String>, _>("display_name").ok().flatten(),
                "role": r.try_get::<String, _>("role").unwrap_or_default(),
                "email_verified": r.try_get::<bool, _>("email_verified").unwrap_or(false),
                "tier": r.try_get::<String, _>("tier").unwrap_or_default(),
                "admin_override": r.try_get::<bool, _>("admin_override").unwrap_or(false),
                "admin_override_note": r.try_get::<Option<String>, _>("admin_override_note").ok().flatten(),
                "admin_override_by": r.try_get::<Option<uuid::Uuid>, _>("admin_override_by").ok().flatten(),
                "admin_override_at": r.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("admin_override_at")
                    .ok().flatten().map(|d| d.to_rfc3339()),
                "payment_method": r.try_get::<String, _>("payment_method").unwrap_or_else(|_| "stripe".to_string()),
                "measurement_count": r.try_get::<i64, _>("measurement_count").unwrap_or(0),
                "created_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                    .unwrap_or_else(|_| chrono::Utc::now()).to_rfc3339(),
                "last_login_at": r.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("last_login_at")
                    .ok().flatten().map(|d| d.to_rfc3339()),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": users,
        "meta": {
            "page": page,
            "per_page": per_page,
            "total": total,
        },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// PUT /admin/users/{id}/role
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct UpdateRoleBody {
    pub role: String,
}

pub async fn update_user_role(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<uuid::Uuid>,
    body: web::Json<UpdateRoleBody>,
) -> Result<HttpResponse, AppError> {
    let user_id = path.into_inner();

    if !["user", "admin"].contains(&body.role.as_str()) {
        return Err(AppError::Validation("Invalid role".to_string()));
    }

    sqlx::query(
        "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 AND is_deleted = false",
    )
    .bind(&body.role)
    .bind(user_id)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "message": "Role updated" },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// PUT /admin/users/{id}/tier
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct UpdateTierBody {
    pub tier_slug: String,
}

pub async fn update_user_tier(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<uuid::Uuid>,
    body: web::Json<UpdateTierBody>,
) -> Result<HttpResponse, AppError> {
    let user_id = path.into_inner();

    // Find the tier
    let tier_id: Option<uuid::Uuid> =
        sqlx::query_scalar("SELECT id FROM license_tiers WHERE slug = $1")
            .bind(&body.tier_slug)
            .fetch_optional(pool.get_ref())
            .await?;

    let tier_id = tier_id.ok_or(AppError::Validation("Unknown tier".to_string()))?;

    sqlx::query(
        r#"INSERT INTO user_licenses (user_id, tier_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET tier_id = $2, updated_at = NOW()"#,
    )
    .bind(user_id)
    .bind(tier_id)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": { "message": "Tier updated" },
        "error": null
    })))
}

// ---------------------------------------------------------------------------
// PUT /admin/users/{id}/license - Apply or remove admin tier override
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct LicenseOverrideRequest {
    pub tier: Option<String>,
    pub override_active: bool,
    pub note: Option<String>,
}

pub async fn update_user_license(
    pool: web::Data<PgPool>,
    admin: AdminUser,
    path: web::Path<uuid::Uuid>,
    body: web::Json<LicenseOverrideRequest>,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    let user_id = path.into_inner();

    // Verify the target user exists
    let user_row = sqlx::query("SELECT id, email FROM users WHERE id = $1 AND is_deleted = false")
        .bind(user_id)
        .fetch_optional(pool.get_ref())
        .await?;

    let user_row = user_row.ok_or(AppError::NotFound)?;
    let user_email: String = user_row.try_get("email").unwrap_or_default();

    // Get previous tier slug
    let prev_tier: String = sqlx::query_scalar(
        r#"SELECT COALESCE(lt.slug, 'glimpse')
           FROM user_licenses ul
           JOIN license_tiers lt ON lt.id = ul.tier_id
           WHERE ul.user_id = $1"#,
    )
    .bind(user_id)
    .fetch_optional(pool.get_ref())
    .await?
    .unwrap_or_else(|| "glimpse".to_string());

    if body.override_active {
        // Require tier slug when applying an override
        let tier_slug = body.tier.as_ref().ok_or(AppError::Validation(
            "tier is required when override_active is true".to_string(),
        ))?;

        // Look up the new tier_id
        let new_tier_id: Option<uuid::Uuid> =
            sqlx::query_scalar("SELECT id FROM license_tiers WHERE slug = $1")
                .bind(tier_slug)
                .fetch_optional(pool.get_ref())
                .await?;

        let new_tier_id =
            new_tier_id.ok_or(AppError::Validation(format!("Unknown tier: {}", tier_slug)))?;

        // Upsert user_licenses with override
        sqlx::query(
            r#"INSERT INTO user_licenses (user_id, tier_id, admin_override, admin_override_by, admin_override_at, admin_override_note)
               VALUES ($1, $2, true, $3, NOW(), $4)
               ON CONFLICT (user_id) DO UPDATE SET
                tier_id = $2,
                admin_override = true,
                admin_override_by = $3,
                admin_override_at = NOW(),
                admin_override_note = $4,
                updated_at = NOW()"#,
        )
        .bind(user_id)
        .bind(new_tier_id)
        .bind(admin.user_id)
        .bind(&body.note)
        .execute(pool.get_ref())
        .await?;

        tracing::info!(
            admin_id = %admin.user_id,
            target_user = %user_id,
            previous_tier = %prev_tier,
            new_tier = %tier_slug,
            "Admin license override applied"
        );

        Ok(HttpResponse::Ok().json(json!({
            "data": {
                "user_id": user_id,
                "email": user_email,
                "previous_tier": prev_tier,
                "new_tier": tier_slug,
                "admin_override": true,
                "note": body.note,
                "changed_by": admin.user_id,
                "changed_at": chrono::Utc::now().to_rfc3339(),
            },
            "error": null
        })))
    } else {
        // Remove override - clear the override flags but keep the current tier
        sqlx::query(
            r#"UPDATE user_licenses SET
                admin_override = false,
                admin_override_by = NULL,
                admin_override_at = NULL,
                admin_override_note = NULL,
                updated_at = NOW()
               WHERE user_id = $1"#,
        )
        .bind(user_id)
        .execute(pool.get_ref())
        .await?;

        tracing::info!(
            admin_id = %admin.user_id,
            target_user = %user_id,
            "Admin license override removed"
        );

        Ok(HttpResponse::Ok().json(json!({
            "data": {
                "user_id": user_id,
                "email": user_email,
                "previous_tier": prev_tier,
                "new_tier": prev_tier,
                "admin_override": false,
                "note": null,
                "changed_by": admin.user_id,
                "changed_at": chrono::Utc::now().to_rfc3339(),
            },
            "error": null
        })))
    }
}

// ---------------------------------------------------------------------------
// POST /admin/backfill-calculated-markers
// Re-compute calculated markers for ALL historical measurement sessions
// where inputs exist but computed values are missing.
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct BackfillQuery {
    pub user_id: Option<uuid::Uuid>,
}

pub async fn backfill_calculated_markers(
    pool: web::Data<PgPool>,
    enc: web::Data<crate::services::encryption::Encryptor>,
    _admin: AdminUser,
    query: web::Query<BackfillQuery>,
) -> Result<HttpResponse, AppError> {
    use crate::services::calculated::{compute_calculated_markers, enrich_with_latest_values};
    use sqlx::Row;

    // Get target users (specific user or all)
    let user_ids: Vec<uuid::Uuid> = if let Some(uid) = query.user_id {
        vec![uid]
    } else {
        sqlx::query_scalar("SELECT DISTINCT user_id FROM measurements WHERE is_deleted = false AND is_demo = false")
            .fetch_all(pool.get_ref())
            .await?
    };

    let mut total_computed = 0i64;
    let mut users_processed = 0i64;

    for user_id in &user_ids {
        // Get distinct timestamps where at least one calculated-marker input was measured.
        // Only these sessions can produce new calculated values.
        // CALC_INPUT_SLUGS: glucose, ketones, waist_circumference, weight, hematocrit, hemoglobin, insulin, triglycerides, hdl
        let timestamps: Vec<chrono::DateTime<chrono::Utc>> = sqlx::query_scalar(
            r#"SELECT DISTINCT ms.timestamp
               FROM measurements ms
               JOIN markers m ON m.id = ms.marker_id
               WHERE ms.user_id = $1 AND ms.is_deleted = false AND ms.is_demo = false
                 AND m.marker_slug IN ('glucose','ketones','waist_circumference','weight','hematocrit','hemoglobin','insulin','triglycerides','hdl')
               ORDER BY ms.timestamp"#
        )
        .bind(user_id)
        .fetch_all(pool.get_ref())
        .await?;

        // Get user's height
        let height_cm: Option<f64> =
            sqlx::query_scalar("SELECT height_cm FROM user_profile WHERE user_id = $1")
                .bind(user_id)
                .fetch_optional(pool.get_ref())
                .await?
                .flatten()
                .map(|v: String| enc.decrypt_f64(&v));

        for ts in &timestamps {
            // Collect all marker values at this timestamp
            let rows = sqlx::query(
                r#"SELECT m.marker_slug, ms.value_canonical, ms.protocol_tag, ms.fasting_protocol
                   FROM measurements ms
                   JOIN markers m ON m.id = ms.marker_id
                   WHERE ms.user_id = $1 AND ms.timestamp = $2 AND ms.is_deleted = false"#,
            )
            .bind(user_id)
            .bind(ts)
            .fetch_all(pool.get_ref())
            .await?;

            if rows.is_empty() {
                continue;
            }

            let mut values_map = std::collections::HashMap::new();
            let mut protocol_tag = "standard".to_string();
            let mut fasting_protocol: Option<String> = None;

            // Track which slugs were DIRECTLY measured in this session
            let mut session_slugs = std::collections::HashSet::new();

            for row in &rows {
                let slug: String = row.try_get("marker_slug").unwrap_or_default();
                let enc_val: String = row.try_get("value_canonical").unwrap_or_default();
                if !enc_val.is_empty() {
                    let val = enc.decrypt_f64(&enc_val);
                    if val.is_finite() && val > 0.0 {
                        session_slugs.insert(slug.clone());
                        values_map.insert(slug, val);
                    }
                }
                let pt: Option<String> = row.try_get("protocol_tag").ok().flatten();
                if let Some(ref pt) = pt {
                    protocol_tag = pt.clone();
                }
                let fp: Option<String> = row.try_get("fasting_protocol").ok().flatten();
                if fp.is_some() {
                    fasting_protocol = fp;
                }
            }

            // Enrich with latest values from other sessions
            enrich_with_latest_values(pool.get_ref(), *user_id, &mut values_map, enc.get_ref())
                .await
                .ok();

            // Compute calculated markers
            let computed = compute_calculated_markers(
                pool.get_ref(),
                *user_id,
                &values_map,
                height_cm,
                &protocol_tag,
                fasting_protocol.as_deref(),
                *ts,
            )
            .await?;

            // Build a lookup: cm_id -> marker_slug
            let cm_slugs: std::collections::HashMap<uuid::Uuid, String> =
                sqlx::query("SELECT id, marker_slug FROM calculated_markers")
                    .fetch_all(pool.get_ref())
                    .await?
                    .iter()
                    .map(|r| {
                        (
                            r.try_get("id").unwrap_or_default(),
                            r.try_get("marker_slug").unwrap_or_default(),
                        )
                    })
                    .collect();

            // Only insert if at least one REQUIRED input was directly measured in this session
            for (cm_id, value, status) in &computed {
                let slug = cm_slugs.get(cm_id).map(|s| s.as_str()).unwrap_or("");
                let required: &[&str] = match slug {
                    "gki" | "dr_boz_ratio" => &["glucose", "ketones"],
                    "bmi" => &["weight"],
                    "whtr" => &["waist_circumference"],
                    "hct_hb_ratio" => &["hematocrit", "hemoglobin"],
                    "tg_hdl_ratio" => &["triglycerides", "hdl"],
                    "homa_ir" => &["glucose", "insulin"],
                    "tyg_index" => &["triglycerides", "glucose"],
                    _ => &[],
                };
                // Skip if none of the required inputs were in the session
                if !required.is_empty() && !required.iter().any(|s| session_slugs.contains(*s)) {
                    continue;
                }
                let result = sqlx::query(
                    r#"INSERT INTO calculated_marker_values (
                        user_id, calculated_marker_id, value, status, protocol_tag, fasting_protocol, measured_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (user_id, calculated_marker_id, measured_at) WHERE is_deleted = false
                    DO UPDATE SET value = EXCLUDED.value, status = EXCLUDED.status,
                                 protocol_tag = EXCLUDED.protocol_tag, fasting_protocol = EXCLUDED.fasting_protocol"#,
                )
                .bind(user_id)
                .bind(cm_id)
                .bind(value)
                .bind(status)
                .bind(&protocol_tag)
                .bind(&fasting_protocol)
                .bind(ts)
                .execute(pool.get_ref())
                .await;

                if result.is_ok() {
                    total_computed += 1;
                }
            }
        }
        users_processed += 1;
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "users_processed": users_processed,
            "calculated_values_upserted": total_computed,
        },
        "error": null
    })))
}
