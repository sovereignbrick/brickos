// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/

use actix_web::{web, HttpResponse};
use serde::Deserialize;
use serde_json::json;
use sqlx::{PgPool, Row};
use std::time::Instant;

use crate::{error::AppError, middleware::auth::AuthenticatedUser};

// ── Query parameter structs ─────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct SearchParams {
    pub q: String,
    /// Filter by entity_type; "all" returns everything (renamed from `type` to avoid keyword)
    #[serde(default = "default_type_filter")]
    pub type_filter: String,
    #[serde(default = "default_locale")]
    pub locale: String,
    #[serde(default = "default_limit")]
    pub limit: i32,
    #[serde(default)]
    pub offset: i32,
}

#[derive(Deserialize)]
pub struct SuggestParams {
    pub q: String,
    #[serde(default = "default_locale")]
    pub locale: String,
    #[serde(default = "default_suggest_limit")]
    pub limit: i32,
}

fn default_type_filter() -> String {
    "all".into()
}
fn default_locale() -> String {
    "en".into()
}
fn default_limit() -> i32 {
    20
}
fn default_suggest_limit() -> i32 {
    8
}

/// Returns the PostgreSQL text search configuration name for a locale.
fn ts_config(locale: &str) -> &'static str {
    match locale {
        "de" => "german",
        _ => "english",
    }
}

// ── GET /api/v1/search ──────────────────────────────────────────────────────────

pub async fn search(
    pool: web::Data<PgPool>,
    params: web::Query<SearchParams>,
    auth: Option<AuthenticatedUser>,
) -> Result<HttpResponse, AppError> {
    let started = Instant::now();

    // Validate
    let q = params.q.trim();
    if q.len() < 2 {
        return Err(AppError::Validation(
            "Search query must be at least 2 characters".into(),
        ));
    }

    let locale = &params.locale;
    let limit = params.limit.clamp(1, 50);
    let offset = params.offset.max(0);
    let type_filter = &params.type_filter;
    let config = ts_config(locale);

    // Build the public search results.
    // Search across BOTH locales (bilingual): try user's locale config first,
    // fall back to opposite locale. Deduplicate by entity_id, prefer user's locale.
    let other_config = if config == "english" {
        "german"
    } else {
        "english"
    };

    let results = if type_filter == "all" {
        sqlx::query(
            r#"SELECT entity_type, entity_id, title, subtitle, snippet, url_path,
                      external_url, category_weight, metadata, parent_marker_slug, requires_auth, score
               FROM (
                 SELECT DISTINCT ON (entity_type, entity_id)
                        entity_type, entity_id, title, subtitle, snippet, url_path,
                        external_url, category_weight, metadata, parent_marker_slug, requires_auth,
                        locale,
                        GREATEST(
                          ts_rank_cd(tsv_document, plainto_tsquery($1::regconfig, $2)),
                          ts_rank_cd(tsv_document, plainto_tsquery($5::regconfig, $2))
                        ) * category_weight AS score
                 FROM search_index
                 WHERE (tsv_document @@ plainto_tsquery($1::regconfig, $2)
                    OR  tsv_document @@ plainto_tsquery($5::regconfig, $2))
                   AND ($4 OR requires_auth = false)
                 ORDER BY entity_type, entity_id,
                          CASE WHEN locale = $3 THEN 0 ELSE 1 END
               ) deduped
               ORDER BY score DESC
               LIMIT $6 OFFSET $7"#,
        )
        .bind(config)
        .bind(q)
        .bind(locale)
        .bind(auth.is_some())
        .bind(other_config)
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(pool.get_ref())
        .await?
    } else {
        sqlx::query(
            r#"SELECT entity_type, entity_id, title, subtitle, snippet, url_path,
                      external_url, category_weight, metadata, parent_marker_slug, requires_auth, score
               FROM (
                 SELECT DISTINCT ON (entity_type, entity_id)
                        entity_type, entity_id, title, subtitle, snippet, url_path,
                        external_url, category_weight, metadata, parent_marker_slug, requires_auth,
                        locale,
                        GREATEST(
                          ts_rank_cd(tsv_document, plainto_tsquery($1::regconfig, $2)),
                          ts_rank_cd(tsv_document, plainto_tsquery($6::regconfig, $2))
                        ) * category_weight AS score
                 FROM search_index
                 WHERE (tsv_document @@ plainto_tsquery($1::regconfig, $2)
                    OR  tsv_document @@ plainto_tsquery($6::regconfig, $2))
                   AND entity_type = $4
                   AND ($5 OR requires_auth = false)
                 ORDER BY entity_type, entity_id,
                          CASE WHEN locale = $3 THEN 0 ELSE 1 END
               ) deduped
               ORDER BY score DESC
               LIMIT $7 OFFSET $8"#,
        )
        .bind(config)
        .bind(q)
        .bind(locale)
        .bind(type_filter.as_str())
        .bind(auth.is_some())
        .bind(other_config)
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(pool.get_ref())
        .await?
    };

    // Also query user_search_index for authenticated users
    let user_results = if let Some(ref auth) = auth {
        let rows = sqlx::query(
            r#"SELECT entity_type, entity_id::text AS entity_id, title, snippet, url_path,
                      ts_rank_cd(tsv_document, plainto_tsquery($1::regconfig, $2)) AS score
               FROM user_search_index
               WHERE tsv_document @@ plainto_tsquery($1::regconfig, $2)
                 AND user_id = $3
               ORDER BY score DESC
               LIMIT $4"#,
        )
        .bind(config)
        .bind(q)
        .bind(auth.user_id)
        .bind(limit as i64)
        .fetch_all(pool.get_ref())
        .await?;

        rows.iter()
            .map(|r| {
                json!({
                    "entity_type": r.try_get::<String, _>("entity_type").unwrap_or_default(),
                    "entity_id": r.try_get::<String, _>("entity_id").unwrap_or_default(),
                    "title": r.try_get::<String, _>("title").unwrap_or_default(),
                    "snippet": r.try_get::<Option<String>, _>("snippet").ok().flatten(),
                    "url_path": r.try_get::<Option<String>, _>("url_path").ok().flatten(),
                    "score": r.try_get::<f32, _>("score").unwrap_or(0.0),
                    "source": "user",
                })
            })
            .collect::<Vec<_>>()
    } else {
        vec![]
    };

    // Compute facets (counts by entity_type, deduplicated across locales)
    let facet_rows = if type_filter == "all" {
        sqlx::query(
            r#"SELECT entity_type, COUNT(DISTINCT entity_id) AS cnt
               FROM search_index
               WHERE (tsv_document @@ plainto_tsquery($1::regconfig, $2)
                  OR  tsv_document @@ plainto_tsquery($4::regconfig, $2))
                 AND ($3 OR requires_auth = false)
               GROUP BY entity_type
               ORDER BY cnt DESC"#,
        )
        .bind(config)
        .bind(q)
        .bind(auth.is_some())
        .bind(other_config)
        .fetch_all(pool.get_ref())
        .await?
    } else {
        vec![]
    };

    let facets: Vec<serde_json::Value> = facet_rows
        .iter()
        .map(|r| {
            json!({
                "type": r.try_get::<String, _>("entity_type").unwrap_or_default(),
                "count": r.try_get::<i64, _>("cnt").unwrap_or(0),
            })
        })
        .collect();

    // Build result items with optional user_context for markers
    let mut items: Vec<serde_json::Value> = Vec::with_capacity(results.len());

    // Collect marker slugs from results for batch user_context lookup
    let marker_slugs: Vec<String> = results
        .iter()
        .filter(|r| {
            let et: String = r.try_get("entity_type").unwrap_or_default();
            et == "marker" || et == "calculated_marker"
        })
        .map(|r| r.try_get::<String, _>("entity_id").unwrap_or_default())
        .collect();

    // If authenticated and we have marker results, fetch user_context in one query
    let user_context_map = if let Some(ref auth) = auth {
        if !marker_slugs.is_empty() {
            fetch_user_marker_context(pool.get_ref(), auth.user_id, &marker_slugs).await?
        } else {
            std::collections::HashMap::new()
        }
    } else {
        std::collections::HashMap::new()
    };

    // Blind spots: markers the user hasn't measured
    let blind_spots = if let Some(ref auth) = auth {
        if !marker_slugs.is_empty() {
            compute_blind_spots(pool.get_ref(), auth.user_id, &marker_slugs).await?
        } else {
            vec![]
        }
    } else {
        vec![]
    };

    for row in &results {
        let entity_type: String = row.try_get("entity_type").unwrap_or_default();
        let entity_id: String = row.try_get("entity_id").unwrap_or_default();

        let mut item = json!({
            "entity_type": entity_type,
            "entity_id": entity_id,
            "title": row.try_get::<String, _>("title").unwrap_or_default(),
            "subtitle": row.try_get::<Option<String>, _>("subtitle").ok().flatten(),
            "snippet": row.try_get::<Option<String>, _>("snippet").ok().flatten(),
            "url_path": row.try_get::<Option<String>, _>("url_path").ok().flatten(),
            "external_url": row.try_get::<Option<String>, _>("external_url").ok().flatten(),
            "score": row.try_get::<f32, _>("score").unwrap_or(0.0),
            "metadata": row.try_get::<Option<serde_json::Value>, _>("metadata").ok().flatten(),
            "parent_marker_slug": row.try_get::<Option<String>, _>("parent_marker_slug").ok().flatten(),
        });

        // Attach user_context for marker results
        if (entity_type == "marker" || entity_type == "calculated_marker") && auth.is_some() {
            if let Some(ctx) = user_context_map.get(&entity_id) {
                item.as_object_mut()
                    .map(|m| m.insert("user_context".into(), ctx.clone()));
            }
        }

        items.push(item);
    }

    // Dr Alex CTA: if any result is a marker, suggest asking Dr Alex
    let dr_alex_cta = if auth.is_some()
        && results.iter().any(|r| {
            let et: String = r.try_get("entity_type").unwrap_or_default();
            et == "marker" || et == "calculated_marker"
        }) {
        Some(json!({
            "message": "Ask Dr. Alex about these markers",
            "url": "/doctor-chat",
        }))
    } else {
        None
    };

    // Login CTA for unauthenticated users
    let login_cta = if auth.is_none() {
        Some(json!({
            "message": "Sign in to see your personal health data in search results",
            "url": "/auth/login",
        }))
    } else {
        None
    };

    let duration_ms = started.elapsed().as_millis();
    let result_count = items.len() + user_results.len();
    tracing::info!(
        duration_ms = duration_ms as u64,
        result_count = result_count,
        locale = locale.as_str(),
        "search_query"
    );

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "results": items,
            "user_results": user_results,
            "facets": facets,
            "blind_spots": blind_spots,
            "dr_alex_cta": dr_alex_cta,
            "login_cta": login_cta,
            "total_results": result_count,
            "limit": limit,
            "offset": offset,
        },
        "error": null
    })))
}

// ── GET /api/v1/search/suggest ──────────────────────────────────────────────────

pub async fn suggest(
    pool: web::Data<PgPool>,
    params: web::Query<SuggestParams>,
    auth: Option<AuthenticatedUser>,
) -> Result<HttpResponse, AppError> {
    let started = Instant::now();

    let q = params.q.trim();
    if q.is_empty() {
        return Err(AppError::Validation(
            "Search query must be at least 1 character".into(),
        ));
    }

    let locale = &params.locale;
    let limit = params.limit.clamp(1, 20);
    let config = ts_config(locale);

    // Sanitise the query for prefix matching: remove special characters,
    // split into words, append :* to each for prefix matching
    let sanitised: String = q
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect();
    let prefix_query: String = sanitised
        .split_whitespace()
        .map(|w| format!("{}:*", w))
        .collect::<Vec<_>>()
        .join(" & ");

    if prefix_query.is_empty() {
        return Ok(HttpResponse::Ok().json(json!({
            "data": { "suggestions": [] },
            "error": null
        })));
    }

    // Bilingual suggest: search both locale configs, prefer user's locale
    let other_config = if config == "english" {
        "german"
    } else {
        "english"
    };

    let rows = sqlx::query(
        r#"SELECT entity_type, title, url_path, score
           FROM (
             SELECT DISTINCT ON (entity_type, entity_id)
                    entity_type, entity_id, title, url_path,
                    GREATEST(
                      ts_rank_cd(tsv_document, to_tsquery($1::regconfig, $2)),
                      ts_rank_cd(tsv_document, to_tsquery($5::regconfig, $2))
                    ) * category_weight AS score
             FROM search_index
             WHERE (tsv_document @@ to_tsquery($1::regconfig, $2)
                OR  tsv_document @@ to_tsquery($5::regconfig, $2))
               AND ($4 OR requires_auth = false)
             ORDER BY entity_type, entity_id,
                      CASE WHEN locale = $3 THEN 0 ELSE 1 END
           ) deduped
           ORDER BY score DESC
           LIMIT $6"#,
    )
    .bind(config)
    .bind(&prefix_query)
    .bind(locale)
    .bind(auth.is_some())
    .bind(other_config)
    .bind(limit as i64)
    .fetch_all(pool.get_ref())
    .await?;

    let suggestions: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "text": r.try_get::<String, _>("title").unwrap_or_default(),
                "type": r.try_get::<String, _>("entity_type").unwrap_or_default(),
                "url": r.try_get::<Option<String>, _>("url_path").ok().flatten(),
            })
        })
        .collect();

    let duration_ms = started.elapsed().as_millis();
    tracing::info!(
        duration_ms = duration_ms as u64,
        result_count = suggestions.len(),
        "search_suggest"
    );

    Ok(HttpResponse::Ok().json(json!({
        "data": { "suggestions": suggestions },
        "error": null
    })))
}

// ── POST /api/v1/search/reindex ─────────────────────────────────────────────────

pub async fn reindex(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    if auth.role != "admin" {
        return Err(AppError::Forbidden);
    }

    let started = Instant::now();

    // Clear and rebuild the search index
    sqlx::query("DELETE FROM search_index")
        .execute(pool.get_ref())
        .await?;

    let total = seed_search_index(pool.get_ref()).await?;

    let duration_ms = started.elapsed().as_millis();
    tracing::info!(
        duration_ms = duration_ms as u64,
        rows_inserted = total,
        "search_reindex"
    );

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "rows_indexed": total,
            "duration_ms": duration_ms,
        },
        "error": null
    })))
}

// ── Helper: seed all search index data ──────────────────────────────────────────

async fn seed_search_index(pool: &PgPool) -> Result<i64, AppError> {
    let mut total: i64 = 0;

    // Markers
    let r = sqlx::query(
        r#"INSERT INTO search_index (entity_type, entity_id, locale, title, subtitle, snippet, url_path, category_weight, tsv_document, metadata, parent_marker_slug)
           SELECT 'marker', m.marker_slug, mt.locale, mt.name,
             (SELECT zt.name FROM zone_translations zt JOIN zones z ON z.id = zt.zone_id JOIN zone_markers zm ON zm.zone_slug = z.zone_slug WHERE zm.marker_slug = m.marker_slug AND zt.locale = mt.locale LIMIT 1),
             COALESCE(mt.description, mt.tooltip, ''),
             '/markers/' || m.marker_slug, 1.5,
             setweight(to_tsvector((CASE WHEN mt.locale = 'de' THEN 'german' ELSE 'english' END)::regconfig, COALESCE(mt.name, '')), 'A') ||
             setweight(to_tsvector((CASE WHEN mt.locale = 'de' THEN 'german' ELSE 'english' END)::regconfig, COALESCE(mt.description, '') || ' ' || COALESCE(mt.tooltip, '')), 'B') ||
             setweight(to_tsvector((CASE WHEN mt.locale = 'de' THEN 'german' ELSE 'english' END)::regconfig, COALESCE(mt.why_it_matters, '') || ' ' || COALESCE(mt.when_to_worry, '')), 'C'),
             jsonb_build_object('source_type', m.source_type, 'unit_canonical', m.unit_canonical, 'loinc_code', m.loinc_code, 'zone_id', m.zone_id::text),
             m.marker_slug
           FROM markers m JOIN marker_translations mt ON mt.marker_id = m.id
           ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
             title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, snippet = EXCLUDED.snippet,
             tsv_document = EXCLUDED.tsv_document, metadata = EXCLUDED.metadata, updated_at = now()"#,
    )
    .execute(pool)
    .await?;
    total += r.rows_affected() as i64;

    // Calculated markers
    let r = sqlx::query(
        r#"INSERT INTO search_index (entity_type, entity_id, locale, title, subtitle, snippet, url_path, category_weight, tsv_document, metadata)
           SELECT 'calculated_marker', cm.marker_slug, t.locale,
             COALESCE(t.name, cm.marker_name),
             (SELECT zt.name FROM zone_translations zt JOIN zones z ON z.id = zt.zone_id JOIN zone_markers zm ON zm.zone_slug = z.zone_slug WHERE zm.marker_slug = cm.marker_slug AND zt.locale = t.locale LIMIT 1),
             cm.formula_description, '/markers/' || cm.marker_slug, 1.5,
             setweight(to_tsvector((CASE WHEN t.locale = 'de' THEN 'german' ELSE 'english' END)::regconfig, COALESCE(t.name, cm.marker_name, '')), 'A') ||
             setweight(to_tsvector((CASE WHEN t.locale = 'de' THEN 'german' ELSE 'english' END)::regconfig, COALESCE(cm.formula_description, '')), 'B') ||
             setweight(to_tsvector((CASE WHEN t.locale = 'de' THEN 'german' ELSE 'english' END)::regconfig, COALESCE(t.description, '')), 'C'),
             jsonb_build_object('source_type', cm.source_type, 'base_markers', cm.base_markers_required, 'formula', cm.formula_description)
           FROM calculated_markers cm LEFT JOIN marker_translations t ON t.marker_id = cm.id
           WHERE t.locale IS NOT NULL
           ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
             title = EXCLUDED.title, tsv_document = EXCLUDED.tsv_document, metadata = EXCLUDED.metadata, updated_at = now()"#,
    )
    .execute(pool)
    .await?;
    total += r.rows_affected() as i64;

    // Zones
    let r = sqlx::query(
        r#"INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, url_path, category_weight, tsv_document)
           SELECT 'zone', z.zone_slug, zt.locale, zt.name,
             COALESCE(zt.short_description, zt.description, ''),
             '/dashboard#' || z.zone_slug, 1.3,
             setweight(to_tsvector((CASE WHEN zt.locale = 'de' THEN 'german' ELSE 'english' END)::regconfig, COALESCE(zt.name, '')), 'A') ||
             setweight(to_tsvector((CASE WHEN zt.locale = 'de' THEN 'german' ELSE 'english' END)::regconfig, COALESCE(zt.description, '') || ' ' || COALESCE(zt.short_description, '')), 'B')
           FROM zones z JOIN zone_translations zt ON zt.zone_id = z.id
           ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
             title = EXCLUDED.title, snippet = EXCLUDED.snippet, tsv_document = EXCLUDED.tsv_document, updated_at = now()"#,
    )
    .execute(pool)
    .await?;
    total += r.rows_affected() as i64;

    // Content tiles
    let r = sqlx::query(
        r#"INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, url_path, category_weight, tsv_document, parent_marker_slug)
           SELECT 'content', mc.marker_id || '-' || mc.content_type, mc.language, mc.title,
             LEFT(mc.body_text, 300),
             '/markers/' || mc.marker_id || '#' || mc.content_type, 1.0,
             setweight(to_tsvector((CASE WHEN mc.language = 'de' THEN 'german' ELSE 'english' END)::regconfig, COALESCE(mc.title, '')), 'A') ||
             setweight(to_tsvector((CASE WHEN mc.language = 'de' THEN 'german' ELSE 'english' END)::regconfig, COALESCE(mc.body_text, '')), 'B'),
             mc.marker_id
           FROM marker_content mc
           ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
             title = EXCLUDED.title, snippet = EXCLUDED.snippet, tsv_document = EXCLUDED.tsv_document, parent_marker_slug = EXCLUDED.parent_marker_slug, updated_at = now()"#,
    )
    .execute(pool)
    .await?;
    total += r.rows_affected() as i64;

    // Foods (EN)
    let r = sqlx::query(
        r#"INSERT INTO search_index (entity_type, entity_id, locale, title, url_path, category_weight, tsv_document, metadata, parent_marker_slug)
           SELECT 'food', mf.id::text, 'en', mf.food_name,
             '/markers/' || mf.marker_id || '#foods', 1.2,
             setweight(to_tsvector('english', COALESCE(mf.food_name, '')), 'A') ||
             setweight(to_tsvector('english', COALESCE(mf.food_category, '')), 'B'),
             jsonb_build_object('food_category', mf.food_category), mf.marker_id
           FROM marker_foods mf
           ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
             title = EXCLUDED.title, tsv_document = EXCLUDED.tsv_document, metadata = EXCLUDED.metadata, updated_at = now()"#,
    )
    .execute(pool)
    .await?;
    total += r.rows_affected() as i64;

    // Foods (DE)
    let r = sqlx::query(
        r#"INSERT INTO search_index (entity_type, entity_id, locale, title, url_path, category_weight, tsv_document, metadata, parent_marker_slug)
           SELECT 'food', mf.id::text, 'de', mf.food_name_de,
             '/markers/' || mf.marker_id || '#foods', 1.2,
             setweight(to_tsvector('german', COALESCE(mf.food_name_de, '')), 'A') ||
             setweight(to_tsvector('german', COALESCE(mf.food_category, '')), 'B'),
             jsonb_build_object('food_category', mf.food_category), mf.marker_id
           FROM marker_foods mf WHERE mf.food_name_de IS NOT NULL
           ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
             title = EXCLUDED.title, tsv_document = EXCLUDED.tsv_document, metadata = EXCLUDED.metadata, updated_at = now()"#,
    )
    .execute(pool)
    .await?;
    total += r.rows_affected() as i64;

    // Supplements (EN)
    let r = sqlx::query(
        r#"INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, category_weight, tsv_document, metadata, parent_marker_slug)
           SELECT 'supplement', ms.id::text, 'en', ms.supplement_name, ms.notes, 1.2,
             setweight(to_tsvector('english', COALESCE(ms.supplement_name, '')), 'A') ||
             setweight(to_tsvector('english', COALESCE(ms.typical_dose, '') || ' ' || COALESCE(ms.notes, '')), 'B'),
             jsonb_build_object('typical_dose', ms.typical_dose), ms.marker_id
           FROM marker_supplements ms
           ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
             title = EXCLUDED.title, snippet = EXCLUDED.snippet, tsv_document = EXCLUDED.tsv_document, metadata = EXCLUDED.metadata, updated_at = now()"#,
    )
    .execute(pool)
    .await?;
    total += r.rows_affected() as i64;

    // Supplements (DE)
    let r = sqlx::query(
        r#"INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, category_weight, tsv_document, metadata, parent_marker_slug)
           SELECT 'supplement', ms.id::text, 'de', ms.supplement_name_de, ms.notes, 1.2,
             setweight(to_tsvector('german', COALESCE(ms.supplement_name_de, '')), 'A') ||
             setweight(to_tsvector('german', COALESCE(ms.typical_dose, '') || ' ' || COALESCE(ms.notes, '')), 'B'),
             jsonb_build_object('typical_dose', ms.typical_dose), ms.marker_id
           FROM marker_supplements ms WHERE ms.supplement_name_de IS NOT NULL
           ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
             title = EXCLUDED.title, snippet = EXCLUDED.snippet, tsv_document = EXCLUDED.tsv_document, metadata = EXCLUDED.metadata, updated_at = now()"#,
    )
    .execute(pool)
    .await?;
    total += r.rows_affected() as i64;

    // Lab tests (EN)
    let r = sqlx::query(
        r#"INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, category_weight, tsv_document, metadata, parent_marker_slug)
           SELECT 'lab_test', mt.id::text, 'en', mt.test_name, mt.notes, 0.9,
             setweight(to_tsvector('english', COALESCE(mt.test_name, '')), 'A') ||
             setweight(to_tsvector('english', COALESCE(mt.panel_name, '') || ' ' || COALESCE(mt.notes, '')), 'B'),
             jsonb_build_object('panel_name', mt.panel_name), mt.marker_id
           FROM marker_tests mt
           ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
             title = EXCLUDED.title, snippet = EXCLUDED.snippet, tsv_document = EXCLUDED.tsv_document, metadata = EXCLUDED.metadata, updated_at = now()"#,
    )
    .execute(pool)
    .await?;
    total += r.rows_affected() as i64;

    // Lab tests (DE)
    let r = sqlx::query(
        r#"INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, category_weight, tsv_document, metadata, parent_marker_slug)
           SELECT 'lab_test', mt.id::text, 'de', mt.test_name_de, mt.notes, 0.9,
             setweight(to_tsvector('german', COALESCE(mt.test_name_de, '')), 'A') ||
             setweight(to_tsvector('german', COALESCE(mt.panel_name, '') || ' ' || COALESCE(mt.notes, '')), 'B'),
             jsonb_build_object('panel_name', mt.panel_name), mt.marker_id
           FROM marker_tests mt WHERE mt.test_name_de IS NOT NULL
           ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
             title = EXCLUDED.title, snippet = EXCLUDED.snippet, tsv_document = EXCLUDED.tsv_document, metadata = EXCLUDED.metadata, updated_at = now()"#,
    )
    .execute(pool)
    .await?;
    total += r.rows_affected() as i64;

    // References
    let r = sqlx::query(
        r#"INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, category_weight, tsv_document, metadata, parent_marker_slug)
           SELECT 'reference', mr.id::text, 'en', mr.title, mr.source, 0.8,
             setweight(to_tsvector('english', COALESCE(mr.title, '')), 'A') ||
             setweight(to_tsvector('english', COALESCE(mr.source, '')), 'B'),
             jsonb_build_object('year', mr.year, 'url', mr.url), mr.marker_id
           FROM marker_references mr
           ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
             title = EXCLUDED.title, snippet = EXCLUDED.snippet, tsv_document = EXCLUDED.tsv_document, metadata = EXCLUDED.metadata, updated_at = now()"#,
    )
    .execute(pool)
    .await?;
    total += r.rows_affected() as i64;

    // Relations (deep link to first marker)
    let r = sqlx::query(
        r#"INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, url_path, category_weight, tsv_document, metadata)
           SELECT 'relation', mr.id::text, 'en',
             mr.marker_slug_a || ' <-> ' || mr.marker_slug_b, mr.description, '/markers/' || mr.marker_slug_a, 1.0,
             setweight(to_tsvector('english', COALESCE(mr.marker_slug_a, '') || ' ' || COALESCE(mr.marker_slug_b, '')), 'A') ||
             setweight(to_tsvector('english', COALESCE(mr.description, '')), 'B'),
             jsonb_build_object('marker_slug_a', mr.marker_slug_a, 'marker_slug_b', mr.marker_slug_b, 'direction', mr.direction, 'clinical_significance', mr.clinical_significance)
           FROM marker_relations mr
           ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
             title = EXCLUDED.title, snippet = EXCLUDED.snippet, tsv_document = EXCLUDED.tsv_document, metadata = EXCLUDED.metadata, updated_at = now()"#,
    )
    .execute(pool)
    .await?;
    total += r.rows_affected() as i64;

    // Protocol effects (deep link to affected marker)
    let r = sqlx::query(
        r#"INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, url_path, category_weight, tsv_document, metadata)
           SELECT 'protocol_effect', pe.id::text, 'en',
             pe.protocol_name || ' - ' || pe.marker_slug, pe.detail, '/markers/' || pe.marker_slug, 0.7,
             setweight(to_tsvector('english', COALESCE(pe.protocol_name, '') || ' ' || COALESCE(pe.marker_slug, '')), 'A') ||
             setweight(to_tsvector('english', COALESCE(pe.detail, '')), 'B'),
             jsonb_build_object('protocol_slug', pe.protocol_slug, 'marker_slug', pe.marker_slug, 'effect', pe.effect)
           FROM protocol_effects pe
           ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
             title = EXCLUDED.title, snippet = EXCLUDED.snippet, tsv_document = EXCLUDED.tsv_document, metadata = EXCLUDED.metadata, updated_at = now()"#,
    )
    .execute(pool)
    .await?;
    total += r.rows_affected() as i64;

    // Web content (use content value as title, deep link with section anchor)
    let r = sqlx::query(
        r#"INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, external_url, category_weight, tsv_document)
           SELECT 'web_content', wct.id::text, wct.locale, LEFT(wct.value, 100),
             LEFT(wct.value, 300),
             'https://sovereignhealth.io/' || wp.slug || '#' || wcs.key, 0.5,
             to_tsvector((CASE WHEN wct.locale = 'de' THEN 'german' ELSE 'english' END)::regconfig, COALESCE(wct.value, ''))
           FROM web_content_translations wct
           JOIN web_content_sections wcs ON wcs.id = wct.section_id
           JOIN web_pages wp ON wp.id = wcs.page_id
           ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
             title = EXCLUDED.title, snippet = EXCLUDED.snippet, external_url = EXCLUDED.external_url,
             tsv_document = EXCLUDED.tsv_document, updated_at = now()"#,
    )
    .execute(pool)
    .await?;
    total += r.rows_affected() as i64;

    // Diet protocols
    let r = sqlx::query(
        r#"INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, category_weight, tsv_document)
           SELECT 'diet_protocol', dp.slug, dpt.locale, dpt.name,
             COALESCE(dpt.short_description, dpt.long_description, ''), 0.8,
             setweight(to_tsvector((CASE WHEN dpt.locale = 'de' THEN 'german' ELSE 'english' END)::regconfig, COALESCE(dpt.name, '')), 'A') ||
             setweight(to_tsvector((CASE WHEN dpt.locale = 'de' THEN 'german' ELSE 'english' END)::regconfig, COALESCE(dpt.short_description, '') || ' ' || COALESCE(dpt.long_description, '')), 'B')
           FROM diet_protocols dp JOIN diet_protocol_translations dpt ON dpt.protocol_id = dp.id
           ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
             title = EXCLUDED.title, snippet = EXCLUDED.snippet, tsv_document = EXCLUDED.tsv_document, updated_at = now()"#,
    )
    .execute(pool)
    .await?;
    total += r.rows_affected() as i64;

    // Eating patterns
    let r = sqlx::query(
        r#"INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, category_weight, tsv_document)
           SELECT 'eating_pattern', ep.slug, ept.locale, ept.name,
             ept.description, 0.8,
             setweight(to_tsvector((CASE WHEN ept.locale = 'de' THEN 'german' ELSE 'english' END)::regconfig, COALESCE(ept.name, '')), 'A') ||
             setweight(to_tsvector((CASE WHEN ept.locale = 'de' THEN 'german' ELSE 'english' END)::regconfig, COALESCE(ept.description, '')), 'B')
           FROM eating_patterns ep JOIN eating_pattern_translations ept ON ept.pattern_id = ep.id
           ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
             title = EXCLUDED.title, snippet = EXCLUDED.snippet, tsv_document = EXCLUDED.tsv_document, updated_at = now()"#,
    )
    .execute(pool)
    .await?;
    total += r.rows_affected() as i64;

    Ok(total)
}

// ── Helper: fetch latest measurement context for marker slugs ───────────────────

async fn fetch_user_marker_context(
    pool: &PgPool,
    user_id: uuid::Uuid,
    marker_slugs: &[String],
) -> Result<std::collections::HashMap<String, serde_json::Value>, AppError> {
    let mut ctx = std::collections::HashMap::new();

    if marker_slugs.is_empty() {
        return Ok(ctx);
    }

    // Use DISTINCT ON to get the latest measurement per marker.
    // measurements.marker_id is a UUID FK to markers.id; we join to get the slug.
    // Note: value_canonical is encrypted, so we only return status and timestamp here.
    let rows = sqlx::query(
        r#"SELECT DISTINCT ON (mk.marker_slug) mk.marker_slug,
                  ms.status, ms.timestamp AS measured_at
           FROM measurements ms
           JOIN markers mk ON mk.id = ms.marker_id
           WHERE ms.user_id = $1 AND mk.marker_slug = ANY($2)
           ORDER BY mk.marker_slug, ms.timestamp DESC"#,
    )
    .bind(user_id)
    .bind(marker_slugs)
    .fetch_all(pool)
    .await?;

    for row in &rows {
        let slug: String = row.try_get("marker_slug").unwrap_or_default();
        let status: Option<String> = row.try_get("status").ok();
        let measured_at: chrono::DateTime<chrono::Utc> = row
            .try_get("measured_at")
            .unwrap_or_else(|_| chrono::Utc::now());
        let days_ago = (chrono::Utc::now() - measured_at).num_days();

        ctx.insert(
            slug,
            json!({
                "status": status,
                "last_measured": measured_at.to_rfc3339(),
                "is_stale": days_ago > 90,
            }),
        );
    }

    Ok(ctx)
}

// ── Helper: compute blind spots (markers with no measurements) ──────────────────

async fn compute_blind_spots(
    pool: &PgPool,
    user_id: uuid::Uuid,
    marker_slugs: &[String],
) -> Result<Vec<serde_json::Value>, AppError> {
    if marker_slugs.is_empty() {
        return Ok(vec![]);
    }

    // Find which of the given marker slugs the user has NEVER measured.
    // measurements FK is marker_id (UUID), so join through markers table.
    let rows = sqlx::query(
        r#"SELECT s.slug
           FROM unnest($1::text[]) AS s(slug)
           WHERE NOT EXISTS (
               SELECT 1 FROM measurements ms
               JOIN markers mk ON mk.id = ms.marker_id
               WHERE ms.user_id = $2 AND mk.marker_slug = s.slug
           )"#,
    )
    .bind(marker_slugs)
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    let blind_spots: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            let slug: String = r.try_get("slug").unwrap_or_default();
            json!({
                "marker_slug": slug,
                "reason": "never_measured",
            })
        })
        .collect();

    Ok(blind_spots)
}
