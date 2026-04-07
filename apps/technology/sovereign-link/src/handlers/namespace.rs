//! Org namespace resolution for platform mode (#333).
//!
//! Resolves per-org namespaces in the redirect path:
//!   GET /r/{code}            -> BrickOS root namespace (org_slug = "brickos")
//!   GET /r/{org_slug}/{code} -> Organization namespace

#[cfg(feature = "platform")]
use actix_web::{web, HttpRequest, HttpResponse};
#[cfg(feature = "platform")]
use sqlx::PgPool;
#[cfg(feature = "platform")]
use std::sync::Arc;
#[cfg(feature = "platform")]
use uuid::Uuid;

#[cfg(feature = "platform")]
use crate::db::LinkStore;
#[cfg(feature = "platform")]
use crate::models::*;

// ---------------------------------------------------------------------------
// Org lookup model
// ---------------------------------------------------------------------------

#[cfg(feature = "platform")]
#[derive(Debug, Clone, sqlx::FromRow)]
struct OrgLookup {
    id: Uuid,
}

// ---------------------------------------------------------------------------
// Namespace resolution
// ---------------------------------------------------------------------------

/// Resolve an org slug to its UUID. Returns None if the org does not exist.
#[cfg(feature = "platform")]
async fn resolve_org_id(pool: &PgPool, org_slug: &str) -> Result<Option<Uuid>, sqlx::Error> {
    let row = sqlx::query_as::<_, OrgLookup>(
        "SELECT id FROM brickos.organizations WHERE slug = $1 AND is_active = true",
    )
    .bind(org_slug)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|r| r.id))
}

/// Look up a short link scoped to an organization.
#[cfg(feature = "platform")]
async fn get_link_by_org(
    pool: &PgPool,
    org_id: Uuid,
    code: &str,
) -> Result<Option<crate::models::ShortLink>, sqlx::Error> {
    let link = sqlx::query_as::<_, ShortLink>(
        r#"SELECT id, code, target_url, link_type, domain, app_key,
                  owner_user_id, owner_org_id, affiliate_code, title,
                  is_active, expires_at, created_at, updated_at
           FROM short_links
           WHERE owner_org_id = $1 AND code = $2
             AND is_active = true
             AND (expires_at IS NULL OR expires_at > now())"#,
    )
    .bind(org_id)
    .bind(code)
    .fetch_optional(pool)
    .await?;

    Ok(link)
}

// ---------------------------------------------------------------------------
// Handler: GET /r/{org_slug}/{code}
// ---------------------------------------------------------------------------

/// Enhanced redirect handler for platform mode that understands org namespaces.
///
/// Route: GET /r/{org_slug}/{code}
///
/// Resolves the org_slug to an org_id, then looks up the code scoped to that org.
/// Falls back to a global (unscoped) lookup for backward compatibility.
#[cfg(feature = "platform")]
pub async fn redirect_with_namespace(
    path: web::Path<(String, String)>,
    req: HttpRequest,
    store: web::Data<Arc<dyn LinkStore>>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    // Check for custom domain resolution via X-Org-Domain header.
    // When a reverse proxy forwards a request from a white-label domain,
    // it sets this header so we can resolve the org without a slug in the path.
    if let Some(custom_domain) = req.headers().get("X-Org-Domain") {
        if let Ok(domain_str) = custom_domain.to_str() {
            if let Some(org_id) = super::branding::resolve_domain(domain_str, pool.get_ref()).await
            {
                let (_, raw_code) = path.into_inner();
                let (code, is_qr) = match raw_code.strip_suffix(".qr") {
                    Some(base) => (base.to_string(), true),
                    None => (raw_code, false),
                };
                if is_qr {
                    return super::qr::handle_qr_inner(&code, &store, &pool).await;
                }
                match get_link_by_org(pool.get_ref(), org_id, &code).await {
                    Ok(Some(link)) => {
                        let target = link.target_url.clone();
                        let link_id = link.id;
                        let store_clone = store.clone();
                        let meta = super::redirect::extract_click_meta(&req);
                        tokio::spawn(async move {
                            let _ = store_clone.record_click(link_id, meta).await;
                        });
                        return HttpResponse::MovedPermanently()
                            .insert_header(("Location", target))
                            .insert_header(("Cache-Control", "private, max-age=0"))
                            .finish();
                    }
                    Ok(None) => {
                        return HttpResponse::NotFound()
                            .content_type("text/html")
                            .body("<html><body><h1>Link not found</h1><p>This short link does not exist or has expired.</p></body></html>");
                    }
                    Err(e) => {
                        tracing::error!("Domain-resolved link lookup error: {}", e);
                        return HttpResponse::InternalServerError().finish();
                    }
                }
            }
        }
    }

    let (org_slug, raw_code) = path.into_inner();

    // Strip .qr suffix if present
    let (code, is_qr) = match raw_code.strip_suffix(".qr") {
        Some(base) => (base.to_string(), true),
        None => (raw_code, false),
    };

    if is_qr {
        // Delegate to QR handler via namespace-aware lookup
        return handle_namespace_qr(&org_slug, &code, &store, &pool).await;
    }

    // Resolve org slug to org_id
    let org_id = match resolve_org_id(pool.get_ref(), &org_slug).await {
        Ok(Some(id)) => id,
        Ok(None) => {
            // The "org_slug" might actually be a short code (legacy single-segment path).
            // Fall back to global lookup.
            return fallback_global_redirect(&org_slug, &req, &store).await;
        }
        Err(e) => {
            tracing::error!("Namespace resolution error for '{}': {}", org_slug, e);
            return HttpResponse::InternalServerError().finish();
        }
    };

    // Look up the link scoped to this org
    match get_link_by_org(pool.get_ref(), org_id, &code).await {
        Ok(Some(link)) => {
            let target = link.target_url.clone();
            let link_id = link.id;
            let store_clone = store.clone();
            let meta = super::redirect::extract_click_meta(&req);

            tokio::spawn(async move {
                let _ = store_clone.record_click(link_id, meta).await;
            });

            HttpResponse::MovedPermanently()
                .insert_header(("Location", target))
                .insert_header(("Cache-Control", "private, max-age=0"))
                .finish()
        }
        Ok(None) => {
            // Fall back to global code lookup (backward compat)
            fallback_global_redirect(&code, &req, &store).await
        }
        Err(e) => {
            tracing::error!("Namespace link lookup error: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

/// Fall back to the global (non-namespaced) redirect path.
#[cfg(feature = "platform")]
async fn fallback_global_redirect(
    code: &str,
    req: &HttpRequest,
    store: &web::Data<Arc<dyn LinkStore>>,
) -> HttpResponse {
    match store.get_by_code(code).await {
        Ok(Some(link)) => {
            let target = link.target_url.clone();
            let link_id = link.id;
            let store_clone = store.clone();
            let meta = super::redirect::extract_click_meta(req);

            tokio::spawn(async move {
                let _ = store_clone.record_click(link_id, meta).await;
            });

            HttpResponse::MovedPermanently()
                .insert_header(("Location", target))
                .insert_header(("Cache-Control", "private, max-age=0"))
                .finish()
        }
        Ok(None) => HttpResponse::NotFound()
            .content_type("text/html")
            .body("<html><body><h1>Link not found</h1><p>This short link does not exist or has expired.</p></body></html>"),
        Err(e) => {
            tracing::error!("Global fallback DB error for code '{}': {}", code, e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

/// Handle QR generation for a namespaced link.
#[cfg(feature = "platform")]
async fn handle_namespace_qr(
    org_slug: &str,
    code: &str,
    store: &web::Data<Arc<dyn LinkStore>>,
    pool: &web::Data<PgPool>,
) -> HttpResponse {
    // Try org-scoped lookup first
    if let Ok(Some(org_id)) = resolve_org_id(pool.get_ref(), org_slug).await {
        if let Ok(Some(_link)) = get_link_by_org(pool.get_ref(), org_id, code).await {
            return super::qr::handle_qr_inner(code, store, pool).await;
        }
    }
    // Fall back to global
    super::qr::handle_qr_inner(code, store, pool).await
}
