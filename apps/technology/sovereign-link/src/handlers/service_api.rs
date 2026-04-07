//! Service-to-service API endpoints (#335) and consistency checks (#336).
//!
//! Authenticated via service account (not user JWT). Used by Sovereign Voice,
//! SHI, and other BrickOS apps to create and query short links programmatically.

#[cfg(feature = "platform")]
use actix_web::{web, HttpRequest, HttpResponse};
#[cfg(feature = "platform")]
use chrono::{DateTime, Utc};
#[cfg(feature = "platform")]
use sqlx::PgPool;
#[cfg(feature = "platform")]
use uuid::Uuid;

#[cfg(feature = "platform")]
use super::service_auth::{extract_service_account, require_role, require_scope};

// ---------------------------------------------------------------------------
// Request / response types
// ---------------------------------------------------------------------------

#[cfg(feature = "platform")]
#[derive(Debug, serde::Deserialize)]
pub struct ServiceCreateLinkRequest {
    pub code: Option<String>,
    pub target_url: String,
    pub link_type: Option<String>,
    pub domain: Option<String>,
    pub app_key: Option<String>,
    pub owner_org_id: Option<Uuid>,
    pub owner_user_id: Option<Uuid>,
    pub title: Option<String>,
    pub expires_at: Option<DateTime<Utc>>,
}

#[cfg(feature = "platform")]
#[derive(Debug, serde::Deserialize)]
pub struct BatchCreateRequest {
    pub links: Vec<ServiceCreateLinkRequest>,
}

#[cfg(feature = "platform")]
#[derive(Debug, serde::Serialize)]
pub struct BatchCreateResponse {
    pub created: Vec<crate::models::ShortLink>,
    pub errors: Vec<BatchError>,
}

#[cfg(feature = "platform")]
#[derive(Debug, serde::Serialize)]
pub struct BatchError {
    pub index: usize,
    pub target_url: String,
    pub error: String,
}

#[cfg(feature = "platform")]
#[derive(Debug, serde::Serialize)]
pub struct ServiceLinkStats {
    pub code: String,
    pub target_url: String,
    pub total_clicks: i64,
    pub clicks_7d: i64,
    pub clicks_30d: i64,
    pub unique_visitors_7d: i64,
}

#[cfg(feature = "platform")]
#[derive(Debug, serde::Serialize)]
pub struct ConsistencyReport {
    pub checks: Vec<ConsistencyCheck>,
}

#[cfg(feature = "platform")]
#[derive(Debug, serde::Serialize)]
pub struct ConsistencyCheck {
    pub name: String,
    pub status: String,
    pub violations: i64,
    pub details: Option<String>,
}

// ---------------------------------------------------------------------------
// Service API endpoints
// ---------------------------------------------------------------------------

/// POST /api/v1/service/links - Create a link on behalf of a service.
#[cfg(feature = "platform")]
pub async fn create_service_link(
    req: HttpRequest,
    body: web::Json<ServiceCreateLinkRequest>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let account = match extract_service_account(&req) {
        Some(a) => a,
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({"error": "Unauthorized"}))
        }
    };
    if let Err(resp) = require_scope(&account, "links:create") {
        return resp;
    }

    let data = body.into_inner();
    let code = data.code.unwrap_or_else(generate_short_code);
    let link_type = data.link_type.unwrap_or_else(|| "generic".to_string());
    let domain = data.domain.unwrap_or_else(|| "link".to_string());
    let app_key = data.app_key.unwrap_or_else(|| account.name.clone());

    let link = sqlx::query_as::<_, crate::models::ShortLink>(
        r#"INSERT INTO short_links (id, code, target_url, link_type, domain, app_key,
                                    owner_user_id, owner_org_id, title, expires_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, code, target_url, link_type, domain, app_key,
                     owner_user_id, owner_org_id, affiliate_code, title,
                     is_active, expires_at, created_at, updated_at"#,
    )
    .bind(&code)
    .bind(&data.target_url)
    .bind(&link_type)
    .bind(&domain)
    .bind(&app_key)
    .bind(data.owner_user_id)
    .bind(data.owner_org_id)
    .bind(&data.title)
    .bind(data.expires_at)
    .fetch_one(pool.get_ref())
    .await;

    match link {
        Ok(l) => HttpResponse::Created().json(l),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("duplicate") || msg.contains("unique") {
                HttpResponse::Conflict().json(serde_json::json!({"error": "Code already taken"}))
            } else {
                tracing::error!("Service create link failed: {}", e);
                HttpResponse::InternalServerError()
                    .json(serde_json::json!({"error": "Internal error"}))
            }
        }
    }
}

/// POST /api/v1/service/links/batch - Create multiple links at once.
#[cfg(feature = "platform")]
pub async fn create_batch_links(
    req: HttpRequest,
    body: web::Json<BatchCreateRequest>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let account = match extract_service_account(&req) {
        Some(a) => a,
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({"error": "Unauthorized"}))
        }
    };
    if let Err(resp) = require_scope(&account, "links:create") {
        return resp;
    }

    let batch = body.into_inner();

    // Cap batch size to prevent abuse
    if batch.links.len() > 100 {
        return HttpResponse::BadRequest()
            .json(serde_json::json!({"error": "Batch size exceeds maximum of 100"}));
    }

    let mut created = Vec::new();
    let mut errors = Vec::new();

    for (idx, item) in batch.links.into_iter().enumerate() {
        let code = item.code.unwrap_or_else(generate_short_code);
        let link_type = item.link_type.unwrap_or_else(|| "generic".to_string());
        let domain = item.domain.unwrap_or_else(|| "link".to_string());
        let app_key = item.app_key.unwrap_or_else(|| account.name.clone());

        let result = sqlx::query_as::<_, crate::models::ShortLink>(
            r#"INSERT INTO short_links (id, code, target_url, link_type, domain, app_key,
                                        owner_user_id, owner_org_id, title, expires_at)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
               RETURNING id, code, target_url, link_type, domain, app_key,
                         owner_user_id, owner_org_id, affiliate_code, title,
                         is_active, expires_at, created_at, updated_at"#,
        )
        .bind(&code)
        .bind(&item.target_url)
        .bind(&link_type)
        .bind(&domain)
        .bind(&app_key)
        .bind(item.owner_user_id)
        .bind(item.owner_org_id)
        .bind(&item.title)
        .bind(item.expires_at)
        .fetch_one(pool.get_ref())
        .await;

        match result {
            Ok(link) => created.push(link),
            Err(e) => errors.push(BatchError {
                index: idx,
                target_url: item.target_url,
                error: e.to_string(),
            }),
        }
    }

    let response = BatchCreateResponse { created, errors };
    HttpResponse::Ok().json(response)
}

/// GET /api/v1/service/links/{code}/stats - Query click stats for a code.
#[cfg(feature = "platform")]
pub async fn service_link_stats(
    req: HttpRequest,
    code: web::Path<String>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let account = match extract_service_account(&req) {
        Some(a) => a,
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({"error": "Unauthorized"}))
        }
    };
    if let Err(resp) = require_scope(&account, "links:stats") {
        return resp;
    }

    let code = code.into_inner();

    // Look up the link by code
    let link = sqlx::query_as::<_, crate::models::ShortLink>(
        r#"SELECT id, code, target_url, link_type, domain, app_key,
                  owner_user_id, owner_org_id, affiliate_code, title,
                  is_active, expires_at, created_at, updated_at
           FROM short_links WHERE code = $1"#,
    )
    .bind(&code)
    .fetch_optional(pool.get_ref())
    .await;

    let link = match link {
        Ok(Some(l)) => l,
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({"error": "Link not found"}))
        }
        Err(e) => {
            tracing::error!("Service link stats lookup failed: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}));
        }
    };

    // Gather stats
    let total: (i64,) =
        match sqlx::query_as("SELECT COUNT(*) FROM short_link_clicks WHERE short_link_id = $1")
            .bind(link.id)
            .fetch_one(pool.get_ref())
            .await
        {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("Stats count failed: {}", e);
                return HttpResponse::InternalServerError()
                    .json(serde_json::json!({"error": "Internal error"}));
            }
        };

    let clicks_7d: (i64,) = match sqlx::query_as(
        "SELECT COUNT(*) FROM short_link_clicks WHERE short_link_id = $1 AND clicked_at > now() - interval '7 days'",
    )
    .bind(link.id)
    .fetch_one(pool.get_ref())
    .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Stats 7d count failed: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}));
        }
    };

    let clicks_30d: (i64,) = match sqlx::query_as(
        "SELECT COUNT(*) FROM short_link_clicks WHERE short_link_id = $1 AND clicked_at > now() - interval '30 days'",
    )
    .bind(link.id)
    .fetch_one(pool.get_ref())
    .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Stats 30d count failed: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}));
        }
    };

    let unique_7d: (i64,) = match sqlx::query_as(
        "SELECT COUNT(DISTINCT visitor_hash) FROM short_link_clicks WHERE short_link_id = $1 AND clicked_at > now() - interval '7 days'",
    )
    .bind(link.id)
    .fetch_one(pool.get_ref())
    .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Stats unique 7d count failed: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}));
        }
    };

    let stats = ServiceLinkStats {
        code: link.code,
        target_url: link.target_url,
        total_clicks: total.0,
        clicks_7d: clicks_7d.0,
        clicks_30d: clicks_30d.0,
        unique_visitors_7d: unique_7d.0,
    };

    HttpResponse::Ok().json(stats)
}

// ---------------------------------------------------------------------------
// Consistency checks (#336)
// ---------------------------------------------------------------------------

/// GET /api/v1/admin/consistency - Run DB consistency checks (design-006 section 9).
#[cfg(feature = "platform")]
pub async fn consistency_check(req: HttpRequest, pool: web::Data<PgPool>) -> HttpResponse {
    let account = match extract_service_account(&req) {
        Some(a) => a,
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({"error": "Unauthorized"}))
        }
    };
    if let Err(resp) = require_role(&account, "platform_admin") {
        return resp;
    }

    let mut checks = Vec::new();

    // Check 1: Users without a personal org
    let users_no_org: (i64,) = sqlx::query_as(
        r#"SELECT COUNT(*) FROM brickos.users u
           WHERE NOT EXISTS (
             SELECT 1 FROM brickos.organizations o
             WHERE o.owner_user_id = u.id AND o.org_type = 'personal'
           )"#,
    )
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or((-1,));

    checks.push(ConsistencyCheck {
        name: "users_without_personal_org".to_string(),
        status: if users_no_org.0 == 0 {
            "pass".to_string()
        } else {
            "fail".to_string()
        },
        violations: users_no_org.0,
        details: None,
    });

    // Check 2: Personal orgs with wrong member count (should be exactly 1)
    let bad_member_count: (i64,) = sqlx::query_as(
        r#"SELECT COUNT(*) FROM brickos.organizations o
           WHERE o.org_type = 'personal'
             AND (SELECT COUNT(*) FROM brickos.organization_members om WHERE om.organization_id = o.id) != 1"#,
    )
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or((-1,));

    checks.push(ConsistencyCheck {
        name: "personal_orgs_wrong_member_count".to_string(),
        status: if bad_member_count.0 == 0 {
            "pass".to_string()
        } else {
            "fail".to_string()
        },
        violations: bad_member_count.0,
        details: None,
    });

    // Check 3: Links without a valid org
    let orphan_links: (i64,) = sqlx::query_as(
        r#"SELECT COUNT(*) FROM short_links sl
           WHERE sl.owner_org_id IS NOT NULL
             AND NOT EXISTS (
               SELECT 1 FROM brickos.organizations o WHERE o.id = sl.owner_org_id
             )"#,
    )
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or((-1,));

    checks.push(ConsistencyCheck {
        name: "links_without_valid_org".to_string(),
        status: if orphan_links.0 == 0 {
            "pass".to_string()
        } else {
            "fail".to_string()
        },
        violations: orphan_links.0,
        details: None,
    });

    let report = ConsistencyReport { checks };
    HttpResponse::Ok().json(report)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Generate a 6-char random alphanumeric code.
#[cfg(feature = "platform")]
fn generate_short_code() -> String {
    use rand::Rng;
    let mut rng = rand::rng();
    let chars: Vec<char> = "abcdefghijklmnopqrstuvwxyz0123456789".chars().collect();
    (0..6)
        .map(|_| chars[rng.random_range(0..chars.len())])
        .collect()
}
