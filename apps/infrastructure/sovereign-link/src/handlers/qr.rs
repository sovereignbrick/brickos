use actix_web::{web, HttpResponse};
use qrcode::QrCode;
use qrcode::render::svg;
use sqlx::PgPool;
use std::sync::Arc;

use crate::db::LinkStore;
use crate::models::*;

/// GET /r/{code}.qr — Generate a QR code SVG for a short link.
pub async fn handle_qr(
    code: web::Path<String>,
    store: web::Data<Arc<dyn LinkStore>>,
    _pool: web::Data<PgPool>,
) -> HttpResponse {
    let code = code.into_inner();
    // Strip .qr suffix if present (actix may or may not strip it depending on route config)
    let code = code.strip_suffix(".qr").unwrap_or(&code);

    // Determine the full short URL to encode
    let short_url = format!("https://brickos.io/r/{}", code);

    // Verify the code exists (either as prefix-based or DB-based)
    let exists = if code.len() == AUTO_CODE_LEN {
        let prefix = &code[..PREFIX_LEN];
        store.get_prefix(prefix).await.ok().flatten().is_some()
    } else {
        store.get_by_code(code).await.ok().flatten().is_some()
    };

    if !exists {
        return HttpResponse::NotFound()
            .content_type("text/plain")
            .body("Link not found");
    }

    match QrCode::new(short_url.as_bytes()) {
        Ok(qr) => {
            let svg_str = qr
                .render::<svg::Color>()
                .min_dimensions(200, 200)
                .dark_color(svg::Color("#fafafa"))
                .light_color(svg::Color("#09090b"))
                .build();

            HttpResponse::Ok()
                .content_type("image/svg+xml")
                .insert_header(("Cache-Control", "public, max-age=86400"))
                .body(svg_str)
        }
        Err(_) => HttpResponse::InternalServerError()
            .content_type("text/plain")
            .body("Failed to generate QR code"),
    }
}
