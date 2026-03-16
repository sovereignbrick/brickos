// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use chrono::{Datelike, Utc};
use serde::Deserialize;
use serde_json::json;
use sqlx::{PgPool, Row};

use crate::{error::AppError, middleware::auth::AuthenticatedUser, services::tier};

// ── GET /license ─────────────────────────────────────────────────────────────

pub async fn get_license(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let info = tier::get_full_license_info(pool.get_ref(), auth.user_id).await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": info,
        "error": null
    })))
}

// ── GET /license/tiers ───────────────────────────────────────────────────────

pub async fn list_tiers(pool: web::Data<PgPool>) -> Result<HttpResponse, AppError> {
    let rows = sqlx::query(
        r#"SELECT slug, name, tagline, description,
            price_monthly_eur::float8 as price_monthly,
            price_annual_eur::float8 as price_annual,
            max_markers, max_history_days, max_calculated_markers,
            max_templates, max_medications,
            chat_general_monthly, chat_trends_monthly, chat_labs_monthly,
            chat_diet_monthly, chat_supplements_monthly, chat_protocols_monthly,
            chat_lab_import_monthly, chat_med_import_monthly,
            pdf_reports_monthly, max_measurements,
            csv_export, json_export, custom_thresholds, lifestyle_presets,
            protocol_comparison, body_composition, supplement_marker_impact,
            ai_dashboard_insights, cohort_comparison, mfa_totp, api_access,
            self_hosted_hybrid, team_sharing, max_team_members,
            support_level, display_order, highlight
        FROM license_tiers
        WHERE is_active = true AND slug != 'core'
        ORDER BY display_order ASC"#,
    )
    .fetch_all(pool.get_ref())
    .await?;

    let tiers: Vec<serde_json::Value> = rows.iter().map(|r| {
        json!({
            "slug": r.try_get::<String, _>("slug").unwrap_or_default(),
            "name": r.try_get::<String, _>("name").unwrap_or_default(),
            "tagline": r.try_get::<Option<String>, _>("tagline").ok().flatten(),
            "description": r.try_get::<Option<String>, _>("description").ok().flatten(),
            "price_monthly_eur": r.try_get::<Option<f64>, _>("price_monthly").ok().flatten(),
            "price_annual_eur": r.try_get::<Option<f64>, _>("price_annual").ok().flatten(),
            "max_markers": r.try_get::<Option<i32>, _>("max_markers").ok().flatten(),
            "max_history_days": r.try_get::<Option<i32>, _>("max_history_days").ok().flatten(),
            "max_calculated_markers": r.try_get::<Option<i32>, _>("max_calculated_markers").ok().flatten(),
            "max_templates": r.try_get::<Option<i32>, _>("max_templates").ok().flatten(),
            "max_medications": r.try_get::<Option<i32>, _>("max_medications").ok().flatten(),
            "chat_general_monthly": r.try_get::<Option<i32>, _>("chat_general_monthly").ok().flatten(),
            "chat_trends_monthly": r.try_get::<Option<i32>, _>("chat_trends_monthly").ok().flatten(),
            "chat_labs_monthly": r.try_get::<Option<i32>, _>("chat_labs_monthly").ok().flatten(),
            "chat_diet_monthly": r.try_get::<Option<i32>, _>("chat_diet_monthly").ok().flatten(),
            "chat_supplements_monthly": r.try_get::<Option<i32>, _>("chat_supplements_monthly").ok().flatten(),
            "chat_protocols_monthly": r.try_get::<Option<i32>, _>("chat_protocols_monthly").ok().flatten(),
            "chat_lab_import_monthly": r.try_get::<Option<i32>, _>("chat_lab_import_monthly").ok().flatten(),
            "chat_med_import_monthly": r.try_get::<Option<i32>, _>("chat_med_import_monthly").ok().flatten(),
            "pdf_reports_monthly": r.try_get::<Option<i32>, _>("pdf_reports_monthly").ok().flatten(),
            "max_measurements": r.try_get::<Option<i32>, _>("max_measurements").ok().flatten(),
            "csv_export": r.try_get::<bool, _>("csv_export").unwrap_or(false),
            "json_export": r.try_get::<bool, _>("json_export").unwrap_or(false),
            "custom_thresholds": r.try_get::<bool, _>("custom_thresholds").unwrap_or(false),
            "lifestyle_presets": r.try_get::<bool, _>("lifestyle_presets").unwrap_or(false),
            "protocol_comparison": r.try_get::<bool, _>("protocol_comparison").unwrap_or(false),
            "body_composition": r.try_get::<bool, _>("body_composition").unwrap_or(false),
            "supplement_marker_impact": r.try_get::<bool, _>("supplement_marker_impact").unwrap_or(false),
            "ai_dashboard_insights": r.try_get::<bool, _>("ai_dashboard_insights").unwrap_or(false),
            "cohort_comparison": r.try_get::<bool, _>("cohort_comparison").unwrap_or(false),
            "mfa_totp": r.try_get::<bool, _>("mfa_totp").unwrap_or(false),
            "api_access": r.try_get::<bool, _>("api_access").unwrap_or(false),
            "self_hosted_hybrid": r.try_get::<bool, _>("self_hosted_hybrid").unwrap_or(false),
            "team_sharing": r.try_get::<bool, _>("team_sharing").unwrap_or(false),
            "max_team_members": r.try_get::<Option<i32>, _>("max_team_members").ok().flatten(),
            "support_level": r.try_get::<String, _>("support_level").unwrap_or_default(),
            "display_order": r.try_get::<i32, _>("display_order").unwrap_or(0),
            "highlight": r.try_get::<bool, _>("highlight").unwrap_or(false),
        })
    }).collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": tiers,
        "error": null
    })))
}

// ── GET /license/usage ──────────────────────────────────────────────────────

pub async fn get_usage(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    // Measurement usage
    let (measurements_used, measurements_limit) =
        tier::get_measurement_usage(pool.get_ref(), auth.user_id).await?;
    let measurements_unlimited = measurements_limit.is_none();

    // AI chat usage (general agent as representative)
    let tier_limits = tier::get_user_tier(pool.get_ref(), auth.user_id).await?;
    let now = chrono::Utc::now();
    let month_year = format!("{}-{:02}", now.year(), now.month());

    let chat_used: i64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(used_count), 0) FROM chat_agent_quota WHERE user_id = $1 AND month_year = $2",
    )
    .bind(auth.user_id)
    .bind(&month_year)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    // Sum all chat limits for a total; None on any means unlimited
    let chat_limit: Option<i32> = {
        let limits = [
            tier_limits.chat_general_monthly,
            tier_limits.chat_trends_monthly,
            tier_limits.chat_labs_monthly,
            tier_limits.chat_diet_monthly,
            tier_limits.chat_supplements_monthly,
            tier_limits.chat_protocols_monthly,
            tier_limits.chat_lab_import_monthly,
            tier_limits.chat_med_import_monthly,
        ];
        if limits.iter().any(|l| l.is_none()) {
            None // at least one unlimited agent means unlimited total
        } else {
            Some(limits.iter().map(|l| l.unwrap_or(0)).sum())
        }
    };
    let chat_unlimited = chat_limit.is_none();

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "measurements": {
                "used": measurements_used,
                "limit": measurements_limit,
                "unlimited": measurements_unlimited,
            },
            "ai_chats": {
                "used": chat_used,
                "limit": chat_limit,
                "unlimited": chat_unlimited,
            }
        },
        "error": null
    })))
}

// ── PUT /license/downgrade ───────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct DowngradeRequest {
    pub target_tier: String,
    pub reason: Option<String>,
}

pub async fn downgrade(
    pool: web::Data<PgPool>,
    config: web::Data<crate::config::Config>,
    auth: AuthenticatedUser,
    body: web::Json<DowngradeRequest>,
) -> Result<HttpResponse, AppError> {
    let target_slug = body.target_tier.trim().to_lowercase();

    // Validate target tier exists
    let target_row = sqlx::query(
        "SELECT id, slug, name, display_order FROM license_tiers WHERE slug = $1 AND is_active = true",
    )
    .bind(&target_slug)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| AppError::Validation("Invalid target tier".to_string()))?;

    let target_order: i32 = target_row.try_get("display_order").unwrap_or(0);

    // Get current license
    let current = sqlx::query(
        r#"SELECT ul.id, lt.slug as current_slug, lt.name as current_name, lt.display_order as current_order
        FROM user_licenses ul
        JOIN license_tiers lt ON lt.id = ul.tier_id
        WHERE ul.user_id = $1"#,
    )
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    let current_slug: String = current.try_get("current_slug").unwrap_or_default();
    let current_order: i32 = current.try_get("current_order").unwrap_or(0);

    if target_order >= current_order {
        return Err(AppError::Validation(
            "Can only downgrade to a lower tier".to_string(),
        ));
    }

    let target_tier_id: uuid::Uuid = target_row.try_get("id").unwrap_or_default();
    let grace_ends = Utc::now() + chrono::Duration::days(config.grace_period_days);

    // Update license
    sqlx::query(
        r#"UPDATE user_licenses
        SET tier_id = $1, status = 'downgrade_grace',
            downgraded_at = NOW(), grace_period_ends = $2,
            previous_tier_slug = $3, updated_at = NOW()
        WHERE user_id = $4"#,
    )
    .bind(target_tier_id)
    .bind(grace_ends)
    .bind(&current_slug)
    .bind(auth.user_id)
    .execute(pool.get_ref())
    .await?;

    // Update users.tier column
    sqlx::query("UPDATE users SET tier = $1 WHERE id = $2")
        .bind(&target_slug)
        .bind(auth.user_id)
        .execute(pool.get_ref())
        .await?;

    // Log event
    sqlx::query(
        r#"INSERT INTO license_events (user_id, event_type, from_tier_slug, to_tier_slug, metadata)
        VALUES ($1, 'downgraded', $2, $3, $4)"#,
    )
    .bind(auth.user_id)
    .bind(&current_slug)
    .bind(&target_slug)
    .bind(json!({ "reason": body.reason }))
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "downgraded": true,
            "from_tier": current_slug,
            "to_tier": target_slug,
            "grace_period_ends": grace_ends.to_rfc3339(),
            "message": format!("You have been moved to {}. Your previous plan features are available until {}.", target_slug, grace_ends.format("%B %d, %Y"))
        },
        "error": null
    })))
}

// ── GET /api/tiers/features (public, no auth) ──────────────────────────────

pub async fn tiers_features(pool: web::Data<PgPool>) -> Result<HttpResponse, AppError> {
    // 1. Fetch all active tiers (exclude 'core')
    let tier_rows = sqlx::query(
        r#"SELECT slug, name, name AS name_de,
            price_monthly_eur::float8 as price_monthly,
            price_annual_eur::float8 as price_yearly
        FROM license_tiers
        WHERE is_active = true AND slug != 'core'
        ORDER BY display_order ASC"#,
    )
    .fetch_all(pool.get_ref())
    .await?;

    let tiers: Vec<serde_json::Value> = tier_rows
        .iter()
        .map(|r| {
            json!({
                "slug": r.try_get::<String, _>("slug").unwrap_or_default(),
                "name_en": r.try_get::<String, _>("name").unwrap_or_default(),
                "name_de": r.try_get::<String, _>("name_de").unwrap_or_default(),
                "price_monthly": r.try_get::<Option<f64>, _>("price_monthly").ok().flatten().unwrap_or(0.0),
                "price_yearly": r.try_get::<Option<f64>, _>("price_yearly").ok().flatten().unwrap_or(0.0),
            })
        })
        .collect();

    let tier_slugs: Vec<String> = tier_rows
        .iter()
        .filter_map(|r| r.try_get::<String, _>("slug").ok())
        .collect();

    // 2. Fetch all non-deprecated product_features
    let feature_rows = sqlx::query(
        r#"SELECT pf.id, pf.feature_key, pf.name_en, pf.name_de,
            pf.tooltip_en, pf.tooltip_de, pf.category, pf.sort_order, pf.status
        FROM product_features pf
        WHERE pf.status != 'deprecated'
        ORDER BY pf.category, pf.sort_order"#,
    )
    .fetch_all(pool.get_ref())
    .await?;

    // 3. Fetch all tier_features
    let tf_rows = sqlx::query(
        r#"SELECT tf.feature_id, tf.tier_key, tf.included,
            tf.limit_value, tf.limit_label_en, tf.limit_label_de
        FROM tier_features tf
        JOIN product_features pf ON pf.id = tf.feature_id
        WHERE pf.status != 'deprecated'"#,
    )
    .fetch_all(pool.get_ref())
    .await?;

    // Build a map: feature_id -> tier_key -> tier_feature data
    let mut tf_map: std::collections::HashMap<
        uuid::Uuid,
        std::collections::HashMap<String, serde_json::Value>,
    > = std::collections::HashMap::new();

    for tf in &tf_rows {
        let fid: uuid::Uuid = tf.try_get("feature_id").unwrap_or_default();
        let tier_key: String = tf.try_get("tier_key").unwrap_or_default();
        let included: bool = tf.try_get("included").unwrap_or(false);
        let label_en: Option<String> = tf.try_get("limit_label_en").ok().flatten();
        let label_de: Option<String> = tf.try_get("limit_label_de").ok().flatten();

        tf_map.entry(fid).or_default().insert(
            tier_key,
            json!({
                "included": included,
                "label_en": label_en,
                "label_de": label_de,
            }),
        );
    }

    // 4. Group features by category
    let category_names: std::collections::HashMap<&str, (&str, &str)> = [
        ("data", ("Data & Tracking", "Daten & Tracking")),
        ("reporting", ("Reports & Export", "Berichte & Export")),
        ("ai", ("AI Features", "KI-Funktionen")),
        ("security", ("Security", "Sicherheit")),
        ("integrations", ("Integrations", "Integrationen")),
    ]
    .into_iter()
    .collect();

    let mut groups_map: std::collections::BTreeMap<String, Vec<serde_json::Value>> =
        std::collections::BTreeMap::new();

    for f in &feature_rows {
        let fid: uuid::Uuid = f.try_get("id").unwrap_or_default();
        let category: String = f.try_get("category").unwrap_or_default();
        let feature_key: String = f.try_get("feature_key").unwrap_or_default();
        let status: String = f.try_get("status").unwrap_or_else(|_| "active".to_string());

        // Build limits per tier
        let mut limits = json!({});
        if let Some(tier_data) = tf_map.get(&fid) {
            for slug in &tier_slugs {
                if let Some(td) = tier_data.get(slug) {
                    limits[slug] = td.clone();
                } else {
                    limits[slug] = json!({
                        "included": false,
                        "label_en": null,
                        "label_de": null,
                    });
                }
            }
        } else {
            for slug in &tier_slugs {
                limits[slug] = json!({
                    "included": false,
                    "label_en": null,
                    "label_de": null,
                });
            }
        }

        let feature_json = json!({
            "slug": feature_key,
            "name_en": f.try_get::<String, _>("name_en").unwrap_or_default(),
            "name_de": f.try_get::<Option<String>, _>("name_de").ok().flatten(),
            "tooltip_en": f.try_get::<Option<String>, _>("tooltip_en").ok().flatten(),
            "tooltip_de": f.try_get::<Option<String>, _>("tooltip_de").ok().flatten(),
            "status": status,
            "limits": limits,
        });

        groups_map.entry(category).or_default().push(feature_json);
    }

    // 5. Build groups array
    let category_order = ["data", "reporting", "ai", "security", "integrations"];
    let mut groups: Vec<serde_json::Value> = Vec::new();

    for cat in &category_order {
        if let Some(features) = groups_map.get(*cat) {
            let (name_en, name_de) = category_names.get(cat).copied().unwrap_or((*cat, *cat));
            groups.push(json!({
                "slug": cat,
                "name_en": name_en,
                "name_de": name_de,
                "features": features,
            }));
        }
    }

    // Include any categories not in the predefined order
    for (cat, features) in &groups_map {
        if !category_order.contains(&cat.as_str()) {
            let (name_en, name_de) = category_names
                .get(cat.as_str())
                .copied()
                .unwrap_or((cat.as_str(), cat.as_str()));
            groups.push(json!({
                "slug": cat,
                "name_en": name_en,
                "name_de": name_de,
                "features": features,
            }));
        }
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "tiers": tiers,
            "groups": groups,
        },
        "error": null
    })))
}
