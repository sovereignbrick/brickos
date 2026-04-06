//! Platform admin and org-level reporting endpoints (#334).
//!
//! Provides global platform stats, per-org stats, and org-scoped link listing
//! for admin dashboards and reporting tools.

#[cfg(feature = "platform")]
use actix_web::{web, HttpRequest, HttpResponse};
#[cfg(feature = "platform")]
use sqlx::PgPool;
#[cfg(feature = "platform")]
use uuid::Uuid;

#[cfg(feature = "platform")]
use super::service_auth::{extract_service_account, require_role};

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

#[cfg(feature = "platform")]
#[derive(Debug, serde::Serialize, sqlx::FromRow)]
pub struct PlatformStats {
    pub total_orgs: i64,
    pub total_users: i64,
    pub total_links: i64,
    pub total_clicks: i64,
    pub clicks_7d: i64,
    pub clicks_30d: i64,
}

#[cfg(feature = "platform")]
#[derive(Debug, serde::Serialize, sqlx::FromRow)]
pub struct OrgStats {
    pub org_id: Uuid,
    pub org_name: String,
    pub org_slug: String,
    pub total_links: i64,
    pub total_clicks: i64,
    pub clicks_7d: i64,
}

#[cfg(feature = "platform")]
#[derive(Debug, serde::Serialize, sqlx::FromRow)]
pub struct AppStats {
    pub source_app: String,
    pub total_links: i64,
    pub total_clicks: i64,
}

#[cfg(feature = "platform")]
#[derive(Debug, serde::Serialize, sqlx::FromRow)]
pub struct OrgSummary {
    pub org_id: Uuid,
    pub org_name: String,
    pub org_slug: String,
    pub link_count: i64,
    pub click_count: i64,
}

#[cfg(feature = "platform")]
#[derive(Debug, serde::Serialize, sqlx::FromRow)]
pub struct OrgScopedStats {
    pub total_links: i64,
    pub total_clicks: i64,
    pub clicks_7d: i64,
    pub clicks_30d: i64,
}

// ---------------------------------------------------------------------------
// Platform admin endpoints (requires platform_admin role)
// ---------------------------------------------------------------------------

/// GET /api/v1/admin/stats - Global platform statistics.
#[cfg(feature = "platform")]
pub async fn platform_stats(
    req: HttpRequest,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let account = match extract_service_account(&req) {
        Some(a) => a,
        None => return HttpResponse::Unauthorized().json(serde_json::json!({"error": "Unauthorized"})),
    };
    if let Err(resp) = require_role(&account, "platform_admin") {
        return resp;
    }

    let stats = sqlx::query_as::<_, PlatformStats>(
        r#"SELECT
             (SELECT COUNT(*) FROM brickos.organizations) AS total_orgs,
             (SELECT COUNT(*) FROM brickos.users) AS total_users,
             (SELECT COUNT(*) FROM short_links) AS total_links,
             (SELECT COUNT(*) FROM short_link_clicks) AS total_clicks,
             (SELECT COUNT(*) FROM short_link_clicks WHERE clicked_at > now() - interval '7 days') AS clicks_7d,
             (SELECT COUNT(*) FROM short_link_clicks WHERE clicked_at > now() - interval '30 days') AS clicks_30d"#,
    )
    .fetch_one(pool.get_ref())
    .await;

    match stats {
        Ok(s) => HttpResponse::Ok().json(s),
        Err(e) => {
            tracing::error!("Platform stats query failed: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

/// GET /api/v1/admin/stats/by-org - Stats grouped by organization.
#[cfg(feature = "platform")]
pub async fn stats_by_org(
    req: HttpRequest,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let account = match extract_service_account(&req) {
        Some(a) => a,
        None => return HttpResponse::Unauthorized().json(serde_json::json!({"error": "Unauthorized"})),
    };
    if let Err(resp) = require_role(&account, "platform_admin") {
        return resp;
    }

    let rows = sqlx::query_as::<_, OrgStats>(
        r#"SELECT
             o.id AS org_id,
             o.name AS org_name,
             o.slug AS org_slug,
             COUNT(DISTINCT sl.id) AS total_links,
             COUNT(DISTINCT slc.id) AS total_clicks,
             COUNT(DISTINCT slc.id) FILTER (WHERE slc.clicked_at > now() - interval '7 days') AS clicks_7d
           FROM brickos.organizations o
           LEFT JOIN short_links sl ON sl.owner_org_id = o.id
           LEFT JOIN short_link_clicks slc ON slc.short_link_id = sl.id
           GROUP BY o.id, o.name, o.slug
           ORDER BY total_clicks DESC"#,
    )
    .fetch_all(pool.get_ref())
    .await;

    match rows {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(e) => {
            tracing::error!("Stats by org query failed: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

/// GET /api/v1/admin/stats/by-app - Stats grouped by source app (app_key).
#[cfg(feature = "platform")]
pub async fn stats_by_app(
    req: HttpRequest,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let account = match extract_service_account(&req) {
        Some(a) => a,
        None => return HttpResponse::Unauthorized().json(serde_json::json!({"error": "Unauthorized"})),
    };
    if let Err(resp) = require_role(&account, "platform_admin") {
        return resp;
    }

    let rows = sqlx::query_as::<_, AppStats>(
        r#"SELECT
             sl.app_key AS source_app,
             COUNT(DISTINCT sl.id) AS total_links,
             COUNT(DISTINCT slc.id) AS total_clicks
           FROM short_links sl
           LEFT JOIN short_link_clicks slc ON slc.short_link_id = sl.id
           GROUP BY sl.app_key
           ORDER BY total_clicks DESC"#,
    )
    .fetch_all(pool.get_ref())
    .await;

    match rows {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(e) => {
            tracing::error!("Stats by app query failed: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

/// GET /api/v1/admin/orgs - List all organizations with link and click counts.
#[cfg(feature = "platform")]
pub async fn list_orgs(
    req: HttpRequest,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let account = match extract_service_account(&req) {
        Some(a) => a,
        None => return HttpResponse::Unauthorized().json(serde_json::json!({"error": "Unauthorized"})),
    };
    if let Err(resp) = require_role(&account, "platform_admin") {
        return resp;
    }

    let rows = sqlx::query_as::<_, OrgSummary>(
        r#"SELECT
             o.id AS org_id,
             o.name AS org_name,
             o.slug AS org_slug,
             COUNT(DISTINCT sl.id) AS link_count,
             COUNT(DISTINCT slc.id) AS click_count
           FROM brickos.organizations o
           LEFT JOIN short_links sl ON sl.owner_org_id = o.id
           LEFT JOIN short_link_clicks slc ON slc.short_link_id = sl.id
           GROUP BY o.id, o.name, o.slug
           ORDER BY o.name"#,
    )
    .fetch_all(pool.get_ref())
    .await;

    match rows {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(e) => {
            tracing::error!("List orgs query failed: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

// ---------------------------------------------------------------------------
// Org-level endpoints (requires org_admin role OR platform_admin)
// ---------------------------------------------------------------------------

/// GET /api/v1/orgs/{org_id}/stats - Stats for a single organization.
#[cfg(feature = "platform")]
pub async fn org_stats(
    req: HttpRequest,
    org_id: web::Path<Uuid>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let account = match extract_service_account(&req) {
        Some(a) => a,
        None => return HttpResponse::Unauthorized().json(serde_json::json!({"error": "Unauthorized"})),
    };
    // Allow platform_admin or org_admin
    if account.role != "platform_admin" && account.role != "org_admin" {
        return HttpResponse::Forbidden()
            .json(serde_json::json!({"error": "Requires platform_admin or org_admin role"}));
    }

    let oid = org_id.into_inner();

    let stats = sqlx::query_as::<_, OrgScopedStats>(
        r#"SELECT
             (SELECT COUNT(*) FROM short_links WHERE owner_org_id = $1) AS total_links,
             (SELECT COUNT(*) FROM short_link_clicks slc
              JOIN short_links sl ON sl.id = slc.short_link_id
              WHERE sl.owner_org_id = $1) AS total_clicks,
             (SELECT COUNT(*) FROM short_link_clicks slc
              JOIN short_links sl ON sl.id = slc.short_link_id
              WHERE sl.owner_org_id = $1 AND slc.clicked_at > now() - interval '7 days') AS clicks_7d,
             (SELECT COUNT(*) FROM short_link_clicks slc
              JOIN short_links sl ON sl.id = slc.short_link_id
              WHERE sl.owner_org_id = $1 AND slc.clicked_at > now() - interval '30 days') AS clicks_30d"#,
    )
    .bind(oid)
    .fetch_one(pool.get_ref())
    .await;

    match stats {
        Ok(s) => HttpResponse::Ok().json(s),
        Err(e) => {
            tracing::error!("Org stats query failed for {}: {}", oid, e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

/// GET /api/v1/orgs/{org_id}/links - List all links belonging to an organization.
#[cfg(feature = "platform")]
pub async fn org_links(
    req: HttpRequest,
    org_id: web::Path<Uuid>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let account = match extract_service_account(&req) {
        Some(a) => a,
        None => return HttpResponse::Unauthorized().json(serde_json::json!({"error": "Unauthorized"})),
    };
    if account.role != "platform_admin" && account.role != "org_admin" {
        return HttpResponse::Forbidden()
            .json(serde_json::json!({"error": "Requires platform_admin or org_admin role"}));
    }

    let oid = org_id.into_inner();

    let links = sqlx::query_as::<_, crate::models::ShortLink>(
        r#"SELECT id, code, target_url, link_type, domain, app_key,
                  owner_user_id, owner_org_id, affiliate_code, title,
                  is_active, expires_at, created_at, updated_at
           FROM short_links
           WHERE owner_org_id = $1
           ORDER BY created_at DESC"#,
    )
    .bind(oid)
    .fetch_all(pool.get_ref())
    .await;

    match links {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(e) => {
            tracing::error!("Org links query failed for {}: {}", oid, e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

// ---------------------------------------------------------------------------
// #361 - Platform dashboard (cross-org reporting)
// ---------------------------------------------------------------------------

#[cfg(feature = "platform")]
#[derive(Debug, serde::Serialize)]
pub struct PlatformDashboard {
    pub total_orgs: i64,
    pub total_users: i64,
    pub total_links: i64,
    pub total_clicks: i64,
    pub clicks_7d: i64,
    pub clicks_30d: i64,
    pub orgs: Vec<DashboardOrgSummary>,
    pub top_links: Vec<PlatformTopLink>,
    pub recent_activity: Vec<RecentActivity>,
}

#[cfg(feature = "platform")]
#[derive(Debug, serde::Serialize, sqlx::FromRow)]
pub struct DashboardOrgSummary {
    pub org_id: Uuid,
    pub name: String,
    pub slug: String,
    pub org_type: String,
    pub link_count: i64,
    pub click_count: i64,
    pub member_count: i64,
}

#[cfg(feature = "platform")]
#[derive(Debug, serde::Serialize, sqlx::FromRow)]
pub struct PlatformTopLink {
    pub code: String,
    pub org_slug: String,
    pub target_url: String,
    pub click_count: i64,
}

#[cfg(feature = "platform")]
#[derive(Debug, serde::Serialize, sqlx::FromRow)]
pub struct RecentActivity {
    pub action: String,
    pub org_slug: String,
    pub detail: String,
    pub created_at: String,
}

/// GET /api/v1/admin/dashboard - Full platform dashboard with cross-org reporting.
#[cfg(feature = "platform")]
pub async fn platform_dashboard(
    req: HttpRequest,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let account = match extract_service_account(&req) {
        Some(a) => a,
        None => return HttpResponse::Unauthorized().json(serde_json::json!({"error": "Unauthorized"})),
    };
    if let Err(resp) = require_role(&account, "platform_admin") {
        return resp;
    }

    // Global stats
    let stats = sqlx::query_as::<_, PlatformStats>(
        r#"SELECT
             (SELECT COUNT(*) FROM brickos.organizations) AS total_orgs,
             (SELECT COUNT(*) FROM brickos.users) AS total_users,
             (SELECT COUNT(*) FROM short_links) AS total_links,
             (SELECT COUNT(*) FROM short_link_clicks) AS total_clicks,
             (SELECT COUNT(*) FROM short_link_clicks WHERE clicked_at > now() - interval '7 days') AS clicks_7d,
             (SELECT COUNT(*) FROM short_link_clicks WHERE clicked_at > now() - interval '30 days') AS clicks_30d"#,
    )
    .fetch_one(pool.get_ref())
    .await;

    let stats = match stats {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Platform dashboard stats query failed: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}));
        }
    };

    // Top 10 orgs by activity
    let orgs = sqlx::query_as::<_, DashboardOrgSummary>(
        r#"SELECT
             o.id AS org_id,
             o.name,
             o.slug,
             COALESCE(o.org_type, 'clinic') AS org_type,
             COUNT(DISTINCT sl.id) AS link_count,
             COUNT(DISTINCT slc.id) AS click_count,
             (SELECT COUNT(*) FROM brickos.org_members om WHERE om.org_id = o.id) AS member_count
           FROM brickos.organizations o
           LEFT JOIN short_links sl ON sl.owner_org_id = o.id
           LEFT JOIN short_link_clicks slc ON slc.short_link_id = sl.id
           GROUP BY o.id, o.name, o.slug, o.org_type
           ORDER BY click_count DESC
           LIMIT 10"#,
    )
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    // Top 10 links by clicks
    let top_links = sqlx::query_as::<_, PlatformTopLink>(
        r#"SELECT
             sl.code,
             COALESCE(o.slug, '') AS org_slug,
             sl.target_url,
             COUNT(slc.id) AS click_count
           FROM short_links sl
           LEFT JOIN brickos.organizations o ON o.id = sl.owner_org_id
           LEFT JOIN short_link_clicks slc ON slc.short_link_id = sl.id
           GROUP BY sl.id, sl.code, o.slug, sl.target_url
           ORDER BY click_count DESC
           LIMIT 10"#,
    )
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    // Recent 20 activities (links created recently)
    let recent_activity = sqlx::query_as::<_, RecentActivity>(
        r#"SELECT
             'link_created' AS action,
             COALESCE(o.slug, '') AS org_slug,
             sl.code || ' -> ' || sl.target_url AS detail,
             to_char(sl.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
           FROM short_links sl
           LEFT JOIN brickos.organizations o ON o.id = sl.owner_org_id
           ORDER BY sl.created_at DESC
           LIMIT 20"#,
    )
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    HttpResponse::Ok().json(PlatformDashboard {
        total_orgs: stats.total_orgs,
        total_users: stats.total_users,
        total_links: stats.total_links,
        total_clicks: stats.total_clicks,
        clicks_7d: stats.clicks_7d,
        clicks_30d: stats.clicks_30d,
        orgs,
        top_links,
        recent_activity,
    })
}
