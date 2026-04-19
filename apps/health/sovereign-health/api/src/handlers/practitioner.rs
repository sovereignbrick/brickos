// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Sprint 044 #553: Practitioner dashboard endpoints.
// Practitioners (org_role=practitioner or org_owner) can view their org's
// members and access each member's health data read-only.

use actix_web::{web, HttpResponse};
use serde::Deserialize;
use serde_json::json;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::{error::AppError, middleware::auth::AuthenticatedUser};

/// GET /practitioner/members -- list org members for the practitioner's org
pub async fn list_members(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let org_id = auth.org_id.ok_or(AppError::Forbidden)?;
    let org_role = auth.org_role.as_deref().unwrap_or("");

    // Only practitioners and org owners can view member list
    if !matches!(org_role, "org_owner" | "practitioner") && auth.role != "admin" {
        return Err(AppError::Forbidden);
    }

    let rows = sqlx::query(
        r#"SELECT om.user_id, u.email, u.display_name, om.role, om.joined_at,
                  u.last_active_at
           FROM org_members om
           JOIN users u ON u.id = om.user_id
           WHERE om.org_id = $1
           ORDER BY u.display_name, u.email"#,
    )
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await?;

    let members: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "user_id": r.try_get::<Uuid, _>("user_id").unwrap_or_default(),
                "email": r.try_get::<String, _>("email").unwrap_or_default(),
                "display_name": r.try_get::<Option<String>, _>("display_name").ok().flatten(),
                "role": r.try_get::<String, _>("role").unwrap_or_default(),
                "joined_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("joined_at").ok(),
                "last_active_at": r.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("last_active_at").ok().flatten(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": members,
        "error": null
    })))
}

#[derive(Deserialize)]
pub struct MemberQuery {
    pub user_id: Uuid,
}

/// GET /practitioner/members/{user_id}/summary -- read-only health summary for a member
pub async fn member_summary(
    pool: web::Data<PgPool>,
    auth: AuthenticatedUser,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let org_id = auth.org_id.ok_or(AppError::Forbidden)?;
    let org_role = auth.org_role.as_deref().unwrap_or("");
    let target_user_id = path.into_inner();

    if !matches!(org_role, "org_owner" | "practitioner") && auth.role != "admin" {
        return Err(AppError::Forbidden);
    }

    // Verify target user is in the same org
    let is_member: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM org_members WHERE org_id = $1 AND user_id = $2)",
    )
    .bind(org_id)
    .bind(target_user_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(false);

    if !is_member {
        return Err(AppError::NotFound);
    }

    // Fetch recent measurements summary
    let measurement_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM measurements WHERE user_id = $1")
            .bind(target_user_id)
            .fetch_one(pool.get_ref())
            .await
            .unwrap_or(0);

    let latest_measurement: Option<chrono::DateTime<chrono::Utc>> =
        sqlx::query_scalar("SELECT MAX(measured_at) FROM measurements WHERE user_id = $1")
            .bind(target_user_id)
            .fetch_one(pool.get_ref())
            .await
            .ok()
            .flatten();

    // Get user profile
    let user_row = sqlx::query("SELECT email, display_name, created_at FROM users WHERE id = $1")
        .bind(target_user_id)
        .fetch_optional(pool.get_ref())
        .await?;

    let profile = user_row.map(|r| {
        json!({
            "email": r.try_get::<String, _>("email").unwrap_or_default(),
            "display_name": r.try_get::<Option<String>, _>("display_name").ok().flatten(),
            "created_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
        })
    });

    // Get recent marker values (last 5 distinct markers)
    let recent_markers = sqlx::query(
        r#"SELECT DISTINCT ON (m.marker_id) m.marker_id, mk.name as marker_name,
                  m.value, m.unit, m.measured_at
           FROM measurements m
           JOIN markers mk ON mk.id = m.marker_id
           WHERE m.user_id = $1
           ORDER BY m.marker_id, m.measured_at DESC
           LIMIT 10"#,
    )
    .bind(target_user_id)
    .fetch_all(pool.get_ref())
    .await?;

    let markers: Vec<serde_json::Value> = recent_markers
        .iter()
        .map(|r| {
            json!({
                "marker_name": r.try_get::<String, _>("marker_name").unwrap_or_default(),
                "value": r.try_get::<f64, _>("value").unwrap_or(0.0),
                "unit": r.try_get::<Option<String>, _>("unit").ok().flatten(),
                "measured_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("measured_at").ok(),
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(json!({
        "data": {
            "user_id": target_user_id,
            "profile": profile,
            "measurement_count": measurement_count,
            "latest_measurement": latest_measurement,
            "recent_markers": markers,
        },
        "error": null
    })))
}
