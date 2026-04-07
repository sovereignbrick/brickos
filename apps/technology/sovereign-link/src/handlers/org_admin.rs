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
pub async fn org_dashboard(slug: web::Path<String>, pool: web::Data<PgPool>) -> HttpResponse {
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
pub async fn org_link_list(slug: web::Path<String>, pool: web::Data<PgPool>) -> HttpResponse {
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
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
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
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({"status": "updated"})),
        Err(e) => {
            tracing::error!("Org update link failed for {}/{}: {}", slug, link_id, e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
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
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({"status": "deactivated"})),
        Err(e) => {
            tracing::error!("Org deactivate link failed for {}/{}: {}", slug, link_id, e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
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
pub async fn org_member_list(slug: web::Path<String>, pool: web::Data<PgPool>) -> HttpResponse {
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
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
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
    let user_id = sqlx::query_scalar::<_, Uuid>("SELECT id FROM brickos.users WHERE email = $1")
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
    let result =
        sqlx::query("INSERT INTO brickos.org_members (org_id, user_id, role) VALUES ($1, $2, $3)")
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
                HttpResponse::Conflict().json(
                    serde_json::json!({"error": "User is already a member of this organization"}),
                )
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

    let result =
        sqlx::query("UPDATE brickos.org_members SET role = $3 WHERE org_id = $1 AND user_id = $2")
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
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
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
            tracing::error!(
                "Org member role lookup failed for {}/{}: {}",
                slug,
                user_id,
                e
            );
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}));
        }
        _ => {} // proceed with removal
    }

    let result = sqlx::query("DELETE FROM brickos.org_members WHERE org_id = $1 AND user_id = $2")
        .bind(org_id)
        .bind(user_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({"status": "removed"})),
        Err(e) => {
            tracing::error!("Org remove member failed for {}/{}: {}", slug, user_id, e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

// ---------------------------------------------------------------------------
// #360 - Org onboarding wizard
// ---------------------------------------------------------------------------

#[cfg(feature = "platform")]
#[derive(Debug, Deserialize)]
pub struct CreateOrgRequest {
    pub name: String,
    pub slug: String,
    pub org_type: Option<String>,
    pub branding: Option<super::branding::OrgBranding>,
    pub first_link: Option<FirstLinkRequest>,
    pub admin_email: Option<String>,
}

#[cfg(feature = "platform")]
#[derive(Debug, Deserialize)]
pub struct FirstLinkRequest {
    pub target_url: String,
    pub code: Option<String>,
}

#[cfg(feature = "platform")]
#[derive(Debug, Serialize)]
pub struct CreateOrgResponse {
    pub org_id: Uuid,
    pub slug: String,
    pub links_created: usize,
    pub members_invited: usize,
}

/// POST /api/v1/orgs - Create a new organization with initial setup.
#[cfg(feature = "platform")]
pub async fn create_org(
    body: web::Json<CreateOrgRequest>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let data = body.into_inner();

    // 1. Validate slug: lowercase, alphanumeric + hyphens, 3-30 chars
    let slug = data.slug.to_lowercase();
    if slug.len() < 3 || slug.len() > 30 {
        return HttpResponse::BadRequest()
            .json(serde_json::json!({"error": "Slug must be 3-30 characters"}));
    }
    if !slug
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
    {
        return HttpResponse::BadRequest()
            .json(serde_json::json!({"error": "Slug must contain only lowercase letters, digits, and hyphens"}));
    }

    // 2. Check slug not reserved
    let reserved =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM brickos.reserved_codes WHERE code = $1")
            .bind(&slug)
            .fetch_one(pool.get_ref())
            .await;

    match reserved {
        Ok(count) if count > 0 => {
            return HttpResponse::Conflict().json(serde_json::json!({"error": "Slug is reserved"}));
        }
        Err(e) => {
            tracing::error!("Reserved code check failed: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}));
        }
        _ => {}
    }

    // 3. Check slug not taken
    let taken =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM brickos.organizations WHERE slug = $1")
            .bind(&slug)
            .fetch_one(pool.get_ref())
            .await;

    match taken {
        Ok(count) if count > 0 => {
            return HttpResponse::Conflict()
                .json(serde_json::json!({"error": "Slug is already taken"}));
        }
        Err(e) => {
            tracing::error!("Slug uniqueness check failed: {}", e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}));
        }
        _ => {}
    }

    // 4. Insert organization
    let org_type = data.org_type.unwrap_or_else(|| "clinic".to_string());
    let org_id = Uuid::new_v4();

    let insert = sqlx::query(
        r#"INSERT INTO brickos.organizations (id, name, slug, org_type, is_active)
           VALUES ($1, $2, $3, $4, true)"#,
    )
    .bind(org_id)
    .bind(&data.name)
    .bind(&slug)
    .bind(&org_type)
    .execute(pool.get_ref())
    .await;

    if let Err(e) = insert {
        tracing::error!("Org creation failed: {}", e);
        return HttpResponse::InternalServerError()
            .json(serde_json::json!({"error": "Failed to create organization"}));
    }

    // 5. If branding provided, update branding JSONB
    if let Some(branding) = &data.branding {
        let branding_json = serde_json::to_value(branding).unwrap_or_default();
        let _ = sqlx::query("UPDATE brickos.organizations SET branding = $2 WHERE id = $1")
            .bind(org_id)
            .bind(branding_json)
            .execute(pool.get_ref())
            .await;
    }

    // 6. If first_link provided, create it
    let mut links_created: usize = 0;
    if let Some(link) = &data.first_link {
        let code = link.code.clone().unwrap_or_else(generate_short_code);
        let result = sqlx::query(
            r#"INSERT INTO short_links (id, code, target_url, link_type, domain, app_key, owner_org_id)
               VALUES (gen_random_uuid(), $1, $2, 'generic', 'link', 'sovereign-link', $3)"#,
        )
        .bind(&code)
        .bind(&link.target_url)
        .bind(org_id)
        .execute(pool.get_ref())
        .await;

        if result.is_ok() {
            links_created = 1;
        }
    }

    // 7. If admin_email provided, look up user and add as org_admin
    let mut members_invited: usize = 0;
    if let Some(email) = &data.admin_email {
        let user_id =
            sqlx::query_scalar::<_, Uuid>("SELECT id FROM brickos.users WHERE email = $1")
                .bind(email)
                .fetch_optional(pool.get_ref())
                .await;

        if let Ok(Some(uid)) = user_id {
            let result = sqlx::query(
                "INSERT INTO brickos.org_members (org_id, user_id, role) VALUES ($1, $2, 'org_admin')",
            )
            .bind(org_id)
            .bind(uid)
            .execute(pool.get_ref())
            .await;

            if result.is_ok() {
                members_invited = 1;
            }
        }
    }

    // 8. Return response
    HttpResponse::Created().json(CreateOrgResponse {
        org_id,
        slug,
        links_created,
        members_invited,
    })
}

// ---------------------------------------------------------------------------
// #362 - Org affiliate setup flow
// ---------------------------------------------------------------------------

#[cfg(feature = "platform")]
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct OrgAffiliate {
    pub user_id: Uuid,
    pub email: Option<String>,
    pub display_name: Option<String>,
    pub affiliate_code: Option<String>,
    pub link_count: i64,
    pub total_clicks: i64,
}

/// GET /org/{slug}/affiliates - List affiliates with performance.
#[cfg(feature = "platform")]
pub async fn org_affiliate_list(slug: web::Path<String>, pool: web::Data<PgPool>) -> HttpResponse {
    let slug = slug.into_inner();
    let (org_id, _) = match resolve_org(&slug, pool.get_ref()).await {
        Some(v) => v,
        None => {
            return HttpResponse::NotFound()
                .json(serde_json::json!({"error": "Organization not found"}));
        }
    };

    let affiliates = sqlx::query_as::<_, OrgAffiliate>(
        r#"SELECT
             om.user_id,
             u.email,
             u.display_name,
             sl_aff.affiliate_code,
             COUNT(DISTINCT sl.id) AS link_count,
             COUNT(DISTINCT slc.id) AS total_clicks
           FROM brickos.org_members om
           JOIN brickos.users u ON u.id = om.user_id
           LEFT JOIN short_links sl_aff ON sl_aff.owner_user_id = om.user_id
             AND sl_aff.owner_org_id = $1
             AND sl_aff.affiliate_code IS NOT NULL
           LEFT JOIN short_links sl ON sl.owner_user_id = om.user_id
             AND sl.owner_org_id = $1
           LEFT JOIN short_link_clicks slc ON slc.short_link_id = sl.id
           WHERE om.org_id = $1
             AND om.role IN ('org_affiliate', 'org_member')
           GROUP BY om.user_id, u.email, u.display_name, sl_aff.affiliate_code
           ORDER BY total_clicks DESC"#,
    )
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await;

    match affiliates {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(e) => {
            tracing::error!("Org affiliate list query failed for {}: {}", slug, e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Internal error"}))
        }
    }
}

#[cfg(feature = "platform")]
#[derive(Debug, Serialize)]
pub struct AffiliateCodeResponse {
    pub affiliate_code: String,
    pub short_url: String,
}

/// POST /org/{slug}/affiliates/{user_id}/code - Generate affiliate code for member.
#[cfg(feature = "platform")]
pub async fn org_generate_affiliate_code(
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

    // Verify user is a member of this org
    let is_member = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM brickos.org_members WHERE org_id = $1 AND user_id = $2",
    )
    .bind(org_id)
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await;

    match is_member {
        Ok(0) => {
            return HttpResponse::NotFound()
                .json(serde_json::json!({"error": "Member not found in this organization"}));
        }
        Err(e) => {
            tracing::error!("Member check failed for {}/{}: {}", slug, user_id, e);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}));
        }
        _ => {}
    }

    // Generate affiliate code: "sh" + 6-char hash
    let affiliate_code = format!("sh{}", &generate_short_code());
    let code = affiliate_code.clone();

    // Create auto-prefixed short link for this affiliate
    let result = sqlx::query(
        r#"INSERT INTO short_links (id, code, target_url, link_type, domain, app_key,
                                    owner_user_id, owner_org_id, affiliate_code)
           VALUES (gen_random_uuid(), $1, $2, 'affiliate', 'link', 'sovereign-link', $3, $4, $5)"#,
    )
    .bind(&code)
    .bind(format!("/r/{}", slug))
    .bind(user_id)
    .bind(org_id)
    .bind(&affiliate_code)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => HttpResponse::Created().json(AffiliateCodeResponse {
            affiliate_code,
            short_url: format!("/r/{}", code),
        }),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("duplicate") || msg.contains("unique") {
                HttpResponse::Conflict()
                    .json(serde_json::json!({"error": "Affiliate code already exists, try again"}))
            } else {
                tracing::error!(
                    "Affiliate code generation failed for {}/{}: {}",
                    slug,
                    user_id,
                    e
                );
                HttpResponse::InternalServerError()
                    .json(serde_json::json!({"error": "Internal error"}))
            }
        }
    }
}

#[cfg(feature = "platform")]
#[derive(Debug, Serialize)]
pub struct AffiliateStats {
    pub user_id: Uuid,
    pub total_clicks: i64,
    pub clicks_7d: i64,
    pub clicks_30d: i64,
    pub daily_clicks: Vec<DailyClicks>,
    pub top_referrers: Vec<TopReferrer>,
}

#[cfg(feature = "platform")]
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct DailyClicks {
    pub day: String,
    pub clicks: i64,
}

#[cfg(feature = "platform")]
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct TopReferrer {
    pub referrer: String,
    pub clicks: i64,
}

/// GET /org/{slug}/affiliates/{user_id}/stats - Affiliate performance detail.
#[cfg(feature = "platform")]
pub async fn org_affiliate_stats(
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

    // Aggregate click stats for this affiliate's links in this org
    #[derive(sqlx::FromRow)]
    struct ClickStats {
        total_clicks: i64,
        clicks_7d: i64,
        clicks_30d: i64,
    }

    let stats = sqlx::query_as::<_, ClickStats>(
        r#"SELECT
             COUNT(slc.id) AS total_clicks,
             COUNT(slc.id) FILTER (WHERE slc.clicked_at > now() - interval '7 days') AS clicks_7d,
             COUNT(slc.id) FILTER (WHERE slc.clicked_at > now() - interval '30 days') AS clicks_30d
           FROM short_links sl
           LEFT JOIN short_link_clicks slc ON slc.short_link_id = sl.id
           WHERE sl.owner_user_id = $1 AND sl.owner_org_id = $2"#,
    )
    .bind(user_id)
    .bind(org_id)
    .fetch_one(pool.get_ref())
    .await;

    let stats = match stats {
        Ok(s) => s,
        Err(e) => {
            tracing::error!(
                "Affiliate stats query failed for {}/{}: {}",
                slug,
                user_id,
                e
            );
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Internal error"}));
        }
    };

    // Daily click breakdown (last 30 days)
    let daily_clicks = sqlx::query_as::<_, DailyClicks>(
        r#"SELECT
             to_char(slc.clicked_at::date, 'YYYY-MM-DD') AS day,
             COUNT(*) AS clicks
           FROM short_link_clicks slc
           JOIN short_links sl ON sl.id = slc.short_link_id
           WHERE sl.owner_user_id = $1 AND sl.owner_org_id = $2
             AND slc.clicked_at > now() - interval '30 days'
           GROUP BY slc.clicked_at::date
           ORDER BY day"#,
    )
    .bind(user_id)
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    // Top referrers
    let top_referrers = sqlx::query_as::<_, TopReferrer>(
        r#"SELECT
             COALESCE(slc.referrer, 'direct') AS referrer,
             COUNT(*) AS clicks
           FROM short_link_clicks slc
           JOIN short_links sl ON sl.id = slc.short_link_id
           WHERE sl.owner_user_id = $1 AND sl.owner_org_id = $2
           GROUP BY slc.referrer
           ORDER BY clicks DESC
           LIMIT 10"#,
    )
    .bind(user_id)
    .bind(org_id)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    HttpResponse::Ok().json(AffiliateStats {
        user_id,
        total_clicks: stats.total_clicks,
        clicks_7d: stats.clicks_7d,
        clicks_30d: stats.clicks_30d,
        daily_clicks,
        top_referrers,
    })
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
