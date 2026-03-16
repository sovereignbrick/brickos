// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use serde::Deserialize;
use serde_json::json;
use sqlx::{PgPool, Row};

use crate::{error::AppError, middleware::auth::AuthenticatedUser};

// ── GET /knowledge/markers/{slug} ──────────────────────────────────────────────

pub async fn marker_knowledge(
    pool: web::Data<PgPool>,
    path: web::Path<String>,
    auth: Option<AuthenticatedUser>,
) -> Result<HttpResponse, AppError> {
    let slug = path.into_inner();

    // Fetch marker basic info (standard or calculated)
    let marker_row = sqlx::query(
        r#"SELECT marker_slug, marker_name, unit_canonical, source_type
           FROM markers WHERE marker_slug = $1
           UNION ALL
           SELECT marker_slug, marker_name, '' as unit_canonical, 'calculated' as source_type
           FROM calculated_markers WHERE marker_slug = $1
           LIMIT 1"#,
    )
    .bind(&slug)
    .fetch_optional(pool.get_ref())
    .await?;

    let Some(marker_row) = marker_row else {
        return Err(AppError::NotFound);
    };

    let marker_name: String = marker_row.try_get("marker_name").unwrap_or_default();
    let unit: String = marker_row.try_get("unit_canonical").unwrap_or_default();
    let source_type: String = marker_row.try_get("source_type").unwrap_or_default();

    // Zones
    let zone_rows = sqlx::query("SELECT zone_slug FROM zone_markers WHERE marker_slug = $1")
        .bind(&slug)
        .fetch_all(pool.get_ref())
        .await?;
    let zones: Vec<String> = zone_rows
        .iter()
        .map(|r| r.try_get("zone_slug").unwrap_or_default())
        .collect();

    // Reference range (standard)
    let ref_range = fetch_reference_range(pool.get_ref(), &slug, "standard").await?;

    // Fasting range
    let fasting_range = fetch_reference_range(pool.get_ref(), &slug, "fasting").await?;

    // Fasting explanation
    let fasting_exp_row = sqlx::query(
        "SELECT body_text FROM marker_content WHERE marker_id = $1 AND content_type = 'fasting_explanation' LIMIT 1",
    )
    .bind(&slug)
    .fetch_optional(pool.get_ref())
    .await?;
    let fasting_explanation: Option<String> =
        fasting_exp_row.map(|r| r.try_get("body_text").unwrap_or_default());

    // Related markers (bidirectional)
    let relation_rows = sqlx::query(
        r#"SELECT marker_slug_a, marker_slug_b, direction, description, clinical_significance
           FROM marker_relations
           WHERE marker_slug_a = $1 OR marker_slug_b = $1
           ORDER BY clinical_significance ASC"#,
    )
    .bind(&slug)
    .fetch_all(pool.get_ref())
    .await?;

    let related_markers: Vec<serde_json::Value> = relation_rows
        .iter()
        .map(|r| {
            let a: String = r.try_get("marker_slug_a").unwrap_or_default();
            let b: String = r.try_get("marker_slug_b").unwrap_or_default();
            let other = if a == slug { &b } else { &a };
            json!({
                "slug": other,
                "direction": r.try_get::<String, _>("direction").unwrap_or_default(),
                "relationship": r.try_get::<String, _>("description").unwrap_or_default(),
                "clinical_significance": r.try_get::<String, _>("clinical_significance").unwrap_or_default(),
            })
        })
        .collect();

    // Content (all types)
    let content_rows = sqlx::query(
        "SELECT content_type, title, body_text FROM marker_content WHERE marker_id = $1 ORDER BY display_order",
    )
    .bind(&slug)
    .fetch_all(pool.get_ref())
    .await?;

    let mut content = serde_json::Map::new();
    for row in &content_rows {
        let ct: String = row.try_get("content_type").unwrap_or_default();
        let text: String = row.try_get("body_text").unwrap_or_default();
        content.insert(ct, json!(text));
    }

    // Foods
    let food_rows = sqlx::query(
        "SELECT food_name, food_category FROM marker_foods WHERE marker_id = $1 ORDER BY display_order",
    )
    .bind(&slug)
    .fetch_all(pool.get_ref())
    .await?;
    let foods: Vec<serde_json::Value> = food_rows
        .iter()
        .map(|r| {
            json!({
                "food_name": r.try_get::<String, _>("food_name").unwrap_or_default(),
                "food_category": r.try_get::<Option<String>, _>("food_category").ok().flatten(),
            })
        })
        .collect();

    // Supplements
    let supp_rows = sqlx::query(
        "SELECT supplement_name, typical_dose, notes FROM marker_supplements WHERE marker_id = $1 ORDER BY display_order",
    )
    .bind(&slug)
    .fetch_all(pool.get_ref())
    .await?;
    let supplements: Vec<serde_json::Value> = supp_rows
        .iter()
        .map(|r| {
            json!({
                "supplement_name": r.try_get::<String, _>("supplement_name").unwrap_or_default(),
                "typical_dose": r.try_get::<Option<String>, _>("typical_dose").ok().flatten(),
                "notes": r.try_get::<Option<String>, _>("notes").ok().flatten(),
            })
        })
        .collect();

    // References
    let ref_rows = sqlx::query(
        "SELECT title, source, year, url FROM marker_references WHERE marker_id = $1 ORDER BY display_order",
    )
    .bind(&slug)
    .fetch_all(pool.get_ref())
    .await?;
    let references: Vec<serde_json::Value> = ref_rows
        .iter()
        .map(|r| {
            json!({
                "title": r.try_get::<String, _>("title").unwrap_or_default(),
                "source": r.try_get::<Option<String>, _>("source").ok().flatten(),
                "year": r.try_get::<Option<i32>, _>("year").ok().flatten(),
                "url": r.try_get::<Option<String>, _>("url").ok().flatten(),
            })
        })
        .collect();

    // Protocol effects for this marker
    let proto_rows = sqlx::query(
        "SELECT protocol_slug, protocol_name, effect, detail FROM protocol_effects WHERE marker_slug = $1",
    )
    .bind(&slug)
    .fetch_all(pool.get_ref())
    .await?;

    let mut protocol_effects = serde_json::Map::new();
    for row in &proto_rows {
        let ps: String = row.try_get("protocol_slug").unwrap_or_default();
        protocol_effects.insert(
            ps,
            json!({
                "effect": row.try_get::<String, _>("effect").unwrap_or_default(),
                "detail": row.try_get::<String, _>("detail").unwrap_or_default(),
            }),
        );
    }

    // Medication interactions (for user's active medications only, if authenticated)
    let medication_interactions = if let Some(ref auth) = auth {
        fetch_user_medication_effects(pool.get_ref(), auth.user_id, &slug).await?
    } else {
        // For unauthenticated, show all known medication effects for this marker
        let effects = sqlx::query(
            r#"SELECT mc.name as medication_name, mme.effect, mme.description, mme.severity
               FROM medication_marker_effects mme
               JOIN medication_catalog mc ON mc.slug = mme.medication_slug
               WHERE mme.marker_slug = $1"#,
        )
        .bind(&slug)
        .fetch_all(pool.get_ref())
        .await?;
        effects
            .iter()
            .map(|r| json!({
                "medication_name": r.try_get::<String, _>("medication_name").unwrap_or_default(),
                "effect": r.try_get::<String, _>("effect").unwrap_or_default(),
                "description": r.try_get::<String, _>("description").unwrap_or_default(),
                "severity": r.try_get::<String, _>("severity").unwrap_or_default(),
            }))
            .collect()
    };

    let mut fasting_obj = json!(null);
    if let Some(ref fr) = fasting_range {
        let mut obj = fr.clone();
        if let Some(exp) = &fasting_explanation {
            obj.as_object_mut()
                .map(|m| m.insert("explanation".to_string(), json!(exp)));
        }
        fasting_obj = obj;
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "marker": {
                "slug": slug,
                "name": marker_name,
                "unit": unit,
                "source_type": source_type,
            },
            "zones": zones,
            "reference_range": ref_range,
            "fasting_range": fasting_obj,
            "related_markers": related_markers,
            "foods": foods,
            "supplements": supplements,
            "content": content,
            "references": references,
            "protocol_effects": protocol_effects,
            "medication_interactions": medication_interactions,
        },
        "error": null
    })))
}

async fn fetch_reference_range(
    pool: &PgPool,
    marker_slug: &str,
    protocol: &str,
) -> Result<Option<serde_json::Value>, AppError> {
    // Standard markers
    let row = sqlx::query(
        r#"SELECT rr.green_min, rr.green_max, rr.orange_min, rr.orange_max
           FROM reference_ranges rr
           JOIN markers m ON m.id = rr.marker_id
           WHERE m.marker_slug = $1 AND rr.protocol_context = $2 AND rr.user_id IS NULL
           LIMIT 1"#,
    )
    .bind(marker_slug)
    .bind(if protocol == "fasting" {
        "fasting_16_8"
    } else {
        protocol
    })
    .fetch_optional(pool)
    .await?;

    if let Some(r) = row {
        return Ok(Some(json!({
            "green_min": r.try_get::<Option<f64>, _>("green_min").ok().flatten(),
            "green_max": r.try_get::<Option<f64>, _>("green_max").ok().flatten(),
            "yellow_min": r.try_get::<Option<f64>, _>("orange_min").ok().flatten(),
            "yellow_max": r.try_get::<Option<f64>, _>("orange_max").ok().flatten(),
        })));
    }

    // Check calculated markers
    if protocol == "standard" {
        let cm_row =
            sqlx::query("SELECT default_thresholds FROM calculated_markers WHERE marker_slug = $1")
                .bind(marker_slug)
                .fetch_optional(pool)
                .await?;
        if let Some(r) = cm_row {
            let dt: serde_json::Value = r.try_get("default_thresholds").unwrap_or(json!({}));
            if dt.as_object().is_none_or(|o| o.is_empty()) {
                return Ok(None);
            }
            return Ok(Some(json!({
                "green_min": dt.get("green_min"),
                "green_max": dt.get("green_max"),
                "yellow_min": dt.get("orange_min"),
                "yellow_max": dt.get("orange_max"),
            })));
        }
    } else {
        let cm_row =
            sqlx::query("SELECT protocol_overrides FROM calculated_markers WHERE marker_slug = $1")
                .bind(marker_slug)
                .fetch_optional(pool)
                .await?;
        if let Some(r) = cm_row {
            let po: serde_json::Value = r.try_get("protocol_overrides").unwrap_or(json!({}));
            if let Some(fasting) = po.get("fasting") {
                return Ok(Some(json!({
                    "green_min": fasting.get("green_min"),
                    "green_max": fasting.get("green_max"),
                    "yellow_min": fasting.get("orange_min"),
                    "yellow_max": fasting.get("orange_max"),
                })));
            }
        }
    }

    Ok(None)
}

async fn fetch_user_medication_effects(
    pool: &PgPool,
    user_id: uuid::Uuid,
    marker_slug: &str,
) -> Result<Vec<serde_json::Value>, AppError> {
    let rows = sqlx::query(
        r#"SELECT COALESCE(mc.name, um.custom_name) as medication_name,
                  mme.effect, mme.description, mme.severity
           FROM user_medications um
           LEFT JOIN medication_catalog mc ON mc.slug = um.medication_slug
           LEFT JOIN medication_marker_effects mme ON mme.medication_slug = um.medication_slug AND mme.marker_slug = $2
           WHERE um.user_id = $1 AND um.is_active = true AND mme.id IS NOT NULL"#,
    )
    .bind(user_id)
    .bind(marker_slug)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .iter()
        .map(|r| {
            json!({
                "medication_name": r.try_get::<String, _>("medication_name").unwrap_or_default(),
                "effect": r.try_get::<String, _>("effect").unwrap_or_default(),
                "description": r.try_get::<String, _>("description").unwrap_or_default(),
                "severity": r.try_get::<String, _>("severity").unwrap_or_default(),
            })
        })
        .collect())
}

// ── GET /knowledge/markers/{slug}/relations ────────────────────────────────────

pub async fn marker_relations(
    pool: web::Data<PgPool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let slug = path.into_inner();

    let rows = sqlx::query(
        r#"SELECT marker_slug_a, marker_slug_b, direction, description, clinical_significance
           FROM marker_relations
           WHERE marker_slug_a = $1 OR marker_slug_b = $1
           ORDER BY clinical_significance ASC"#,
    )
    .bind(&slug)
    .fetch_all(pool.get_ref())
    .await?;

    let relations: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            let a: String = r.try_get("marker_slug_a").unwrap_or_default();
            let b: String = r.try_get("marker_slug_b").unwrap_or_default();
            let other = if a == slug { b } else { a };
            json!({
                "related_marker": other,
                "direction": r.try_get::<String, _>("direction").unwrap_or_default(),
                "description": r.try_get::<String, _>("description").unwrap_or_default(),
                "clinical_significance": r.try_get::<String, _>("clinical_significance").unwrap_or_default(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": relations,
        "error": null
    })))
}

// ── GET /knowledge/protocols/{protocol} ────────────────────────────────────────

pub async fn protocol_effects(
    pool: web::Data<PgPool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let protocol = path.into_inner();

    let rows = sqlx::query(
        r#"SELECT protocol_name, protocol_description, marker_slug, effect, detail
           FROM protocol_effects
           WHERE protocol_slug = $1
           ORDER BY marker_slug"#,
    )
    .bind(&protocol)
    .fetch_all(pool.get_ref())
    .await?;

    if rows.is_empty() {
        return Err(AppError::NotFound);
    }

    let name: String = rows[0].try_get("protocol_name").unwrap_or_default();
    let description: Option<String> = rows[0].try_get("protocol_description").ok().flatten();

    let effects: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "marker_slug": r.try_get::<String, _>("marker_slug").unwrap_or_default(),
                "effect": r.try_get::<String, _>("effect").unwrap_or_default(),
                "detail": r.try_get::<String, _>("detail").unwrap_or_default(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "protocol_slug": protocol,
            "protocol_name": name,
            "description": description,
            "marker_effects": effects,
        },
        "error": null
    })))
}

// ── GET /knowledge/search?q=... ────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct SearchQuery {
    pub q: String,
}

pub async fn knowledge_search(
    pool: web::Data<PgPool>,
    query: web::Query<SearchQuery>,
) -> Result<HttpResponse, AppError> {
    let q = format!("%{}%", query.q.to_lowercase());

    // Search marker content
    let content_rows = sqlx::query(
        r#"SELECT marker_id, content_type, title, body_text
           FROM marker_content
           WHERE LOWER(title) LIKE $1 OR LOWER(body_text) LIKE $1
           LIMIT 20"#,
    )
    .bind(&q)
    .fetch_all(pool.get_ref())
    .await?;

    let content_results: Vec<serde_json::Value> = content_rows
        .iter()
        .map(|r| json!({
            "type": "content",
            "marker_slug": r.try_get::<String, _>("marker_id").unwrap_or_default(),
            "content_type": r.try_get::<String, _>("content_type").unwrap_or_default(),
            "title": r.try_get::<String, _>("title").unwrap_or_default(),
            "snippet": r.try_get::<String, _>("body_text").unwrap_or_default().chars().take(200).collect::<String>(),
        }))
        .collect();

    // Search marker relations
    let rel_rows = sqlx::query(
        r#"SELECT marker_slug_a, marker_slug_b, description
           FROM marker_relations
           WHERE LOWER(description) LIKE $1
           LIMIT 10"#,
    )
    .bind(&q)
    .fetch_all(pool.get_ref())
    .await?;

    let rel_results: Vec<serde_json::Value> = rel_rows
        .iter()
        .map(|r| {
            json!({
                "type": "relation",
                "marker_a": r.try_get::<String, _>("marker_slug_a").unwrap_or_default(),
                "marker_b": r.try_get::<String, _>("marker_slug_b").unwrap_or_default(),
                "description": r.try_get::<String, _>("description").unwrap_or_default(),
            })
        })
        .collect();

    // Search protocol effects
    let proto_rows = sqlx::query(
        r#"SELECT protocol_slug, marker_slug, detail
           FROM protocol_effects
           WHERE LOWER(detail) LIKE $1
           LIMIT 10"#,
    )
    .bind(&q)
    .fetch_all(pool.get_ref())
    .await?;

    let proto_results: Vec<serde_json::Value> = proto_rows
        .iter()
        .map(|r| {
            json!({
                "type": "protocol_effect",
                "protocol": r.try_get::<String, _>("protocol_slug").unwrap_or_default(),
                "marker_slug": r.try_get::<String, _>("marker_slug").unwrap_or_default(),
                "detail": r.try_get::<String, _>("detail").unwrap_or_default(),
            })
        })
        .collect();

    let mut results = content_results;
    results.extend(rel_results);
    results.extend(proto_results);

    Ok(HttpResponse::Ok().json(json!({
        "data": results,
        "error": null
    })))
}

// ── GET /knowledge/cohort ──────────────────────────────────────────────────────

pub async fn cohort_stub() -> Result<HttpResponse, AppError> {
    Ok(HttpResponse::NotImplemented().json(json!({
        "data": null,
        "error": {
            "code": "not_implemented",
            "message": "Cohort comparison launching soon"
        }
    })))
}
