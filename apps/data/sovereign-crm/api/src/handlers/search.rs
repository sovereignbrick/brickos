//! Full-text search handlers -- org-scoped, across all CRM entities.

use std::collections::HashMap;
use std::sync::Arc;

use actix_web::{web, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::middleware::auth::{extract_auth, fetch_user_org};
use crate::models::ApiResponse;
use crate::{AppError, PlatformPool};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct SearchResult {
    pub entity_type: String,
    pub entity_id: Uuid,
    pub title: String,
    pub subtitle: Option<String>,
    pub snippet: Option<String>,
    pub url_path: String,
    pub score: f32,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct SearchResponse {
    pub results: Vec<SearchResult>,
    pub total: i64,
    pub facets: HashMap<String, i64>,
}

#[derive(Debug, Serialize)]
pub struct SuggestResult {
    pub title: String,
    pub entity_type: String,
    pub url_path: String,
}

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub q: Option<String>,
    #[serde(rename = "type", default = "default_type")]
    pub entity_type: String,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

fn default_type() -> String {
    "all".to_string()
}

#[derive(Debug, Deserialize)]
pub struct SuggestQuery {
    pub q: Option<String>,
    pub limit: Option<i64>,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async fn resolve_org_id(
    req: &HttpRequest,
    platform_pool: &PlatformPool,
) -> Result<(Uuid, Uuid), AppError> {
    let auth = extract_auth(req)?;
    let org_id = match auth.org_id {
        Some(id) => id,
        None => fetch_user_org(platform_pool, auth.user_id)
            .await
            .map_err(AppError::Database)?
            .ok_or(AppError::Forbidden)?,
    };
    Ok((auth.user_id, org_id))
}

// ---------------------------------------------------------------------------
// GET /api/v1/search?q=...&type=all&limit=20&offset=0
// ---------------------------------------------------------------------------

pub async fn search(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    query: web::Query<SearchQuery>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    let q = query.q.as_deref().unwrap_or("").trim();
    if q.is_empty() {
        return Ok(HttpResponse::Ok().json(ApiResponse::ok(SearchResponse {
            results: vec![],
            total: 0,
            facets: HashMap::new(),
        })));
    }

    let limit = query.limit.unwrap_or(20).clamp(1, 100);
    let offset = query.offset.unwrap_or(0).max(0);
    let filter_type = &query.entity_type;

    // -- Results query --
    let (results_sql, count_sql, facet_sql) = if filter_type == "all" {
        (
            "SELECT entity_type, entity_id, title, subtitle, snippet, url_path, metadata, \
                    ts_rank_cd(tsv_document, plainto_tsquery('english', $1)) * category_weight AS score \
             FROM crm_search_index \
             WHERE org_id = $2 AND tsv_document @@ plainto_tsquery('english', $1) \
             ORDER BY score DESC \
             LIMIT $3 OFFSET $4"
                .to_string(),
            "SELECT COUNT(*) AS total \
             FROM crm_search_index \
             WHERE org_id = $2 AND tsv_document @@ plainto_tsquery('english', $1)"
                .to_string(),
            "SELECT entity_type, COUNT(*) AS cnt \
             FROM crm_search_index \
             WHERE org_id = $2 AND tsv_document @@ plainto_tsquery('english', $1) \
             GROUP BY entity_type"
                .to_string(),
        )
    } else {
        (
            "SELECT entity_type, entity_id, title, subtitle, snippet, url_path, metadata, \
                    ts_rank_cd(tsv_document, plainto_tsquery('english', $1)) * category_weight AS score \
             FROM crm_search_index \
             WHERE org_id = $2 AND entity_type = $5 AND tsv_document @@ plainto_tsquery('english', $1) \
             ORDER BY score DESC \
             LIMIT $3 OFFSET $4"
                .to_string(),
            "SELECT COUNT(*) AS total \
             FROM crm_search_index \
             WHERE org_id = $2 AND entity_type = $3 AND tsv_document @@ plainto_tsquery('english', $1)"
                .to_string(),
            "SELECT entity_type, COUNT(*) AS cnt \
             FROM crm_search_index \
             WHERE org_id = $2 AND entity_type = $3 AND tsv_document @@ plainto_tsquery('english', $1) \
             GROUP BY entity_type"
                .to_string(),
        )
    };

    // Fetch results
    let mut results_qb = sqlx::query(&results_sql)
        .bind(q)
        .bind(org_id)
        .bind(limit)
        .bind(offset);
    if filter_type != "all" {
        results_qb = results_qb.bind(filter_type.as_str());
    }
    let rows = results_qb.fetch_all(pool.get_ref()).await?;

    let results: Vec<SearchResult> = rows
        .iter()
        .map(|row| SearchResult {
            entity_type: row.get("entity_type"),
            entity_id: row.get("entity_id"),
            title: row.get("title"),
            subtitle: row.get("subtitle"),
            snippet: row.get("snippet"),
            url_path: row.get("url_path"),
            score: row.get("score"),
            metadata: row.get("metadata"),
        })
        .collect();

    // Fetch total count
    let mut count_qb = sqlx::query(&count_sql).bind(q).bind(org_id);
    if filter_type != "all" {
        count_qb = count_qb.bind(filter_type.as_str());
    }
    let count_row = count_qb.fetch_one(pool.get_ref()).await?;
    let total: i64 = count_row.get("total");

    // Fetch facets
    let mut facet_qb = sqlx::query(&facet_sql).bind(q).bind(org_id);
    if filter_type != "all" {
        facet_qb = facet_qb.bind(filter_type.as_str());
    }
    let facet_rows = facet_qb.fetch_all(pool.get_ref()).await?;

    let mut facets = HashMap::new();
    for row in &facet_rows {
        let et: String = row.get("entity_type");
        let cnt: i64 = row.get("cnt");
        facets.insert(et, cnt);
    }

    Ok(HttpResponse::Ok().json(ApiResponse::ok(SearchResponse {
        results,
        total,
        facets,
    })))
}

// ---------------------------------------------------------------------------
// GET /api/v1/search/suggest?q=...&limit=8
// ---------------------------------------------------------------------------

pub async fn suggest(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    query: web::Query<SuggestQuery>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    let q = query.q.as_deref().unwrap_or("").trim();
    if q.is_empty() {
        return Ok(HttpResponse::Ok().json(ApiResponse::ok(Vec::<SuggestResult>::new())));
    }

    let limit = query.limit.unwrap_or(8).clamp(1, 50);
    let pattern = format!("%{q}%");

    let rows = sqlx::query(
        "SELECT DISTINCT title, entity_type, url_path \
         FROM crm_search_index \
         WHERE org_id = $1 AND title ILIKE $2 \
         LIMIT $3",
    )
    .bind(org_id)
    .bind(&pattern)
    .bind(limit)
    .fetch_all(pool.get_ref())
    .await?;

    let suggestions: Vec<SuggestResult> = rows
        .iter()
        .map(|row| SuggestResult {
            title: row.get("title"),
            entity_type: row.get("entity_type"),
            url_path: row.get("url_path"),
        })
        .collect();

    Ok(HttpResponse::Ok().json(ApiResponse::ok(suggestions)))
}

// ---------------------------------------------------------------------------
// POST /api/v1/search/reindex
// ---------------------------------------------------------------------------

pub async fn reindex(
    req: HttpRequest,
    platform_pool: web::Data<PlatformPool>,
    pool: web::Data<PgPool>,
    encryptor: web::Data<Arc<brickos_crypto::Encryptor>>,
) -> Result<HttpResponse, AppError> {
    let (_user_id, org_id) = resolve_org_id(&req, &platform_pool).await?;

    // Use a transaction so the index is atomically rebuilt
    let mut tx = pool.begin().await?;

    // Clear existing index for this org
    sqlx::query("DELETE FROM crm_search_index WHERE org_id = $1")
        .bind(org_id)
        .execute(&mut *tx)
        .await?;

    let mut indexed: i64 = 0;

    // -- Contacts (weight 1.5) --
    let contact_rows =
        sqlx::query("SELECT id, name, role, notes FROM crm_contacts WHERE org_id = $1")
            .bind(org_id)
            .fetch_all(&mut *tx)
            .await?;

    for row in &contact_rows {
        let id: Uuid = row.get("id");
        let name: String = row.get("name");
        let role: Option<String> = row.get("role");
        let notes_enc: Option<String> = row.get("notes");
        let notes = encryptor.decrypt_opt(notes_enc);

        sqlx::query(
            "INSERT INTO crm_search_index \
             (entity_type, entity_id, org_id, title, subtitle, snippet, url_path, category_weight, tsv_document) \
             VALUES ('contact', $1, $2, $3, $4, $5, $6, 1.5, \
                 setweight(to_tsvector('english', $3), 'A') || \
                 setweight(to_tsvector('english', coalesce($4, '')), 'B') || \
                 setweight(to_tsvector('english', coalesce($5, '')), 'C') \
             )",
        )
        .bind(id)
        .bind(org_id)
        .bind(&name)
        .bind(&role)
        .bind(&notes)
        .bind(format!("/contacts/{id}"))
        .execute(&mut *tx)
        .await?;
        indexed += 1;
    }

    // -- Companies (weight 1.3) --
    let company_rows =
        sqlx::query("SELECT id, name, domain, notes FROM crm_companies WHERE org_id = $1")
            .bind(org_id)
            .fetch_all(&mut *tx)
            .await?;

    for row in &company_rows {
        let id: Uuid = row.get("id");
        let name: String = row.get("name");
        let domain: Option<String> = row.get("domain");
        let notes_enc: Option<String> = row.get("notes");
        let notes = encryptor.decrypt_opt(notes_enc);

        sqlx::query(
            "INSERT INTO crm_search_index \
             (entity_type, entity_id, org_id, title, subtitle, snippet, url_path, category_weight, tsv_document) \
             VALUES ('company', $1, $2, $3, $4, $5, $6, 1.3, \
                 setweight(to_tsvector('english', $3), 'A') || \
                 setweight(to_tsvector('english', coalesce($4, '')), 'B') || \
                 setweight(to_tsvector('english', coalesce($5, '')), 'C') \
             )",
        )
        .bind(id)
        .bind(org_id)
        .bind(&name)
        .bind(&domain)
        .bind(&notes)
        .bind(format!("/companies/{id}"))
        .execute(&mut *tx)
        .await?;
        indexed += 1;
    }

    // -- Projects (weight 1.2) --
    let project_rows =
        sqlx::query("SELECT id, name, description, notes FROM crm_projects WHERE org_id = $1")
            .bind(org_id)
            .fetch_all(&mut *tx)
            .await?;

    for row in &project_rows {
        let id: Uuid = row.get("id");
        let name: String = row.get("name");
        let description: Option<String> = row.get("description");
        let notes_enc: Option<String> = row.get("notes");
        let notes = encryptor.decrypt_opt(notes_enc);

        sqlx::query(
            "INSERT INTO crm_search_index \
             (entity_type, entity_id, org_id, title, subtitle, snippet, url_path, category_weight, tsv_document) \
             VALUES ('project', $1, $2, $3, $4, $5, $6, 1.2, \
                 setweight(to_tsvector('english', $3), 'A') || \
                 setweight(to_tsvector('english', coalesce($4, '')), 'B') || \
                 setweight(to_tsvector('english', coalesce($5, '')), 'C') \
             )",
        )
        .bind(id)
        .bind(org_id)
        .bind(&name)
        .bind(&description)
        .bind(&notes)
        .bind(format!("/projects/{id}"))
        .execute(&mut *tx)
        .await?;
        indexed += 1;
    }

    // -- Interactions (weight 1.0) --
    let interaction_rows = sqlx::query(
        "SELECT id, subject, interaction_type, body FROM crm_interactions WHERE org_id = $1",
    )
    .bind(org_id)
    .fetch_all(&mut *tx)
    .await?;

    for row in &interaction_rows {
        let id: Uuid = row.get("id");
        let subject_enc: Option<String> = row.get("subject");
        let interaction_type: String = row.get("interaction_type");
        let body_enc: Option<String> = row.get("body");
        let subject = encryptor.decrypt_opt(subject_enc);
        let body = encryptor.decrypt_opt(body_enc);

        let title = subject.as_deref().unwrap_or("Untitled interaction");

        sqlx::query(
            "INSERT INTO crm_search_index \
             (entity_type, entity_id, org_id, title, subtitle, snippet, url_path, category_weight, tsv_document) \
             VALUES ('interaction', $1, $2, $3, $4, $5, $6, 1.0, \
                 setweight(to_tsvector('english', $3), 'A') || \
                 setweight(to_tsvector('english', coalesce($4, '')), 'B') || \
                 setweight(to_tsvector('english', coalesce($5, '')), 'C') \
             )",
        )
        .bind(id)
        .bind(org_id)
        .bind(title)
        .bind(&interaction_type)
        .bind(&body)
        .bind(format!("/interactions/{id}"))
        .execute(&mut *tx)
        .await?;
        indexed += 1;
    }

    tx.commit().await?;

    Ok(HttpResponse::Ok().json(ApiResponse::ok(serde_json::json!({
        "indexed": indexed,
        "message": "Search index rebuilt successfully"
    }))))
}
