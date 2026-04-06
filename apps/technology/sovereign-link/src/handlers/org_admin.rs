//! Organization admin panel endpoints (#357, #358, #359).
//!
//! Slug-based org administration: dashboard stats, link management, and member
//! management. All endpoints resolve the org by slug and return JSON responses
//! for consumption by the platform frontend.

#[cfg(feature = "platform")]
use actix_web::{web, HttpResponse};
#[cfg(feature = "platform")]
use chrono::{DateTime, Utc};
#[cfg(feature = "platform")]
use serde::{Deserialize, Serialize};
#[cfg(feature = "platform")]
use sqlx::PgPool;
#[cfg(feature = "platform")]
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Resolve an org slug to (org_id, org_name). Returns None if not found.
#[cfg(feature = "platform")]
async fn resolve_org(slug: &str, pool: &PgPool) -> Option<(Uuid, String)> {
    sqlx::query_as::<_, (Uuid, String)>(
        "SELECT id, name FROM brickos.organizations WHERE slug = $1 AND is_active = true",
    )
    .bind(slug)
    .fetch_optional(pool)
    .await
    .ok()?
}

// ---------------------------------------------------------------------------
// #357 - Dashboard
// ---------------------------------------------------------------------------

#[cfg(feature = "platform")]
#[derive(Debug, Serialize)]
pub struct OrgDashboard {
    pub org_id: Uuid,
    pub org_name: String,
    pub org_slug: String,
    pub total_links: i64,
    pub total_clicks: i64,
    pub clicks_7d: i64,
    pub clicks_30d: i64,
    pub member_count: i64,
    pub top_links: Vec<TopLink>,
}

#[cfg(feature = "platform")]
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct TopLink {
    pub code: String,
    pub target_url: String,
    pub click_count: i64,
    pub created_at: String,
}

/// GET /org/{slug}/dashboard - Org stats overview.
#[cfg(feature = "platform")]
pub async fn org_dashboard(
    slug: web::Path<String>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let slug = slug.into_inner();
    let (org_id, org_name) = match resolve_org(&slug, pool.get_ref()).await {
        Some(v) => v,
        None => {
            return HttpResponse::NotFound()
                .json(serde_json::json!({"error": "Organization not found"}));
        }
    };

    // Fetch aggregate stats in a single query
    #[derive(sqlx::FromRow)]
    struct Stats {
        total_links: i64,
        total_clicks: i64,
        clicks_7d: i64,
        clicks_30d: i64,
        member_count: i64,
    }

    let stats = sqlx::query_as::<_, Stats>(
        r#"SELECT
             (SELECT COUNT(*) FROM short_links WHERE owner_org_id = $1) AS total_links,
             (SELECT COUNT(*) FROM short_link_clicks slc
              JOIN short_links sl ON sl.id = slc.short_link_id
              WHERE sl.owner_org_id = $1) AS total_clicks,
             (SELECT COUNT(*) FROM short_link_clicks slc
              JOIN short_links sl ON sl.id = slc.short_link_id
              WHERE sl.owner_org_id = $1
                AND slc.clicked_at > now() - interval '7 days') AS clicks_7d,
             (SELECT COUNT(*) FROM short_link_clicks slc
              JOIN short_links sl ON sl.id = slc.short_link_id
              WHERE sl.owner_org_id = $1
                AND slc.clicked_at > now() - interval '30 days') AS clicks_30d,
             (SELECT COUNT(*) FROM brickos.org_members WHERE org_id = $1) AS member_count"#,
    )
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await;

    let stats = match stats {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Org dashboard stats query failed for {}: {}", slug, e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}));
        }
    };

    // Top 5 performing links by click count
    let top_links = sqlx::query_as::<_, TopLink>(
        r#"SELECT
             sl.code,
             sl.target_url,
             COUNT(slc.id) AS click_count,
             to_char(sl.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
           FROM short_links sl
           LEFT JOIN short_link_clicks slc ON slc.short_link_id = sl.id
           WHERE sl.owner_org_id = $1
           GROUP BY sl.id, sl.code, sl.target_url, sl.created_at
           ORDER BY click_count DESC
           LIMIT 5"#,
    )
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await;

    let top_links = match top_links {
        Ok(links) => links,
        Err(e) => {
            tracing::error!("Org top links query failed for {}: {}", slug, e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}));
        }
    };

    HttpResponse::Ok().json(OrgDashboard {
        org_id,
        org_name,
        org_slug: slug,
        total_links: stats.total_links,
        total_clicks: stats.total_clicks,
        clicks_7d: stats.clicks_7d,
        clicks_30d: stats.clicks_30d,
        member_count: stats.member_count,
        top_links,
    })
}

// ---------------------------------------------------------------------------
// #358 - Link management
// ---------------------------------------------------------------------------

#[cfg(feature = "platform")]
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct OrgLink {
    pub id: Uuid,
    pub code: String,
    pub target_url: String,
    pub click_count: i64,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

#[cfg(feature = "platform")]
#[derive(Debug, Deserialize)]
pub struct CreateOrgLinkRequest {
    pub code: Option<String>,
    pub target_url: String,
    pub link_type: Option<String>,
    pub domain: Option<String>,
    pub app_key: Option<String>,
    pub title: Option<String>,
    pub expires_at: Option<DateTime<Utc>>,
}

#[cfg(feature = "platform")]
#[derive(Debug, Deserialize)]
pub struct UpdateOrgLinkRequest {
    pub target_url: Option<String>,
    pub title: Option<String>,
    pub is_active: Option<bool>,
    pub expires_at: Option<DateTime<Utc>>,
}

/// GET /org/{slug}/links - List all links in the org.
#[cfg(feature = "platform")]
pub async fn org_link_list(
    slug: web::Path<String>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let slug = slug.into_inner();
    let (org_id, _) = match resolve_org(&slug, pool.get_ref()).await {
        Some(v) => v,
        None => {
            return HttpResponse::NotFound()
                .json(serde_json::json!({"error": "Organization not found"}));
        }
    };

    let links = sqlx::query_as::<_, OrgLink>(
        r#"SELECT
             sl.id,
             sl.code,
             sl.target_url,
             COUNT(slc.id) AS click_count,
             sl.is_active,
             sl.created_at
           FROM short_links sl
           LEFT JOIN short_link_clicks slc ON slc.short_link_id = sl.id
           WHERE sl.owner_org_id = $1
           GROUP BY sl.id, sl.code, sl.target_url, sl.is_active, sl.created_at
           ORDER BY sl.created_at DESC"#,
    )
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await;

    match links {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(e) => {
            tracing::error!("Org link list query failed for {}: {}", slug, e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

/// POST /org/{slug}/links - Create a link in the org namespace.
#[cfg(feature = "platform")]
pub async fn org_create_link(
    slug: web::Path<String>,
    body: web::Json<CreateOrgLinkRequest>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let slug = slug.into_inner();
    let (org_id, _) = match resolve_org(&slug, pool.get_ref()).await {
        Some(v) => v,
        None => {
            return HttpResponse::NotFound()
                .json(serde_json::json!({"error": "Organization not found"}));
        }
    };

    let data = body.into_inner();
    let code = data.code.unwrap_or_else(generate_short_code);
    let link_type = data.link_type.unwrap_or_else(|| "generic".to_string());
    let domain = data.domain.unwrap_or_else(|| "link".to_string());
    let app_key = data.app_key.unwrap_or_else(|| "sovereign-link".to_string());

    let link = sqlx::query_as::<_, crate::models::ShortLink>(
        r#"INSERT INTO short_links (id, code, target_url, link_type, domain, app_key,
                                    owner_org_id, title, expires_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, code, target_url, link_type, domain, app_key,
                     owner_user_id, owner_org_id, affiliate_code, title,
                     is_active, expires_at, created_at, updated_at"#,
    )
    .bind(&code)
    .bind(&data.target_url)
    .bind(&link_type)
    .bind(&domain)
    .bind(&app_key)
    .bind(org_id)
    .bind(&data.title)
    .bind(data.expires_at)
    .fetch_one(pool.get_ref())
    .await;

    match link {
        Ok(l) => HttpResponse::Created().json(l),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("duplicate") || msg.contains("unique") {
                HttpResponse::Conflict()
                    .json(serde_json::json!({"error": "Link code already exists"}))
            } else {
                tracing::error!("Org create link failed for {}: {}", slug, e);
                HttpResponse::InternalServerError()
                    .json(serde_json::json!({"error": "Internal error"}))
            }
        }
    }
}

/// PUT /org/{slug}/links/{link_id} - Update a link.
#[cfg(feature = "platform")]
pub async fn org_update_link(
    path: web::Path<(String, Uuid)>,
    body: web::Json<UpdateOrgLinkRequest>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let (slug, link_id) = path.into_inner();
    let (org_id, _) = match resolve_org(&slug, pool.get_ref()).await {
        Some(v) => v,
        None => {
            return HttpResponse::NotFound()
                .json(serde_json::json!({"error": "Organization not found"}));
        }
    };

    let data = body.into_inner();

    // Build dynamic SET clause based on provided fields
    let result = sqlx::query(
        r#"UPDATE short_links
           SET target_url  = COALESCE($3, target_url),
               title       = COALESCE($4, title),
               is_active   = COALESCE($5, is_active),
               expires_at  = COALESCE($6, expires_at),
               updated_at  = now()
           WHERE id = $1 AND owner_org_id = $2"#,
    )
    .bind(link_id)
    .bind(org_id)
    .bind(&data.target_url)
    .bind(&data.title)
    .bind(data.is_active)
    .bind(data.expires_at)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(r) if r.rows_affected() == 0 => HttpResponse::NotFound()
            .json(serde_json::json!({"error": "Link not found in this organization"})),
        Ok(_) => HttpResponse::Ok()
            .json(serde_json::json!({"status": "updated"})),
        Err(e) => {
            tracing::error!("Org update link failed for {}/{}: {}", slug, link_id, e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

/// DELETE /org/{slug}/links/{link_id} - Deactivate a link (soft delete).
#[cfg(feature = "platform")]
pub async fn org_deactivate_link(
    path: web::Path<(String, Uuid)>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let (slug, link_id) = path.into_inner();
    let (org_id, _) = match resolve_org(&slug, pool.get_ref()).await {
        Some(v) => v,
        None => {
            return HttpResponse::NotFound()
                .json(serde_json::json!({"error": "Organization not found"}));
        }
    };

    let result = sqlx::query(
        "UPDATE short_links SET is_active = false, updated_at = now() \
         WHERE id = $1 AND owner_org_id = $2",
    )
    .bind(link_id)
    .bind(org_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(r) if r.rows_affected() == 0 => HttpResponse::NotFound()
            .json(serde_json::json!({"error": "Link not found in this organization"})),
        Ok(_) => HttpResponse::Ok()
            .json(serde_json::json!({"status": "deactivated"})),
        Err(e) => {
            tracing::error!("Org deactivate link failed for {}/{}: {}", slug, link_id, e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

// ---------------------------------------------------------------------------
// #359 - Member management
// ---------------------------------------------------------------------------

#[cfg(feature = "platform")]
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct OrgMember {
    pub user_id: Uuid,
    pub email: Option<String>,
    pub display_name: Option<String>,
    pub role: String,
    pub joined_at: DateTime<Utc>,
}

#[cfg(feature = "platform")]
#[derive(Debug, Deserialize)]
pub struct InviteMemberRequest {
    pub email: String,
    pub role: Option<String>,
}

#[cfg(feature = "platform")]
#[derive(Debug, Deserialize)]
pub struct ChangeRoleRequest {
    pub role: String,
}

/// GET /org/{slug}/members - List all members.
#[cfg(feature = "platform")]
pub async fn org_member_list(
    slug: web::Path<String>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let slug = slug.into_inner();
    let (org_id, _) = match resolve_org(&slug, pool.get_ref()).await {
        Some(v) => v,
        None => {
            return HttpResponse::NotFound()
                .json(serde_json::json!({"error": "Organization not found"}));
        }
    };

    let members = sqlx::query_as::<_, OrgMember>(
        r#"SELECT
             om.user_id,
             u.email,
             u.display_name,
             om.role,
             om.joined_at
           FROM brickos.org_members om
           JOIN brickos.users u ON u.id = om.user_id
           WHERE om.org_id = $1
           ORDER BY om.joined_at"#,
    )
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await;

    match members {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(e) => {
            tracing::error!("Org member list query failed for {}: {}", slug, e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

/// POST /org/{slug}/members/invite - Invite a user by email.
#[cfg(feature = "platform")]
pub async fn org_invite_member(
    slug: web::Path<String>,
    body: web::Json<InviteMemberRequest>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let slug = slug.into_inner();
    let (org_id, _) = match resolve_org(&slug, pool.get_ref()).await {
        Some(v) => v,
        None => {
            return HttpResponse::NotFound()
                .json(serde_json::json!({"error": "Organization not found"}));
        }
    };

    let data = body.into_inner();
    let role = data.role.unwrap_or_else(|| "org_member".to_string());

    // Validate role
    if !["org_admin", "org_member"].contains(&role.as_str()) {
        return HttpResponse::BadRequest()
            .json(serde_json::json!({"error": "Invalid role. Must be org_admin or org_member"}));
    }

    // Look up user by email
    let user_id = sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM brickos.users WHERE email = $1",
    )
    .bind(&data.email)
    .fetch_optional(pool.get_ref())
    .await;

    let user_id = match user_id {
        Ok(Some(id)) => id,
        Ok(None) => {
            return HttpResponse::NotFound()
                .json(serde_json::json!({"error": "User not found with that email"}));
        }
        Err(e) => {
            tracing::error!("User lookup failed for {}: {}", data.email, e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}));
        }
    };

    // Insert into org_members
    let result = sqlx::query(
        "INSERT INTO brickos.org_members (org_id, user_id, role) VALUES ($1, $2, $3)",
    )
    .bind(org_id)
    .bind(user_id)
    .bind(&role)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => HttpResponse::Created()
            .json(serde_json::json!({"status": "invited", "user_id": user_id, "role": role})),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("duplicate") || msg.contains("unique") {
                HttpResponse::Conflict()
                    .json(serde_json::json!({"error": "User is already a member of this organization"}))
            } else {
                tracing::error!("Org invite member failed for {}: {}", slug, e);
                HttpResponse::InternalServerError()
                    .json(serde_json::json!({"error": "Internal error"}))
            }
        }
    }
}

/// PUT /org/{slug}/members/{user_id}/role - Change a member's role.
#[cfg(feature = "platform")]
pub async fn org_change_role(
    path: web::Path<(String, Uuid)>,
    body: web::Json<ChangeRoleRequest>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let (slug, user_id) = path.into_inner();
    let (org_id, _) = match resolve_org(&slug, pool.get_ref()).await {
        Some(v) => v,
        None => {
            return HttpResponse::NotFound()
                .json(serde_json::json!({"error": "Organization not found"}));
        }
    };

    let data = body.into_inner();

    // Validate role
    if !["org_owner", "org_admin", "org_member"].contains(&data.role.as_str()) {
        return HttpResponse::BadRequest()
            .json(serde_json::json!({"error": "Invalid role. Must be org_owner, org_admin, or org_member"}));
    }

    let result = sqlx::query(
        "UPDATE brickos.org_members SET role = $3 WHERE org_id = $1 AND user_id = $2",
    )
    .bind(org_id)
    .bind(user_id)
    .bind(&data.role)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(r) if r.rows_affected() == 0 => HttpResponse::NotFound()
            .json(serde_json::json!({"error": "Member not found in this organization"})),
        Ok(_) => HttpResponse::Ok()
            .json(serde_json::json!({"status": "role_updated", "role": data.role})),
        Err(e) => {
            tracing::error!("Org change role failed for {}/{}: {}", slug, user_id, e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

/// DELETE /org/{slug}/members/{user_id} - Remove a member (cannot remove org_owner).
#[cfg(feature = "platform")]
pub async fn org_remove_member(
    path: web::Path<(String, Uuid)>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let (slug, user_id) = path.into_inner();
    let (org_id, _) = match resolve_org(&slug, pool.get_ref()).await {
        Some(v) => v,
        None => {
            return HttpResponse::NotFound()
                .json(serde_json::json!({"error": "Organization not found"}));
        }
    };

    // Check if user is the org owner - cannot remove them
    let role = sqlx::query_scalar::<_, String>(
        "SELECT role FROM brickos.org_members WHERE org_id = $1 AND user_id = $2",
    )
    .bind(org_id)
    .bind(user_id)
    .fetch_optional(pool.get_ref())
    .await;

    match role {
        Ok(Some(ref r)) if r == "org_owner" => {
            return HttpResponse::Forbidden()
                .json(serde_json::json!({"error": "Cannot remove the organization owner"}));
        }
        Ok(None) => {
            return HttpResponse::NotFound()
                .json(serde_json::json!({"error": "Member not found in this organization"}));
        }
        Err(e) => {
            tracing::error!("Org member role lookup failed for {}/{}: {}", slug, user_id, e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}));
        }
        _ => {} // proceed with removal
    }

    let result = sqlx::query(
        "DELETE FROM brickos.org_members WHERE org_id = $1 AND user_id = $2",
    )
    .bind(org_id)
    .bind(user_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => HttpResponse::Ok()
            .json(serde_json::json!({"status": "removed"})),
        Err(e) => {
            tracing::error!("Org remove member failed for {}/{}: {}", slug, user_id, e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// Generate a 6-char random alphanumeric code for short links.
#[cfg(feature = "platform")]
fn generate_short_code() -> String {
    use rand::Rng;
    let mut rng = rand::rng();
    let chars: Vec<char> = "abcdefghijklmnopqrstuvwxyz0123456789".chars().collect();
    (0..6)
        .map(|_| chars[rng.random_range(0..chars.len())])
        .collect()
}
