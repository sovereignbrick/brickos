// BrickOS Platform -- Per-Org App Enablement (Admin)
//
// Manages which apps are enabled for each organization.
// Platform admins can configure; org admins see only their enabled apps.

use actix_web::{web, HttpResponse};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::middleware::auth::AdminUser;

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct OrgApp {
    pub app_key: String,
    pub enabled: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateOrgAppsRequest {
    pub apps: Vec<AppEnablement>,
}

#[derive(Debug, Deserialize)]
pub struct AppEnablement {
    pub app_key: String,
    pub enabled: bool,
}

/// GET /admin/organizations/{org_id}/apps -- list enabled apps for an org
pub async fn list_org_apps(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let org_id = path.into_inner();

    let apps = sqlx::query_as::<_, OrgApp>(
        "SELECT app_key, enabled, created_at FROM brickos.org_apps WHERE org_id = $1 ORDER BY app_key",
    )
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(|_| AppError::Internal)?;

    Ok(HttpResponse::Ok().json(apps))
}

/// PUT /admin/organizations/{org_id}/apps -- update enabled apps for an org
pub async fn update_org_apps(
    pool: web::Data<PgPool>,
    _admin: AdminUser,
    path: web::Path<Uuid>,
    body: web::Json<UpdateOrgAppsRequest>,
) -> Result<HttpResponse, AppError> {
    let org_id = path.into_inner();

    for app in &body.apps {
        sqlx::query(
            "INSERT INTO brickos.org_apps (org_id, app_key, enabled)
             VALUES ($1, $2, $3)
             ON CONFLICT (org_id, app_key) DO UPDATE SET enabled = EXCLUDED.enabled",
        )
        .bind(org_id)
        .bind(&app.app_key)
        .bind(app.enabled)
        .execute(pool.get_ref())
        .await
        .map_err(|_| AppError::Internal)?;
    }

    // Return updated list
    let apps = sqlx::query_as::<_, OrgApp>(
        "SELECT app_key, enabled, created_at FROM brickos.org_apps WHERE org_id = $1 ORDER BY app_key",
    )
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(|_| AppError::Internal)?;

    Ok(HttpResponse::Ok().json(apps))
}

/// Helper: get list of enabled app keys for an org.
/// Other handlers can call this to check app access.
pub async fn get_enabled_apps(pool: &PgPool, org_id: Uuid) -> Result<Vec<String>, sqlx::Error> {
    let rows = sqlx::query_scalar::<_, String>(
        "SELECT app_key FROM brickos.org_apps WHERE org_id = $1 AND enabled = true",
    )
    .bind(org_id)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}
