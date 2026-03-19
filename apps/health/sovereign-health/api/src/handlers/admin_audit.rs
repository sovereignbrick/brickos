// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Admin audit log endpoints — browse, search, and purge audit data.

use actix_web::{web, HttpResponse};
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;

use crate::error::AppError;
use crate::middleware::auth::AuthenticatedUser;

#[derive(Deserialize)]
pub struct AuditQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub search: Option<String>,
    pub action: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
    pub sort: Option<String>,
    pub order: Option<String>,
}

#[derive(Deserialize)]
pub struct PurgeQuery {
    pub older_than_days: Option<i64>,
}

/// GET /admin/audit/access-logs
pub async fn access_logs(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    query: web::Query<AuditQuery>,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    if auth.role != "admin" {
        return Err(AppError::Forbidden);
    }

    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(25).min(100);
    let offset = (page - 1) * per_page;

    let sort_col = match query.sort.as_deref() {
        Some("action") => "dal.action",
        Some("resource") => "dal.resource",
        Some("user") => "u.email",
        _ => "dal.created_at",
    };
    let sort_dir = if query.order.as_deref() == Some("asc") {
        "ASC"
    } else {
        "DESC"
    };

    let rows = sqlx::query(&format!(
        "WITH filtered AS ( \
           SELECT dal.id, dal.user_id, u.email as user_email, \
                  dal.accessed_by, u2.email as accessed_by_email, \
                  dal.action, dal.resource, dal.resource_id, \
                  dal.ip_hash, dal.metadata, dal.created_at, \
                  COUNT(*) OVER() as total_count \
           FROM data_access_log dal \
           LEFT JOIN users u ON u.id = dal.user_id \
           LEFT JOIN users u2 ON u2.id = dal.accessed_by \
           WHERE ($3 = '' OR dal.action = $3) \
             AND ($4 = '' OR u.email ILIKE $4 OR u2.email ILIKE $4 OR dal.action ILIKE $4 OR dal.resource ILIKE $4) \
             AND ($5 = '' OR dal.created_at >= $5::timestamptz) \
             AND ($6 = '' OR dal.created_at <= $6::timestamptz) \
           ORDER BY {sort_col} {sort_dir} \
           LIMIT $1 OFFSET $2 \
         ) SELECT * FROM filtered"
    ))
    .bind(per_page)
    .bind(offset)
    .bind(query.action.as_deref().unwrap_or(""))
    .bind(if query.search.is_some() { format!("%{}%", query.search.as_deref().unwrap_or("")) } else { String::new() })
    .bind(query.from.as_deref().unwrap_or(""))
    .bind(query.to.as_deref().unwrap_or(""))
    .fetch_all(pool.get_ref())
    .await?;

    let total: i64 = rows
        .first()
        .and_then(|r| r.try_get("total_count").ok())
        .unwrap_or(0);

    let entries: Vec<serde_json::Value> = rows.iter().map(|r| {
        json!({
            "id": r.try_get::<uuid::Uuid, _>("id").ok(),
            "user_email": r.try_get::<Option<String>, _>("user_email").ok().flatten(),
            "accessed_by_email": r.try_get::<Option<String>, _>("accessed_by_email").ok().flatten(),
            "action": r.try_get::<String, _>("action").unwrap_or_default(),
            "resource": r.try_get::<String, _>("resource").unwrap_or_default(),
            "resource_id": r.try_get::<Option<uuid::Uuid>, _>("resource_id").ok().flatten(),
            "ip_hash": r.try_get::<Option<String>, _>("ip_hash").ok().flatten(),
            "metadata": r.try_get::<Option<serde_json::Value>, _>("metadata").ok().flatten(),
            "created_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
        })
    }).collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": { "entries": entries, "total": total, "page": page, "per_page": per_page },
        "error": null
    })))
}

/// GET /admin/audit/events
pub async fn event_logs(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    query: web::Query<AuditQuery>,
) -> Result<HttpResponse, AppError> {
    use sqlx::Row;

    if auth.role != "admin" {
        return Err(AppError::Forbidden);
    }

    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(25).min(100);
    let offset = (page - 1) * per_page;

    let sort_col = match query.sort.as_deref() {
        Some("action") => "al.action",
        Some("resource_type") => "al.resource_type",
        Some("user") => "u.email",
        _ => "al.created_at",
    };
    let sort_dir = if query.order.as_deref() == Some("asc") {
        "ASC"
    } else {
        "DESC"
    };

    let rows = sqlx::query(&format!(
        "WITH filtered AS ( \
           SELECT al.id, al.user_id, u.email as user_email, \
                  al.action, al.resource_type, al.resource_id, \
                  al.ip_address, al.metadata, al.created_at, \
                  COUNT(*) OVER() as total_count \
           FROM audit_log al \
           LEFT JOIN users u ON u.id = al.user_id \
           WHERE ($3 = '' OR al.action = $3) \
             AND ($4 = '' OR u.email ILIKE $4 OR al.action ILIKE $4 OR COALESCE(al.resource_type,'') ILIKE $4) \
             AND ($5 = '' OR al.created_at >= $5::timestamptz) \
             AND ($6 = '' OR al.created_at <= $6::timestamptz) \
           ORDER BY {sort_col} {sort_dir} \
           LIMIT $1 OFFSET $2 \
         ) SELECT * FROM filtered"
    ))
    .bind(per_page)
    .bind(offset)
    .bind(query.action.as_deref().unwrap_or(""))
    .bind(if query.search.is_some() { format!("%{}%", query.search.as_deref().unwrap_or("")) } else { String::new() })
    .bind(query.from.as_deref().unwrap_or(""))
    .bind(query.to.as_deref().unwrap_or(""))
    .fetch_all(pool.get_ref())
    .await?;

    let total: i64 = rows
        .first()
        .and_then(|r| r.try_get("total_count").ok())
        .unwrap_or(0);

    let entries: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "id": r.try_get::<uuid::Uuid, _>("id").ok(),
                "user_email": r.try_get::<Option<String>, _>("user_email").ok().flatten(),
                "action": r.try_get::<String, _>("action").unwrap_or_default(),
                "resource_type": r.try_get::<Option<String>, _>("resource_type").ok().flatten(),
                "resource_id": r.try_get::<Option<uuid::Uuid>, _>("resource_id").ok().flatten(),
                "ip_address": r.try_get::<Option<String>, _>("ip_address").ok().flatten(),
                "metadata": r.try_get::<Option<serde_json::Value>, _>("metadata").ok().flatten(),
                "created_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": { "entries": entries, "total": total, "page": page, "per_page": per_page },
        "error": null
    })))
}

/// GET /admin/audit/stats
pub async fn audit_stats(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    if auth.role != "admin" {
        return Err(AppError::Forbidden);
    }

    let access_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM data_access_log")
        .fetch_one(pool.get_ref())
        .await
        .unwrap_or(0);
    let event_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM audit_log")
        .fetch_one(pool.get_ref())
        .await
        .unwrap_or(0);

    let access_oldest: Option<chrono::DateTime<chrono::Utc>> =
        sqlx::query_scalar("SELECT MIN(created_at) FROM data_access_log")
            .fetch_one(pool.get_ref())
            .await
            .ok()
            .flatten();

    let event_oldest: Option<chrono::DateTime<chrono::Utc>> =
        sqlx::query_scalar("SELECT MIN(created_at) FROM audit_log")
            .fetch_one(pool.get_ref())
            .await
            .ok()
            .flatten();

    let retention_days = crate::handlers::admin_settings::get_setting_i64(
        pool.get_ref(),
        "audit_retention_days",
        90,
    )
    .await;

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "access_log_count": access_count,
            "event_log_count": event_count,
            "access_log_oldest": access_oldest,
            "event_log_oldest": event_oldest,
            "retention_days": retention_days,
        },
        "error": null
    })))
}

/// DELETE /admin/audit/purge
pub async fn purge_logs(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    query: web::Query<PurgeQuery>,
) -> Result<HttpResponse, AppError> {
    if auth.role != "admin" {
        return Err(AppError::Forbidden);
    }

    let days = query.older_than_days.unwrap_or(90).max(7); // minimum 7 days
    let cutoff = chrono::Utc::now() - chrono::Duration::days(days);

    let access_deleted: u64 = sqlx::query("DELETE FROM data_access_log WHERE created_at < $1")
        .bind(cutoff)
        .execute(pool.get_ref())
        .await?
        .rows_affected();

    let events_deleted: u64 = sqlx::query("DELETE FROM audit_log WHERE created_at < $1")
        .bind(cutoff)
        .execute(pool.get_ref())
        .await?
        .rows_affected();

    // Log the purge action itself
    crate::services::audit::log(
        pool.get_ref(),
        Some(auth.user_id),
        "audit_purge",
        Some("audit_log"),
        None,
        None,
        Some(json!({ "older_than_days": days, "access_deleted": access_deleted, "events_deleted": events_deleted })),
    ).await;

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "access_logs_deleted": access_deleted,
            "event_logs_deleted": events_deleted,
            "cutoff_date": cutoff,
        },
        "error": null
    })))
}
