// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::middleware::auth::AuthenticatedUser;
use crate::PlatformPool;

// ── Response types ──────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
struct FeatureResponse {
    feature_key: String,
    name: String,
    description: Option<String>,
    tooltip: Option<String>,
    category: String,
    status: String,
    icon: Option<String>,
    tiers: serde_json::Value,
}

#[derive(Debug, Serialize)]
struct AdminFeatureResponse {
    id: Uuid,
    feature_key: String,
    name_en: String,
    name_de: Option<String>,
    description_en: Option<String>,
    description_de: Option<String>,
    tooltip_en: Option<String>,
    tooltip_de: Option<String>,
    category: String,
    sort_order: i32,
    status: String,
    icon: Option<String>,
    tiers: Vec<AdminTierAssignment>,
}

#[derive(Debug, Serialize, Deserialize)]
struct AdminTierAssignment {
    tier_key: String,
    included: bool,
    limit_value: Option<i32>,
    limit_label_en: Option<String>,
    limit_label_de: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateFeatureRequest {
    feature_key: String,
    name_en: String,
    name_de: Option<String>,
    description_en: Option<String>,
    description_de: Option<String>,
    tooltip_en: Option<String>,
    tooltip_de: Option<String>,
    category: String,
    sort_order: Option<i32>,
    status: Option<String>,
    icon: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateFeatureRequest {
    name_en: Option<String>,
    name_de: Option<String>,
    description_en: Option<String>,
    description_de: Option<String>,
    tooltip_en: Option<String>,
    tooltip_de: Option<String>,
    category: Option<String>,
    sort_order: Option<i32>,
    status: Option<String>,
    icon: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTiersRequest {
    tiers: Vec<AdminTierAssignment>,
}

#[derive(Debug, Deserialize)]
pub struct LangQuery {
    lang: Option<String>,
}

// ── Helpers ─────────────────────────────────────────────────────────────────

fn detect_lang(req: &HttpRequest, query: &LangQuery) -> String {
    if let Some(ref lang) = query.lang {
        if lang == "de" {
            return "de".to_string();
        }
        return "en".to_string();
    }
    if let Some(accept) = req.headers().get("accept-language") {
        if let Ok(val) = accept.to_str() {
            if val.starts_with("de") {
                return "de".to_string();
            }
        }
    }
    "en".to_string()
}

const TIER_ORDER: &[&str] = &["core", "glimpse", "focus", "insight", "clarity", "horizon"];

// ── Public: GET /api/features ───────────────────────────────────────────────

pub async fn list_features(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    query: web::Query<LangQuery>,
) -> HttpResponse {
    let lang = detect_lang(&req, &query);

    let rows = sqlx::query_as::<_, FeatureRow>(
        r#"SELECT pf.id, pf.feature_key, pf.name_en, pf.name_de,
                  pf.description_en, pf.description_de,
                  pf.tooltip_en, pf.tooltip_de,
                  pf.category, pf.sort_order, pf.status, pf.icon
           FROM product_features pf
           WHERE pf.status IN ('active', 'coming_soon')
           ORDER BY pf.category, pf.sort_order"#,
    )
    .fetch_all(&platform_pool.0)
    .await;

    let rows = match rows {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch features: {e}");
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "data": null,
                "error": { "code": "db_error", "message": "Failed to fetch features" }
            }));
        }
    };

    let tier_rows = sqlx::query_as::<_, TierFeatureRow>(
        r#"SELECT tf.feature_id, tf.tier_key, tf.included,
                  tf.limit_value, tf.limit_label_en, tf.limit_label_de
           FROM tier_features tf
           JOIN product_features pf ON pf.id = tf.feature_id
           WHERE pf.status IN ('active', 'coming_soon')"#,
    )
    .fetch_all(&platform_pool.0)
    .await
    .unwrap_or_default();

    let mut categories: Vec<String> = Vec::new();
    let mut features: Vec<FeatureResponse> = Vec::new();

    for row in &rows {
        if !categories.contains(&row.category) {
            categories.push(row.category.clone());
        }

        let mut tiers = serde_json::Map::new();
        for tier_key in TIER_ORDER {
            let tf = tier_rows
                .iter()
                .find(|t| t.feature_id == row.id && t.tier_key == *tier_key);

            let entry = match tf {
                Some(t) => {
                    let label = if lang == "de" {
                        t.limit_label_de
                            .clone()
                            .or_else(|| t.limit_label_en.clone())
                    } else {
                        t.limit_label_en.clone()
                    };
                    serde_json::json!({
                        "included": t.included,
                        "limit_value": t.limit_value,
                        "limit_label": label,
                    })
                }
                None => serde_json::json!({ "included": false }),
            };
            tiers.insert(tier_key.to_string(), entry);
        }

        let (name, desc, tooltip) = if lang == "de" {
            (
                row.name_de.clone().unwrap_or_else(|| row.name_en.clone()),
                row.description_de
                    .clone()
                    .or_else(|| row.description_en.clone()),
                row.tooltip_de.clone().or_else(|| row.tooltip_en.clone()),
            )
        } else {
            (
                row.name_en.clone(),
                row.description_en.clone(),
                row.tooltip_en.clone(),
            )
        };

        features.push(FeatureResponse {
            feature_key: row.feature_key.clone(),
            name,
            description: desc,
            tooltip,
            category: row.category.clone(),
            status: row.status.clone(),
            icon: row.icon.clone(),
            tiers: serde_json::Value::Object(tiers),
        });
    }

    HttpResponse::Ok().json(serde_json::json!({
        "data": {
            "features": features,
            "categories": categories,
        },
        "error": null
    }))
}

// ── Public: GET /api/features/stats ─────────────────────────────────────────

pub async fn feature_stats(
    pool: web::Data<PgPool>,
    platform_pool: web::Data<PlatformPool>,
) -> HttpResponse {
    let total_features: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM product_features WHERE status IN ('active', 'coming_soon')",
    )
    .fetch_one(&platform_pool.0)
    .await
    .unwrap_or(0);

    let standard_markers: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM markers")
        .fetch_one(pool.get_ref())
        .await
        .unwrap_or(0);

    let calculated_markers: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM calculated_markers")
        .fetch_one(pool.get_ref())
        .await
        .unwrap_or(0);

    let total_markers = standard_markers + calculated_markers;

    let total_zones: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM zones")
        .fetch_one(pool.get_ref())
        .await
        .unwrap_or(0);

    HttpResponse::Ok().json(serde_json::json!({
        "data": {
            "total_features": total_features,
            "total_markers": total_markers,
            "total_health_zones": total_zones,
        },
        "error": null
    }))
}

// ── Admin: GET /admin/features ──────────────────────────────────────────────

pub async fn admin_list_features(
    platform_pool: web::Data<PlatformPool>,
    user: AuthenticatedUser,
) -> HttpResponse {
    if user.role != "admin" {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "data": null,
            "error": { "code": "forbidden", "message": "Admin access required" }
        }));
    }

    let rows = sqlx::query_as::<_, FeatureRow>(
        r#"SELECT id, feature_key, name_en, name_de,
                  description_en, description_de,
                  tooltip_en, tooltip_de,
                  category, sort_order, status, icon
           FROM product_features
           ORDER BY category, sort_order"#,
    )
    .fetch_all(&platform_pool.0)
    .await;

    let rows = match rows {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch features: {e}");
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "data": null,
                "error": { "code": "db_error", "message": "Failed to fetch features" }
            }));
        }
    };

    let tier_rows = sqlx::query_as::<_, TierFeatureRow>(
        r#"SELECT feature_id, tier_key, included, limit_value, limit_label_en, limit_label_de
           FROM tier_features"#,
    )
    .fetch_all(&platform_pool.0)
    .await
    .unwrap_or_default();

    let features: Vec<AdminFeatureResponse> = rows
        .iter()
        .map(|row| {
            let tiers: Vec<AdminTierAssignment> = TIER_ORDER
                .iter()
                .filter_map(|tk| {
                    tier_rows
                        .iter()
                        .find(|t| t.feature_id == row.id && t.tier_key == *tk)
                        .map(|t| AdminTierAssignment {
                            tier_key: t.tier_key.clone(),
                            included: t.included,
                            limit_value: t.limit_value,
                            limit_label_en: t.limit_label_en.clone(),
                            limit_label_de: t.limit_label_de.clone(),
                        })
                })
                .collect();

            AdminFeatureResponse {
                id: row.id,
                feature_key: row.feature_key.clone(),
                name_en: row.name_en.clone(),
                name_de: row.name_de.clone(),
                description_en: row.description_en.clone(),
                description_de: row.description_de.clone(),
                tooltip_en: row.tooltip_en.clone(),
                tooltip_de: row.tooltip_de.clone(),
                category: row.category.clone(),
                sort_order: row.sort_order,
                status: row.status.clone(),
                icon: row.icon.clone(),
                tiers,
            }
        })
        .collect();

    HttpResponse::Ok().json(serde_json::json!({
        "data": features,
        "error": null
    }))
}

// ── Admin: POST /admin/features ─────────────────────────────────────────────

pub async fn admin_create_feature(
    platform_pool: web::Data<PlatformPool>,
    user: AuthenticatedUser,
    body: web::Json<CreateFeatureRequest>,
) -> HttpResponse {
    if user.role != "admin" {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "data": null,
            "error": { "code": "forbidden", "message": "Admin access required" }
        }));
    }

    let status = body.status.as_deref().unwrap_or("active");
    let sort_order = body.sort_order.unwrap_or(0);

    let result = sqlx::query_scalar::<_, Uuid>(
        r#"INSERT INTO product_features
           (feature_key, name_en, name_de, description_en, description_de,
            tooltip_en, tooltip_de, category, sort_order, status, icon)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id"#,
    )
    .bind(&body.feature_key)
    .bind(&body.name_en)
    .bind(&body.name_de)
    .bind(&body.description_en)
    .bind(&body.description_de)
    .bind(&body.tooltip_en)
    .bind(&body.tooltip_de)
    .bind(&body.category)
    .bind(sort_order)
    .bind(status)
    .bind(&body.icon)
    .fetch_one(&platform_pool.0)
    .await;

    match result {
        Ok(id) => HttpResponse::Created().json(serde_json::json!({
            "data": { "id": id, "feature_key": body.feature_key },
            "error": null
        })),
        Err(e) => {
            tracing::error!("Failed to create feature: {e}");
            let msg = if e.to_string().contains("duplicate key") {
                "Feature key already exists"
            } else {
                "Failed to create feature"
            };
            HttpResponse::BadRequest().json(serde_json::json!({
                "data": null,
                "error": { "code": "create_failed", "message": msg }
            }))
        }
    }
}

// ── Admin: PUT /admin/features/{id} ─────────────────────────────────────────

pub async fn admin_update_feature(
    platform_pool: web::Data<PlatformPool>,
    user: AuthenticatedUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateFeatureRequest>,
) -> HttpResponse {
    if user.role != "admin" {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "data": null,
            "error": { "code": "forbidden", "message": "Admin access required" }
        }));
    }

    let id = path.into_inner();

    let existing: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM product_features WHERE id = $1")
            .bind(id)
            .fetch_optional(&platform_pool.0)
            .await
            .unwrap_or(None);

    if existing.is_none() {
        return HttpResponse::NotFound().json(serde_json::json!({
            "data": null,
            "error": { "code": "not_found", "message": "Feature not found" }
        }));
    }

    let result = sqlx::query(
        r#"UPDATE product_features SET
            name_en = COALESCE($2, name_en),
            name_de = COALESCE($3, name_de),
            description_en = COALESCE($4, description_en),
            description_de = COALESCE($5, description_de),
            tooltip_en = COALESCE($6, tooltip_en),
            tooltip_de = COALESCE($7, tooltip_de),
            category = COALESCE($8, category),
            sort_order = COALESCE($9, sort_order),
            status = COALESCE($10, status),
            icon = COALESCE($11, icon),
            updated_at = now()
           WHERE id = $1"#,
    )
    .bind(id)
    .bind(&body.name_en)
    .bind(&body.name_de)
    .bind(&body.description_en)
    .bind(&body.description_de)
    .bind(&body.tooltip_en)
    .bind(&body.tooltip_de)
    .bind(&body.category)
    .bind(body.sort_order)
    .bind(&body.status)
    .bind(&body.icon)
    .execute(&platform_pool.0)
    .await;

    match result {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "data": { "id": id, "updated": true },
            "error": null
        })),
        Err(e) => {
            tracing::error!("Failed to update feature: {e}");
            HttpResponse::InternalServerError().json(serde_json::json!({
                "data": null,
                "error": { "code": "update_failed", "message": "Failed to update feature" }
            }))
        }
    }
}

// ── Admin: DELETE /admin/features/{id} (soft delete) ────────────────────────

pub async fn admin_delete_feature(
    platform_pool: web::Data<PlatformPool>,
    user: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> HttpResponse {
    if user.role != "admin" {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "data": null,
            "error": { "code": "forbidden", "message": "Admin access required" }
        }));
    }

    let id = path.into_inner();

    let result = sqlx::query(
        "UPDATE product_features SET status = 'deprecated', updated_at = now() WHERE id = $1",
    )
    .bind(id)
    .execute(&platform_pool.0)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => HttpResponse::Ok().json(serde_json::json!({
            "data": { "id": id, "status": "deprecated" },
            "error": null
        })),
        Ok(_) => HttpResponse::NotFound().json(serde_json::json!({
            "data": null,
            "error": { "code": "not_found", "message": "Feature not found" }
        })),
        Err(e) => {
            tracing::error!("Failed to deprecate feature: {e}");
            HttpResponse::InternalServerError().json(serde_json::json!({
                "data": null,
                "error": { "code": "delete_failed", "message": "Failed to deprecate feature" }
            }))
        }
    }
}

// ── Admin: PUT /admin/features/{id}/tiers ───────────────────────────────────

pub async fn admin_update_tiers(
    platform_pool: web::Data<PlatformPool>,
    user: AuthenticatedUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateTiersRequest>,
) -> HttpResponse {
    if user.role != "admin" {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "data": null,
            "error": { "code": "forbidden", "message": "Admin access required" }
        }));
    }

    let feature_id = path.into_inner();

    let existing: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM product_features WHERE id = $1")
            .bind(feature_id)
            .fetch_optional(&platform_pool.0)
            .await
            .unwrap_or(None);

    if existing.is_none() {
        return HttpResponse::NotFound().json(serde_json::json!({
            "data": null,
            "error": { "code": "not_found", "message": "Feature not found" }
        }));
    }

    let mut tx = match platform_pool.0.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to begin transaction: {e}");
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "data": null,
                "error": { "code": "db_error", "message": "Database error" }
            }));
        }
    };

    // Delete existing tier assignments for this feature
    if let Err(e) = sqlx::query("DELETE FROM tier_features WHERE feature_id = $1")
        .bind(feature_id)
        .execute(&mut *tx)
        .await
    {
        tracing::error!("Failed to clear tier assignments: {e}");
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "data": null,
            "error": { "code": "db_error", "message": "Failed to update tier assignments" }
        }));
    }

    // Insert new assignments
    for tier in &body.tiers {
        if let Err(e) = sqlx::query(
            r#"INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
               VALUES ($1, $2, $3, $4, $5, $6)"#,
        )
        .bind(&tier.tier_key)
        .bind(feature_id)
        .bind(tier.included)
        .bind(tier.limit_value)
        .bind(&tier.limit_label_en)
        .bind(&tier.limit_label_de)
        .execute(&mut *tx)
        .await
        {
            tracing::error!("Failed to insert tier assignment: {e}");
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "data": null,
                "error": { "code": "db_error", "message": "Failed to update tier assignments" }
            }));
        }
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit tier update: {e}");
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "data": null,
            "error": { "code": "db_error", "message": "Failed to commit changes" }
        }));
    }

    HttpResponse::Ok().json(serde_json::json!({
        "data": { "feature_id": feature_id, "tiers_updated": body.tiers.len() },
        "error": null
    }))
}

// ── SQLx row types ──────────────────────────────────────────────────────────

#[derive(sqlx::FromRow)]
struct FeatureRow {
    id: Uuid,
    feature_key: String,
    name_en: String,
    name_de: Option<String>,
    description_en: Option<String>,
    description_de: Option<String>,
    tooltip_en: Option<String>,
    tooltip_de: Option<String>,
    category: String,
    sort_order: i32,
    status: String,
    icon: Option<String>,
}

#[derive(sqlx::FromRow)]
struct TierFeatureRow {
    feature_id: Uuid,
    tier_key: String,
    included: bool,
    limit_value: Option<i32>,
    limit_label_en: Option<String>,
    limit_label_de: Option<String>,
}
