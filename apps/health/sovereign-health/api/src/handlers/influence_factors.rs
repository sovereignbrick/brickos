// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::{error::AppError, middleware::auth::AuthenticatedUser};

// ── Query params ─────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct ListQuery {
    /// "true" (default), "false", or "all"
    pub active: Option<String>,
}

// ── GET /influence-factors ──────────────────────────────────────────────────

pub async fn list(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    query: web::Query<ListQuery>,
) -> Result<HttpResponse, AppError> {
    let active_filter = query.active.as_deref().unwrap_or("true");

    let rows = match active_filter {
        "false" => {
            sqlx::query(
                r#"SELECT id, name, category, factor_type, dosage, frequency, form, timing,
                          prescriber, start_date, end_date, reason, notes, is_active, source,
                          original_images, ai_extracted_data, created_at, updated_at
                   FROM influence_factors
                   WHERE user_id = $1 AND is_active = false
                   ORDER BY name"#,
            )
            .bind(auth.user_id)
            .fetch_all(pool.get_ref())
            .await?
        }
        "all" => {
            sqlx::query(
                r#"SELECT id, name, category, factor_type, dosage, frequency, form, timing,
                          prescriber, start_date, end_date, reason, notes, is_active, source,
                          original_images, ai_extracted_data, created_at, updated_at
                   FROM influence_factors
                   WHERE user_id = $1
                   ORDER BY is_active DESC, name"#,
            )
            .bind(auth.user_id)
            .fetch_all(pool.get_ref())
            .await?
        }
        _ => {
            sqlx::query(
                r#"SELECT id, name, category, factor_type, dosage, frequency, form, timing,
                          prescriber, start_date, end_date, reason, notes, is_active, source,
                          original_images, ai_extracted_data, created_at, updated_at
                   FROM influence_factors
                   WHERE user_id = $1 AND is_active = true
                   ORDER BY name"#,
            )
            .bind(auth.user_id)
            .fetch_all(pool.get_ref())
            .await?
        }
    };

    let factor_ids: Vec<Uuid> = rows
        .iter()
        .filter_map(|r| r.try_get::<Uuid, _>("id").ok())
        .collect();

    // Fetch all ingredients for these factors in one query
    let ingredients = if factor_ids.is_empty() {
        vec![]
    } else {
        sqlx::query(
            r#"SELECT id, factor_id, name, amount, unit, role, sort_order, notes, created_at
               FROM influence_factor_ingredients
               WHERE factor_id = ANY($1)
               ORDER BY sort_order"#,
        )
        .bind(&factor_ids)
        .fetch_all(pool.get_ref())
        .await?
    };

    // Group ingredients by factor_id
    let mut ingredient_map: std::collections::HashMap<Uuid, Vec<serde_json::Value>> =
        std::collections::HashMap::new();
    for ing in &ingredients {
        let factor_id: Uuid = ing.try_get("factor_id").unwrap_or_default();
        ingredient_map.entry(factor_id).or_default().push(json!({
            "id": ing.try_get::<Uuid, _>("id").unwrap_or_default(),
            "name": ing.try_get::<String, _>("name").unwrap_or_default(),
            "amount": ing.try_get::<Option<String>, _>("amount").ok().flatten(),
            "unit": ing.try_get::<Option<String>, _>("unit").ok().flatten(),
            "role": ing.try_get::<Option<String>, _>("role").ok().flatten().unwrap_or_else(|| "active".to_string()),
            "sort_order": ing.try_get::<i32, _>("sort_order").unwrap_or(0),
            "notes": ing.try_get::<Option<String>, _>("notes").ok().flatten(),
        }));
    }

    let factors: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            let id: Uuid = r.try_get("id").unwrap_or_default();
            let mut val = factor_to_json(r);
            if let serde_json::Value::Object(ref mut map) = val {
                map.insert(
                    "ingredients".to_string(),
                    json!(ingredient_map.get(&id).cloned().unwrap_or_default()),
                );
            }
            val
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": factors,
        "error": null
    })))
}

// ── GET /influence-factors/{id} ─────────────────────────────────────────────

pub async fn get_one(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    let row = sqlx::query(
        r#"SELECT id, name, category, factor_type, dosage, frequency, form, timing,
                  prescriber, start_date, end_date, reason, notes, is_active, source,
                  original_images, ai_extracted_data, created_at, updated_at
           FROM influence_factors
           WHERE id = $1 AND user_id = $2"#,
    )
    .bind(id)
    .bind(auth.user_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or(AppError::NotFound)?;

    let ingredients = sqlx::query(
        r#"SELECT id, factor_id, name, amount, unit, role, sort_order, notes, created_at
           FROM influence_factor_ingredients
           WHERE factor_id = $1
           ORDER BY sort_order"#,
    )
    .bind(id)
    .fetch_all(pool.get_ref())
    .await?;

    let ing_json: Vec<serde_json::Value> = ingredients
        .iter()
        .map(|ing| {
            json!({
                "id": ing.try_get::<Uuid, _>("id").unwrap_or_default(),
                "name": ing.try_get::<String, _>("name").unwrap_or_default(),
                "amount": ing.try_get::<Option<String>, _>("amount").ok().flatten(),
                "unit": ing.try_get::<Option<String>, _>("unit").ok().flatten(),
                "role": ing.try_get::<Option<String>, _>("role").ok().flatten().unwrap_or_else(|| "active".to_string()),
                "sort_order": ing.try_get::<i32, _>("sort_order").unwrap_or(0),
                "notes": ing.try_get::<Option<String>, _>("notes").ok().flatten(),
            })
        })
        .collect();

    let mut val = factor_to_json(&row);
    if let serde_json::Value::Object(ref mut map) = val {
        map.insert("ingredients".to_string(), json!(ing_json));
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": val,
        "error": null
    })))
}

// ── POST /influence-factors ─────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct IngredientInput {
    pub name: String,
    pub amount: Option<String>,
    pub unit: Option<String>,
    pub role: Option<String>,
    pub sort_order: Option<i32>,
    pub notes: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateFactorRequest {
    pub name: String,
    pub category: Option<String>,
    pub factor_type: Option<String>,
    pub dosage: Option<String>,
    pub frequency: Option<String>,
    pub form: Option<String>,
    pub timing: Option<String>,
    pub prescriber: Option<String>,
    pub start_date: Option<chrono::NaiveDate>,
    pub end_date: Option<chrono::NaiveDate>,
    pub reason: Option<String>,
    pub notes: Option<String>,
    pub source: Option<String>,
    pub original_images: Option<serde_json::Value>,
    pub ai_extracted_data: Option<serde_json::Value>,
    pub ingredients: Option<Vec<IngredientInput>>,
}

pub async fn create(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    body: web::Json<CreateFactorRequest>,
) -> Result<HttpResponse, AppError> {
    let name = body.name.trim();
    if name.is_empty() {
        return Err(AppError::Validation("name is required".to_string()));
    }
    if name.len() > 200 {
        return Err(AppError::Validation(
            "name must be 200 characters or fewer".to_string(),
        ));
    }

    // Tier check: count vs max_medications (same column, renamed conceptually)
    let current_count: i32 = sqlx::query_scalar(
        "SELECT COUNT(*)::int4 FROM influence_factors WHERE user_id = $1 AND is_active = true",
    )
    .bind(auth.user_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    crate::services::tier::check_count_limit(
        pool.get_ref(),
        auth.user_id,
        "medications",
        current_count,
    )
    .await?;

    let category = body.category.as_deref().unwrap_or("supplement").to_string();
    let factor_type = body
        .factor_type
        .as_deref()
        .unwrap_or("medication")
        .to_string();
    let source = body.source.as_deref().unwrap_or("manual").to_string();

    let row = sqlx::query(
        r#"INSERT INTO influence_factors
           (user_id, name, category, factor_type, dosage, frequency, form, timing,
            prescriber, start_date, end_date, reason, notes, source,
            original_images, ai_extracted_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           RETURNING id, created_at"#,
    )
    .bind(auth.user_id)
    .bind(name)
    .bind(&category)
    .bind(&factor_type)
    .bind(&body.dosage)
    .bind(&body.frequency)
    .bind(&body.form)
    .bind(&body.timing)
    .bind(&body.prescriber)
    .bind(body.start_date)
    .bind(body.end_date)
    .bind(&body.reason)
    .bind(&body.notes)
    .bind(&source)
    .bind(&body.original_images)
    .bind(&body.ai_extracted_data)
    .fetch_one(pool.get_ref())
    .await?;

    let id: Uuid = row.try_get("id").map_err(|_| AppError::Internal)?;
    let created_at: chrono::DateTime<Utc> =
        row.try_get("created_at").unwrap_or_else(|_| Utc::now());

    // Insert ingredients if provided
    if let Some(ref ingredients) = body.ingredients {
        for (idx, ing) in ingredients.iter().enumerate() {
            let ing_name = ing.name.trim();
            if ing_name.is_empty() {
                continue;
            }
            sqlx::query(
                r#"INSERT INTO influence_factor_ingredients
                   (factor_id, name, amount, unit, role, sort_order, notes)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)"#,
            )
            .bind(id)
            .bind(ing_name)
            .bind(&ing.amount)
            .bind(&ing.unit)
            .bind(ing.role.as_deref().unwrap_or("active"))
            .bind(ing.sort_order.unwrap_or(idx as i32))
            .bind(&ing.notes)
            .execute(pool.get_ref())
            .await?;
        }
    }

    Ok(HttpResponse::Created().json(json!({
        "data": {
            "id": id,
            "created_at": created_at.to_rfc3339()
        },
        "error": null
    })))
}

// ── PUT /influence-factors/{id} ─────────────────────────────────────────────

#[derive(Deserialize)]
pub struct UpdateFactorRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub factor_type: Option<String>,
    pub dosage: Option<String>,
    pub frequency: Option<String>,
    pub form: Option<String>,
    pub timing: Option<String>,
    pub prescriber: Option<String>,
    pub start_date: Option<chrono::NaiveDate>,
    pub end_date: Option<chrono::NaiveDate>,
    pub reason: Option<String>,
    pub notes: Option<String>,
    pub source: Option<String>,
    pub original_images: Option<serde_json::Value>,
    pub ai_extracted_data: Option<serde_json::Value>,
    pub ingredients: Option<Vec<IngredientInput>>,
}

pub async fn update(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateFactorRequest>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    if let Some(ref name) = body.name {
        let name = name.trim();
        if name.is_empty() {
            return Err(AppError::Validation("name cannot be empty".to_string()));
        }
        if name.len() > 200 {
            return Err(AppError::Validation(
                "name must be 200 characters or fewer".to_string(),
            ));
        }
    }

    let result = sqlx::query(
        r#"UPDATE influence_factors SET
           name = COALESCE($1, name),
           category = COALESCE($2, category),
           factor_type = COALESCE($3, factor_type),
           dosage = COALESCE($4, dosage),
           frequency = COALESCE($5, frequency),
           form = COALESCE($6, form),
           timing = COALESCE($7, timing),
           prescriber = COALESCE($8, prescriber),
           start_date = COALESCE($9, start_date),
           end_date = COALESCE($10, end_date),
           reason = COALESCE($11, reason),
           notes = COALESCE($12, notes),
           source = COALESCE($13, source),
           original_images = COALESCE($14, original_images),
           ai_extracted_data = COALESCE($15, ai_extracted_data),
           updated_at = NOW()
           WHERE id = $16 AND user_id = $17"#,
    )
    .bind(&body.name)
    .bind(&body.category)
    .bind(&body.factor_type)
    .bind(&body.dosage)
    .bind(&body.frequency)
    .bind(&body.form)
    .bind(&body.timing)
    .bind(&body.prescriber)
    .bind(body.start_date)
    .bind(body.end_date)
    .bind(&body.reason)
    .bind(&body.notes)
    .bind(&body.source)
    .bind(&body.original_images)
    .bind(&body.ai_extracted_data)
    .bind(id)
    .bind(auth.user_id)
    .execute(pool.get_ref())
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    // Replace ingredients if provided
    if let Some(ref ingredients) = body.ingredients {
        // Delete existing ingredients
        sqlx::query("DELETE FROM influence_factor_ingredients WHERE factor_id = $1")
            .bind(id)
            .execute(pool.get_ref())
            .await?;

        // Insert new ingredients
        for (idx, ing) in ingredients.iter().enumerate() {
            let ing_name = ing.name.trim();
            if ing_name.is_empty() {
                continue;
            }
            sqlx::query(
                r#"INSERT INTO influence_factor_ingredients
                   (factor_id, name, amount, unit, role, sort_order, notes)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)"#,
            )
            .bind(id)
            .bind(ing_name)
            .bind(&ing.amount)
            .bind(&ing.unit)
            .bind(ing.role.as_deref().unwrap_or("active"))
            .bind(ing.sort_order.unwrap_or(idx as i32))
            .bind(&ing.notes)
            .execute(pool.get_ref())
            .await?;
        }
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": { "updated": true },
        "error": null
    })))
}

// ── DELETE /influence-factors/{id} (soft archive) ───────────────────────────

pub async fn archive(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    let result = sqlx::query(
        r#"UPDATE influence_factors SET
           is_active = false, updated_at = NOW()
           WHERE id = $1 AND user_id = $2"#,
    )
    .bind(id)
    .bind(auth.user_id)
    .execute(pool.get_ref())
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": { "archived": true },
        "error": null
    })))
}

// ── PUT /influence-factors/{id}/restore ─────────────────────────────────────

pub async fn restore(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    let result = sqlx::query(
        r#"UPDATE influence_factors SET
           is_active = true, updated_at = NOW()
           WHERE id = $1 AND user_id = $2"#,
    )
    .bind(id)
    .bind(auth.user_id)
    .execute(pool.get_ref())
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(HttpResponse::Ok().json(json!({
        "data": { "restored": true },
        "error": null
    })))
}

// ── Helpers ──────────────────────────────────────────────────────────────────

fn factor_to_json(r: &sqlx::postgres::PgRow) -> serde_json::Value {
    json!({
        "id": r.try_get::<Uuid, _>("id").unwrap_or_default(),
        "name": r.try_get::<String, _>("name").unwrap_or_default(),
        "category": r.try_get::<String, _>("category").unwrap_or_else(|_| "supplement".to_string()),
        "factor_type": r.try_get::<String, _>("factor_type").unwrap_or_else(|_| "medication".to_string()),
        "dosage": r.try_get::<Option<String>, _>("dosage").ok().flatten(),
        "frequency": r.try_get::<Option<String>, _>("frequency").ok().flatten(),
        "form": r.try_get::<Option<String>, _>("form").ok().flatten(),
        "timing": r.try_get::<Option<String>, _>("timing").ok().flatten(),
        "prescriber": r.try_get::<Option<String>, _>("prescriber").ok().flatten(),
        "start_date": r.try_get::<Option<chrono::NaiveDate>, _>("start_date")
            .ok().flatten().map(|d| d.to_string()),
        "end_date": r.try_get::<Option<chrono::NaiveDate>, _>("end_date")
            .ok().flatten().map(|d| d.to_string()),
        "reason": r.try_get::<Option<String>, _>("reason").ok().flatten(),
        "notes": r.try_get::<Option<String>, _>("notes").ok().flatten(),
        "is_active": r.try_get::<bool, _>("is_active").unwrap_or(true),
        "source": r.try_get::<Option<String>, _>("source").ok().flatten().unwrap_or_else(|| "manual".to_string()),
        "original_images": r.try_get::<Option<serde_json::Value>, _>("original_images").ok().flatten(),
        "ai_extracted_data": r.try_get::<Option<serde_json::Value>, _>("ai_extracted_data").ok().flatten(),
        "created_at": r.try_get::<chrono::DateTime<Utc>, _>("created_at")
            .unwrap_or_else(|_| Utc::now()).to_rfc3339(),
        "updated_at": r.try_get::<chrono::DateTime<Utc>, _>("updated_at")
            .unwrap_or_else(|_| Utc::now()).to_rfc3339(),
    })
}
