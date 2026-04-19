// Sovereign Health Intelligence -- AGPL-3.0 -- https://sovereignhealth.io/
//
// Sprint 044 #547: Public branding endpoint.
// Returns org branding based on the request domain. No auth required --
// used by the login page to show org logo/colors before authentication.

use actix_web::{web, HttpRequest, HttpResponse};
use serde_json::json;

use crate::middleware::org_resolver::OrgCache;

/// GET /api/v1/org/branding
/// Public (unauthenticated). Returns org branding for the current domain.
/// If no org context (platform domain), returns default BrickOS branding.
pub async fn get_branding(
    req: HttpRequest,
    pool: web::Data<sqlx::PgPool>,
    cache: web::Data<OrgCache>,
) -> HttpResponse {
    let org = crate::middleware::org_resolver::resolve_org_for_request(
        &req,
        pool.get_ref(),
        cache.get_ref(),
    )
    .await;

    match org {
        Some(ctx) => HttpResponse::Ok()
            .insert_header(("Cache-Control", "public, max-age=300"))
            .json(json!({
                "data": {
                    "org_id": ctx.org_id,
                    "org_slug": ctx.org_slug,
                    "org_name": ctx.org_name,
                    "branding": ctx.branding,
                    "is_org": true,
                },
                "error": null
            })),
        None => HttpResponse::Ok()
            .insert_header(("Cache-Control", "public, max-age=300"))
            .json(json!({
                "data": {
                    "org_id": null,
                    "org_slug": null,
                    "org_name": "BrickOS",
                    "branding": {
                        "primary_color": "#f97316",
                        "accent_color": "#0ea5e9",
                        "logo_url": null,
                    },
                    "is_org": false,
                },
                "error": null
            })),
    }
}
